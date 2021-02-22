import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRoleDocument, OrganizationSensorThingsStatusDocument } from '../models/organization.model';
import { ResourceListOptions } from '../models/options';
import { ClientSession } from 'mongoose';

export { ResourceListOptions };

export interface OrganizationService {

    // Organization
    findOrganization: (idOrName: string | number) => Promise<OrganizationDocument>;
    listOrganizations: (options?: ResourceListOptions) => Promise<OrganizationDocument[]>;
    createOrganization: (org: OrganizationDocument, session?: ClientSession) => Promise<OrganizationDocument>;

    // Organization Role
    createOrganizationRole: (orgRole: OrganizationRoleDocument, session?: ClientSession) => Promise<OrganizationRoleDocument>;

    // Organization Data Sharing Template
    listOrganizationDataSharingTemplates: (
        org: OrganizationDocument,
        options?: ResourceListOptions) => Promise<OrganizationDataSharingTemplateDocument[]>;

    createOrganizationDataSharingTemplate: (
        template: OrganizationDataSharingTemplateDocument,
        session?: ClientSession) => Promise<OrganizationDataSharingTemplateDocument>;

    // Organization Data Sharing Agreement
    listOrganizationDataSharingAgreements: (
        org: OrganizationDocument,
        options?: ResourceListOptions) => Promise<OrganizationDataSharingAgreementDocument[]>;

    createOrganizationDataSharingAgreement: (
        agreement: OrganizationDataSharingAgreementDocument,
        session?: ClientSession) => Promise<OrganizationDataSharingAgreementDocument>;

    updateSensorThingsStatus: (
        status: OrganizationSensorThingsStatusDocument,
        session?: ClientSession) => Promise<OrganizationSensorThingsStatusDocument>;
}