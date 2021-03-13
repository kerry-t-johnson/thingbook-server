import Agenda, { Job } from "agenda";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "tsyringe";
import { Organization, OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplate, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRole, OrganizationRoleDocument, OrganizationSensorThingsStatusDocument } from "../models/organization.model";
import { UserDocument } from "../models/user.model";
import { OrganizationService } from "../services/organization.service";
import { UserService } from "../services/user.service";
import { assertIsDefined, assertNotDefined, generateToken } from "../utils";
import { startSession } from "../utils/database.utils";
import { ThingBookHttpError } from "../utils/error.utils";
import { AbstractManager } from "./manager.common";
import { OrganizationManager } from "./organization.manager";
import { Configuration } from "../config";
import * as api from 'thingbook-api';
import { EventService } from "../services/event-service";
import { SensorThingsHTTP } from "../services/sensor-things.service";
import { ObservationBroker } from "../services/observation-broker";

@injectable()
export class OrganizationManagerImpl extends AbstractManager implements OrganizationManager {

    private dsBrokers: ObservationBroker[] = [];

    constructor(
        @inject("Configuration") private config?: Configuration,
        @inject("OrganizationService") private orgSvc?: OrganizationService,
        @inject("UserService") private userSvc?: UserService,
        @inject("agenda") private agenda?: Agenda,
        @inject("EventService") private eventSvc?: EventService) {
        super('OrganizationManager');
        assertIsDefined(this.agenda);
        assertIsDefined(this.eventSvc);

        this.agenda.define('sensor-things-api-status', this.checkSensorThingsApiStatus.bind(this));
        this.eventSvc.listen('application.initialized', this.onApplicationInitialized.bind(this));
    }

    public async createOrganization(user: UserDocument, org: OrganizationDocument): Promise<OrganizationDocument> {
        assertIsDefined(this.orgSvc);
        assertIsDefined(this.userSvc);
        assertIsDefined(this.agenda);
        assertIsDefined(this.config);

        this.logger.silly(`createOrganization("${user}", "${org.name}")`);

        // This method is only for top-level Organizations, which MUST have:
        //  - Domain Name
        //  - sensorThingsAPI
        //  - Domain Verification Method
        //
        // And must NOT have:
        //  - parent
        assertIsDefined(org.domainName);
        assertIsDefined(org.sensorThingsAPI);
        assertIsDefined(org.sensorThingsMQTT);
        assertNotDefined(org.parent);
        assertIsDefined(org.verification);
        assertIsDefined(org.verification.method);

        org.verification.user = user._id;
        org.verification.token = generateToken();
        org.verification.verified = false;

        const session = await startSession();
        try {
            session.startTransaction();

            const createdOrg = await this.orgSvc.createOrganization(org, session);
            await this.orgSvc.createOrganizationRole(<OrganizationRoleDocument>{
                user: user._id,
                org: createdOrg._id,
                role: "OWNER"
            }, session);

            const job: Job = await this.agenda.create(
                "sensor-things-api-status", {
                org: createdOrg._id
            })
                .repeatEvery(this.config.sensorThingsApiStatusRepeatEvery)
                .save();

            this.logger.debug(`Created ${job.attrs.name} to repeat every ${job.attrs.name} starting at ${job.attrs.nextRunAt}`);

            await session.commitTransaction();

            return createdOrg;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }

    public async getOrganizations(user: UserDocument): Promise<OrganizationRoleDocument[]> {
        const rawResult = await OrganizationRole.find({ user: user._id })
            .populate('org')
            .exec();

        return await Promise.all(rawResult.map(function (r: OrganizationRoleDocument): OrganizationRoleDocument {
            r.org.verification = r.role == 'OWNER' ? r.org.verification : undefined;
            return r;
        }));
    }


    public async createTemplate(
        org: OrganizationDocument,
        template: OrganizationDataSharingTemplateDocument): Promise<OrganizationDataSharingTemplateDocument> {
        assertIsDefined(this.orgSvc);

        if (template.org && org._id.toString() != template.org) {
            throw new ThingBookHttpError(StatusCodes.UNPROCESSABLE_ENTITY, `Mismatch between POSTed Organization and template Organization`);
        }

        // It's OK if the client didn't specify the owning Organization, we
        // deduce from the resource path:
        template.org = org;

        return await this.orgSvc.createOrganizationDataSharingTemplate(template);
    }


    public async createAgreement(
        org: OrganizationDocument,
        agreement: OrganizationDataSharingAgreementDocument): Promise<OrganizationDataSharingAgreementDocument> {
        assertIsDefined(this.orgSvc);
        assertIsDefined(this.agenda);
        assertIsDefined(this.config);
        assertIsDefined(this.eventSvc);

        console.log(agreement);

        const session = await startSession();
        try {
            session.startTransaction();

            if (agreement.producer && org._id.toString() != agreement.producer) {
                throw new ThingBookHttpError(StatusCodes.UNPROCESSABLE_ENTITY, `Mismatch between POSTed Organization and agreement Organization`);
            }

            // It's OK if the client didn't specify the owning Organization, we
            // deduce from the resource path:
            agreement.producer = org;

            // Retrieve the associated 'parent' template:
            const template: api.OrganizationDataSharingTemplate = await OrganizationDataSharingTemplate.findById(agreement.template);

            // Seed the metrics
            agreement.datastreams = Array.from(template.datastreams, ds => <api.DataStreamMetrics>{ name: ds, id: 0, count: 0 });

            const createdAgreement: OrganizationDataSharingAgreementDocument =
                await this.orgSvc.createOrganizationDataSharingAgreement(agreement, session);

            await session.commitTransaction();

            this.dsBrokers.push(new ObservationBroker(createdAgreement));

            this.eventSvc.post('data-sharing-agreement.created', createdAgreement);

            return createdAgreement;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }

    private async checkSensorThingsApiStatus(job: Job) {
        const org: OrganizationDocument = await Organization.findById(job.attrs.data.org);
        const status: any = { org: org._id, reachable: false, lastStatus: 'Unknown' };

        try {
            const sensorThingsApi = SensorThingsHTTP.getInstance(org.sensorThingsAPI);
            await sensorThingsApi.get();

            status.reachable = true;
            status.lastStatus = 'Success';
        }
        catch (error) {
            status.lastStatus = error.message;
            this.logger.error(error);
        }
        finally {
            this.orgSvc?.updateSensorThingsStatus(<OrganizationSensorThingsStatusDocument>status).catch((error) => {
                this.logger.error(error);
            });
        }
    }

    private async onApplicationInitialized(event: any) {
        assertIsDefined(this.orgSvc);

        const agreements: OrganizationDataSharingAgreementDocument[] = await OrganizationDataSharingAgreement
            .find({ state: api.OrganizationDataSharingAgreementState.ACTIVE })
            .populate('producer')
            .populate('consumer')
            .exec();

        for (let a of agreements) {
            this.dsBrokers.push(new ObservationBroker(a));
        }

    }

}