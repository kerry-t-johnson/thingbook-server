import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRoleDocument } from "../models/organization.model";
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

    createTemplate: (
        org: OrganizationDocument,
        template: OrganizationDataSharingTemplateDocument) => Promise<OrganizationDataSharingTemplateDocument>;

    createAgreement: (
        org: OrganizationDocument,
        agreement: OrganizationDataSharingAgreementDocument) => Promise<OrganizationDataSharingAgreementDocument>;

    addConsumerToAgreement: (
        agreement: OrganizationDataSharingAgreementDocument,
        consumer: OrganizationDocument) => Promise<OrganizationDataSharingAgreementDocument>;
}