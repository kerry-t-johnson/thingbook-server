import { OrganizationDocument, OrganizationModel, ResourceListOptions } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable, inject } from 'tsyringe';
import { AbstractService } from './service.common';
import * as utils from '../utils';
import { Database } from '../utils/database.utils';

@injectable()
export class OrganizationServiceImpl extends AbstractService implements OrganizationService {

    constructor(@inject("OrganizationModel") private orgModel?: OrganizationModel) {
        super("OrganizationService");
    }


    public async list(options?: ResourceListOptions): Promise<OrganizationDocument[]> {
        utils.assertIsDefined(this.orgModel);
        return this.orgModel.all(options);
    }

    public async create(props: OrganizationDocument): Promise<OrganizationDocument> {
        utils.assertIsDefined(this.orgModel);

        try {
            const org = await this.orgModel.create(props);

            this.logger.info("Created Organization %s: %s", org._id, org.name);

            return org;
        }
        catch (error) {
            throw Database.createException("Organization", error);
        }
    }

}