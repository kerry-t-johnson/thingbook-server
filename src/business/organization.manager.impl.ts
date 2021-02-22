import Agenda, { Job } from "agenda";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "tsyringe";
import { Organization, OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRole, OrganizationRoleDocument, OrganizationSensorThingsStatusDocument } from "../models/organization.model";
import { UserDocument } from "../models/user.model";
import { OrganizationService } from "../services/organization.service";
import { UserService } from "../services/user.service";
import { assertIsDefined, assertNotDefined, generateToken } from "../utils";
import { startSession } from "../utils/database.utils";
import { ThingBookHttpError } from "../utils/error.utils";
import { AbstractManager } from "./manager.common";
import { OrganizationManager } from "./organization.manager";
import { Configuration } from "../config";
import { SensorThings } from "../services/sensor-things.service";

@injectable()
export class OrganizationManagerImpl extends AbstractManager implements OrganizationManager {

    constructor(
        @inject("Configuration") private config?: Configuration,
        @inject("OrganizationService") private orgSvc?: OrganizationService,
        @inject("UserService") private userSvc?: UserService,
        @inject("agenda") private agenda?: Agenda) {
        super('OrganizationManager');
        assertIsDefined(this.agenda);

        this.agenda.define('sensor-things-api-status', this.checkSensorThingsApiStatus.bind(this));
    }

    public async createOrganization(user: UserDocument, org: OrganizationDocument): Promise<OrganizationDocument> {
        assertIsDefined(this.orgSvc);
        assertIsDefined(this.userSvc);
        assertIsDefined(this.agenda);
        assertIsDefined(this.config);

        this.logger.silly(`createOrganization("${user}", "${org.name}")`);

        // This method is only for top-level Organizations, which MUST have:
        //  - Domain Name
        //  - SensorThingsURL
        //  - Domain Verification Method
        //
        // And must NOT have:
        //  - parent
        assertIsDefined(org.domainName);
        assertIsDefined(org.sensorThingsURL);
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

            await session.commitTransaction();

            const job: Job = await this.agenda.create(
                "sensor-things-api-status", {
                org: createdOrg._id
            })
                .repeatEvery(this.config.sensorThingsApiStatusRepeatEvery)
                .save();

            this.logger.debug(`Created ${job.attrs.name} to repeat every ${job.attrs.name} starting at ${job.attrs.nextRunAt}`);

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

        if (agreement.producer && org._id.toString() != agreement.producer) {
            throw new ThingBookHttpError(StatusCodes.UNPROCESSABLE_ENTITY, `Mismatch between POSTed Organization and agreement Organization`);
        }

        // It's OK if the client didn't specify the owning Organization, we
        // deduce from the resource path:
        agreement.producer = org;

        return await this.orgSvc.createOrganizationDataSharingAgreement(agreement);
    }

    private async checkSensorThingsApiStatus(job: Job) {
        const org: OrganizationDocument = await Organization.findById(job.attrs.data.org);
        const status: any = { org: org._id, reachable: false, lastStatus: 'Unknown' };

        try {
            const sensorThingsApi = new SensorThings(org.sensorThingsURL);
            await sensorThingsApi.refresh();

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

}