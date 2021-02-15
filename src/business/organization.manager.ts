import { ClientSession } from "mongoose";
import { OrganizationDocument } from "../models/organization.model";
import { OrganizationVerificationDocument } from "../models/organization/organization_verification.model";
import { UserDocument } from "../models/user.model";

export interface OrganizationManager {

    createOrganization: (
        user: UserDocument,
        org: OrganizationDocuments) => Promise<OrganizationDocument>;

    // createSuborganization: (
    //     user: UserDocument,
    //     org: OrganizationDocument,
    //     parent: OrganizationDocument) => Promise<OrganizationDocument>;

}