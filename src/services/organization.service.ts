import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRoleDocument, OrganizationSensorThingsStatusDocument } from '../models/organization.model';
import { PaginatedResults, PaginationOptions } from 'thingbook-api';
import { ClientSession } from 'mongoose';

export interface OrganizationService {

    // Organization
    findOrganization: (idOrName: string | number) => Promise<OrganizationDocument>;
    listOrganizations: (options?: PaginationOptions) => Promise<PaginatedResults<OrganizationDocument>>;
    createOrganization: (org: OrganizationDocument, session?: ClientSession) => Promise<OrganizationDocument>;

    // Organization Role
    createOrganizationRole: (orgRole: OrganizationRoleDocument, session?: ClientSession | null) => Promise<OrganizationRoleDocument>;

    // Organization Data Sharing Template
    listOrganizationDataSharingTemplates: (
        org: OrganizationDocument,
        options?: PaginationOptions) => Promise<OrganizationDataSharingTemplateDocument[]>;

    createOrganizationDataSharingTemplate: (
        template: OrganizationDataSharingTemplateDocument,
        session?: ClientSession | null) => Promise<OrganizationDataSharingTemplateDocument>;

    // Organization Data Sharing Agreement
    findAgreement: (idOrName: string | number) => Promise<OrganizationDataSharingAgreementDocument>;
    listAllOrganizationDataSharingAgreements: (options?: PaginationOptions) => Promise<PaginatedResults<OrganizationDataSharingAgreementDocument>>;
    listOrganizationDataSharingAgreements: (
        org: OrganizationDocument,
        role?: string,
        options?: PaginationOptions) => Promise<PaginatedResults<OrganizationDataSharingAgreementDocument>>;

    createOrganizationDataSharingAgreement: (
        agreement: OrganizationDataSharingAgreementDocument,
        session?: ClientSession | null) => Promise<OrganizationDataSharingAgreementDocument>;

    updateOrganizationDataSharingAgreement: (
        agreement: OrganizationDataSharingAgreementDocument,
        session?: ClientSession | null) => Promise<OrganizationDataSharingAgreementDocument>;

    updateSensorThingsStatus: (
        status: OrganizationSensorThingsStatusDocument,
        session?: ClientSession) => Promise<OrganizationSensorThingsStatusDocument>;
}