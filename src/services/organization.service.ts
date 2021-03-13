import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRoleDocument, OrganizationSensorThingsStatusDocument } from '../models/organization.model';
import { ListQueryOptions } from '../models/options';
import { ClientSession } from 'mongoose';

export { ListQueryOptions as ListQueryOptions };

export interface OrganizationService {

    // Organization
    findOrganization: (idOrName: string | number) => Promise<OrganizationDocument>;
    listOrganizations: (options?: ListQueryOptions) => Promise<OrganizationDocument[]>;
    createOrganization: (org: OrganizationDocument, session?: ClientSession) => Promise<OrganizationDocument>;

    // Organization Role
    createOrganizationRole: (orgRole: OrganizationRoleDocument, session?: ClientSession) => Promise<OrganizationRoleDocument>;

    // Organization Data Sharing Template
    listOrganizationDataSharingTemplates: (
        org: OrganizationDocument,
        options?: ListQueryOptions) => Promise<OrganizationDataSharingTemplateDocument[]>;

    createOrganizationDataSharingTemplate: (
        template: OrganizationDataSharingTemplateDocument,
        session?: ClientSession) => Promise<OrganizationDataSharingTemplateDocument>;

    // Organization Data Sharing Agreement
    listOrganizationDataSharingAgreements: (
        org: OrganizationDocument,
        options?: ListQueryOptions) => Promise<OrganizationDataSharingAgreementDocument[]>;

    createOrganizationDataSharingAgreement: (
        agreement: OrganizationDataSharingAgreementDocument,
        session?: ClientSession) => Promise<OrganizationDataSharingAgreementDocument>;

    updateSensorThingsStatus: (
        status: OrganizationSensorThingsStatusDocument,
        session?: ClientSession) => Promise<OrganizationSensorThingsStatusDocument>;
}