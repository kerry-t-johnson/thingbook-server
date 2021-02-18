import { OrganizationDocument, OrganizationRoleDocument } from '../models/organization.model';
import { ResourceListOptions } from '../models/options';
import { ClientSession } from 'mongoose';

export { ResourceListOptions };

export interface OrganizationService {

    list: (options?: ResourceListOptions) => Promise<OrganizationDocument[]>;
    createOrganization: (org: OrganizationDocument, session?: ClientSession) => Promise<OrganizationDocument>;
    createOrganizationRole: (orgRole: OrganizationRoleDocument, session?: ClientSession) => Promise<OrganizationRoleDocument>;

}