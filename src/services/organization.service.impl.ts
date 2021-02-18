import { OrganizationDocument, OrganizationModel, OrganizationRoleDocument, OrganizationRoleModel, ResourceListOptions } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable, inject } from 'tsyringe';
import { AbstractService } from './service.common';
import * as utils from '../utils';
import { Database } from '../utils/database.utils';
import { ClientSession } from 'mongoose';

@injectable()
export class OrganizationServiceImpl extends AbstractService implements OrganizationService {

    constructor(
        @inject("OrganizationModel") private orgModel?: OrganizationModel,
        @inject("OrganizationRoleModel") private orgRoleModel?: OrganizationRoleModel) {
        super("OrganizationService");
    }


    public async list(options?: ResourceListOptions): Promise<OrganizationDocument[]> {
        utils.assertIsDefined(this.orgModel);
        return this.orgModel.all(options);
    }

    public async createOrganization(org: OrganizationDocument, session?: ClientSession): Promise<OrganizationDocument> {
        utils.assertIsDefined(this.orgModel);

        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await this.orgModel.create([org], { session: session });

            this.logger.info("Created Organization %s: %s", org._id, org.name);

            return await this.orgModel.findOne({ domainName: org.domainName }).session(session);
        }
        catch (error) {
            throw Database.createException("Organization", error);
        }
    }

    public async createOrganizationRole(orgRole: OrganizationRoleDocument, session?: ClientSession): Promise<OrganizationRoleDocument> {
        utils.assertIsDefined(this.orgRoleModel);

        try {
            await this.orgRoleModel.create([orgRole], { session: session });

            this.logger.info("Created OrganizationRole: %s", orgRole);

            return await this.orgRoleModel.findOne({
                user: orgRole.user._id,
                org: orgRole.org._id,
                role: orgRole.role
            }).populate('user').populate('org').session(session);
        }
        catch (error) {
            throw Database.createException("OrganizationRole", error);
        }
    }


}