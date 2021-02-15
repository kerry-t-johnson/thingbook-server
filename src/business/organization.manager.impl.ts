import { StatusCodes } from "http-status-codes";
import { ClientSession } from "mongoose";
import { inject, injectable } from "tsyringe";
import { DomainVerificationMethod, Organization, OrganizationDocument } from "../models/organization.model";
import { OrganizationVerification, OrganizationVerificationMethod } from "../models/organization/organization_verification.model";
import { User, UserDocument } from "../models/user.model";
import { OrganizationService } from "../services/organization.service";
import { UserService } from "../services/user.service";
import { assertIsDefined, assertNotDefined, generateToken } from "../utils";
import { ThingBookError } from "../utils/error.utils";
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

        this.logger.silly(`createOrganization(${user.email}, ${org.name})`);

        // This method is only for top-level Organizations, which MUST have a
        // Domain Verification Method
        assertNotDefined(org.parent);
        assertIsDefined(org.verification);
        assertIsDefined(org.verification.method);

        org.verification.user = user;
        org.verification.token = generateToken();
        org.verification.verified = false;

        return await Organization.create(org);
    }

}