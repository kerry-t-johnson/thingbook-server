import { OrganizationDocument, OrganizationRoleDocument } from "../models/organization.model";
import { UserDocument } from "../models/user.model";

export interface OrganizationManager {

    createOrganization: (
        user: UserDocument,
        org: OrganizationDocument) => Promise<OrganizationDocument>;

    // createSuborganization: (
    //     user: UserDocument,
    //     org: OrganizationDocument,
    //     parent: OrganizationDocument) => Promise<OrganizationDocument>;

    getOrganizations: (user: UserDocument) => Promise<OrganizationRoleDocument[]>;

}