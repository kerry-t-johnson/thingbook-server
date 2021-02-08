import { OrganizationDocument } from '../models/organization.model';
import { ResourceListOptions } from '../models/options';

export { ResourceListOptions };

export interface OrganizationService {

    list: (options: ResourceListOptions) => Promise<OrganizationDocument[]>;
    create: (org: OrganizationDocument) => Promise<OrganizationDocument>;

}