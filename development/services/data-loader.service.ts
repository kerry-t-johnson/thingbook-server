import Agenda, { Job } from "agenda";
import { StatusCodes } from "http-status-codes";
import { Error } from "mongoose";
import * as api from "thingbook-api/lib";
import { inject, injectable } from "tsyringe";
import { ListQueryOptions } from "../../src/models/options";
import { AbstractService } from "../../src/services/service.common";
import { assertIsDefined } from "../../src/utils";
import { DataLoadRequest, DataLoadRequestDocument, EntityCreationStatusDocument } from "../models/data-load.model";
import { EntityCreationRequestFactory, SensorThingsEntityFactory } from "../sensor-things.dev";

@injectable()
export class DataLoaderService extends AbstractService {

    constructor(@inject("agenda") private agenda?: Agenda,) {
        super("DataLoader")

        assertIsDefined(this.agenda);
        this.agenda.define('sensor-things-data-load-job', this.onSensorThingsDataLoadTimeout.bind(this));
    }

    public async listSenorThingsDataLoads(options: ListQueryOptions): Promise<DataLoadRequestDocument[]> {
        return DataLoadRequest.list(options);
    }

    public async loadSensorThingsData(request: api.DataLoadRequest): Promise<api.DataLoadRequest> {
        assertIsDefined(this.agenda);

        const factory = new EntityCreationRequestFactory();

        let entityRequests: api.EntityCreationStatus[] = [];
        if (request.files) {
            const fileEntities = factory.fromYamlFile(...request.files);
            entityRequests.push(...fileEntities);
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
            retries: 5,
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

            const entity = new SensorThingsEntityFactory(request.url);
            for (let r of request.entities) {
                promises.push(entity.create(r))
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
                            request.created += r.value.status == StatusCodes.CREATED ? 1 : 0;
                            request.existing += r.value.status == StatusCodes.SEE_OTHER ? 1 : 0;
                        }
                        else {
                            this.logger.error(`Could not create SensorThing entity '${entity.resource}': ${r.reason}`);
                            request.failed += 1;
                        }
                    }

                    request.retries--;

                    this.logger.silly(`DataLoadRequest ${job.attrs.data?.dataLoadRequest}: Created ${request.created}, Existing: ${request.existing}`);

                    request.state = (request.created + request.existing == request.entities.length) ?
                        api.DataLoadRequestState.COMPLETE :
                        (request.retries > 0) ? api.DataLoadRequestState.IN_PROGRESS :
                            api.DataLoadRequestState.FAILED;

                    await request.save();

                    switch (request.state) {
                        case api.DataLoadRequestState.COMPLETE:
                            this.logger.debug(`DataLoadRequest ${job.attrs.data?.dataLoadRequest} completed`);
                            await job.remove();
                            break;
                        case api.DataLoadRequestState.IN_PROGRESS:
                            this.logger.debug(`DataLoadRequest ${job.attrs.data?.dataLoadRequest} will execute again in 30s`);
                            job.repeatAt('in 30 seconds');
                            await job.save();
                            break;
                        case api.DataLoadRequestState.FAILED:
                            this.logger.warn(`DataLoadRequest ${job.attrs.data?.dataLoadRequest} failed`);
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