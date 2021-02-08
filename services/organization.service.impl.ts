import { Organization, OrganizationDocument, ResourceListOptions } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable } from 'tsyringe';
import { Logger, getLogger } from '../logger';

@injectable()
export class OrganizationServiceImpl implements OrganizationService {

    private logger: Logger = getLogger('OrganizationService');

    public async list(options: ResourceListOptions): Promise<OrganizationDocument[]> {
        return Organization.all(options);
    }

    public async create(props: OrganizationDocument): Promise<OrganizationDocument> {
        const org = await Organization.create(props);

        this.logger.info("Created Organization %s: %s", org._id, org.name);

        return org;
    }

}