import { inject, injectable } from "tsyringe";
import { OrganizationDocument, OrganizationRole, OrganizationRoleDocument } from "../models/organization.model";
import { UserDocument } from "../models/user.model";
import { OrganizationService } from "../services/organization.service";
import { UserService } from "../services/user.service";
import { assertIsDefined, assertNotDefined, generateToken } from "../utils";
import { startSession } from "../utils/database.utils";
import { AbstractManager } from "./manager.common";
import { OrganizationManager } from "./organization.manager";

@injectable()
export class OrganizationManagerImpl extends AbstractManager implements OrganizationManager {

    constructor(
        @inject("OrganizationService") private orgSvc?: OrganizationService,
        @inject("UserService") private userSvc?: UserService) {
        super('OrganizationManager');
    }

    public async createOrganization(user: UserDocument, org: OrganizationDocument): Promise<OrganizationDocument> {
        assertIsDefined(this.orgSvc);
        assertIsDefined(this.userSvc);

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
                user: user._id, org: createdOrg._id, role: "OWNER"
            }, session);

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
        const rawResult = await OrganizationRole.find({ user: user._id }).populate('org').exec();

        return await Promise.all(rawResult.map(function (r: OrganizationRoleDocument): OrganizationRoleDocument {
            r.org.verification = r.role == 'OWNER' ? r.org.verification : undefined;
            return r;
        }));
    }

}