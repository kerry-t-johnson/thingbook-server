import Agenda, { Job } from "agenda";
import { StatusCodes } from "http-status-codes";
import { Error } from "mongoose";
import * as api from "thingbook-api/lib";
import { inject, injectable } from "tsyringe";
import { PaginationOptions } from 'thingbook-api';
import { AbstractService } from "../../src/services/service.common";
import { assertIsDefined } from "../../src/utils";
import { DataLoadRequest, DataLoadRequestDocument, EntityCreationStatusDocument } from "../models/data-load.model";
import { EntityCreationRequestFactory, SensorThingsEntityFactory } from "../sensor-things.dev";
import { OrganizationService } from "../../src/services/organization.service";
import { ThingBookHttpError } from "../../src/utils/error.utils";

@injectable()
export class DataLoaderService extends AbstractService {

    constructor(
        @inject("agenda") private agenda?: Agenda,
        @inject("OrganizationService") private orgSvc?: OrganizationService) {
        super("DataLoader")

        assertIsDefined(this.agenda);
        this.agenda.define('sensor-things-data-load-job', this.onSensorThingsDataLoadTimeout.bind(this));
    }

    public async listSenorThingsDataLoads(options: PaginationOptions): Promise<DataLoadRequestDocument[]> {
        return DataLoadRequest.list(options);
    }

    public async loadSensorThingsData(request: api.DataLoadRequest): Promise<api.DataLoadRequest> {
        assertIsDefined(this.agenda);
        assertIsDefined(this.orgSvc);

        const factory = new EntityCreationRequestFactory();

        let entityRequests: api.EntityCreationStatus[] = [];

        if (request.name !== undefined) {
            try {
                const org: api.Organization = await this.orgSvc.findOrganization(request.name);
                const filePrefix: string = org.domainName.replace('.com', '');

                request.url = new URL(org.sensorThingsAPI);
                request.files = [
                    './assets/development/data/sensor-things/common-data.yml',
                    `./assets/development/data/sensor-things/${filePrefix}-data.yml`,
                    `./assets/development/data/sensor-things/${filePrefix}-dynamic-data.yml`
                ];
            }
            catch (error) {
                throw new ThingBookHttpError(StatusCodes.BAD_REQUEST, `Unable to locate organization by name: ${request.name}`);
            }
        }

        if (request.files) {
            try {
                const fileEntities = factory.fromYamlFile(...request.files);
                entityRequests.push(...fileEntities);
            }
            catch (error) {
                throw new ThingBookHttpError(StatusCodes.BAD_REQUEST, `Unable to read one or more files from the given list: ${JSON.stringify(request.files)}`);
            }
        }

        // TODO
        // if(request.entities) {
        //     entityRequests.push.apply(factory.fromYamlElement(...request.entities));
        // }

        const result = new DataLoadRequest({
            name: request.name,
            url: request.url,
            files: request.files,
            state: api.DataLoadRequestState.IN_PROGRESS,
            created: 0,
            existing: 0,
            failed: 0,
            retries: 5 * 60, // Allow up to 5 minutes
        });

        entityRequests.map((r) => {
            result.entities.push(<EntityCreationStatusDocument>{
                resource: r.resource,
                data: JSON.stringify(r.data),
                dynamic: r.dynamic ? JSON.stringify(r.dynamic) : undefined,
                createAt: r.createAt,
                status: r.status,
            });
        });

        await result.save();

        await this.agenda.now(
            'sensor-things-data-load-job',
            { dataLoadRequest: result._id });

        return result;
    }

    private async onSensorThingsDataLoadTimeout(job: Job) {
        this.logger.silly(`onSensorThingsDataLoadTimeout(${job.attrs.data?.dataLoadRequest})`);
        try {
            const request: DataLoadRequestDocument = await DataLoadRequest.findById(job.attrs.data?.dataLoadRequest).orFail();

            let promises: Promise<api.EntityCreationStatus>[] = [];

            const factory = new SensorThingsEntityFactory(request.url);
            for (let r of request.entities) {
                promises.push(factory.create(r))
            }

            request.created = 0;
            request.existing = 0;
            request.failed = 0;
            await Promise.allSettled(promises)
                .then(async (results) => {
                    for (const [i, r] of results.entries()) {
                        let entity: EntityCreationStatusDocument | undefined = request.entities[i];
                        assertIsDefined(entity);

                        if (r.status === 'fulfilled') {
                            entity.status = r.value.status;
                            request.created! += r.value.status == StatusCodes.CREATED ? 1 : 0;
                            request.existing! += r.value.status == StatusCodes.SEE_OTHER ? 1 : 0;
                        }
                        else {
                            this.logger.error(`Could not create SensorThing entity '${entity.resource}': ${r.reason}`);
                            request.failed! += 1;
                        }
                    }

                    request.retries--;

                    this.logger.silly(`DataLoadRequest ${request._id} - Out of ${request.entities.length} entities: Created ${request.created}, Existing: ${request.existing} (retries: ${request.retries} left)`);

                    request.state = (request.created! + request.existing! == request.entities.length) ?
                        api.DataLoadRequestState.COMPLETE :
                        (request.retries > 0) ? api.DataLoadRequestState.IN_PROGRESS :
                            api.DataLoadRequestState.FAILED;

                    await request.save();

                    switch (request.state) {
                        case api.DataLoadRequestState.COMPLETE:
                            this.logger.debug(`DataLoadRequest ${request._id} completed`);
                            await job.remove();
                            break;
                        case api.DataLoadRequestState.IN_PROGRESS:
                            setTimeout(() => {
                                this.agenda?.now(
                                    'sensor-things-data-load-job', {
                                    dataLoadRequest: request._id,
                                })
                            }, 1000);
                            break;
                        case api.DataLoadRequestState.FAILED:
                            this.logger.warn(`DataLoadRequest ${request._id} failed`);
                            await job.remove();
                            break;
                        default:
                            this.logger.error(`Unrecognized DataLoadRequestState: ${request.state}`);
                            break;
                    }
                })
        }
        catch (error) {
            if (error instanceof Error.DocumentNotFoundError) {
                // The DataLoadRequest has been removed (this is a legitimate
                // possibility)
                this.logger.warn(`DataLoadRequest ${job.attrs.data?.dataLoadRequest} does not exist.  Removing corresponding Agenda job`);
                await job.remove();
            }
        }
    }
}
