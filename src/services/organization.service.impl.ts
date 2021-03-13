import { Organization, OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplate, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRole, OrganizationRoleDocument, OrganizationSensorThingsStatus, OrganizationSensorThingsStatusDocument, ListQueryOptions } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable } from 'tsyringe';
import { AbstractService } from './service.common';
import { assertIsValidObjectId, Database } from '../utils/database.utils';
import { ClientSession } from 'mongoose';
import { ThingBookHttpError } from '../utils/error.utils';
import { StatusCodes } from 'http-status-codes';

@injectable()
export class OrganizationServiceImpl extends AbstractService implements OrganizationService {

    constructor() {
        super("OrganizationService");
    }

    public async findOrganization(idOrName: string | number): Promise<OrganizationDocument> {
        const foundByName = await Organization.findOne({ name: idOrName.toString() }).exec();

        if (foundByName) {
            return foundByName;
        }

        assertIsValidObjectId(idOrName);
        const foundById = await Organization.findById(idOrName).exec();

        if (foundById) {
            return foundById;
        }

        throw new ThingBookHttpError(StatusCodes.NOT_FOUND, `Unable to find Organization: ${idOrName}`);
    }

    public async listOrganizations(options?: ListQueryOptions): Promise<OrganizationDocument[]> {
        return Organization.list(options);
    }

    public async createOrganization(org: OrganizationDocument, session?: ClientSession | null): Promise<OrganizationDocument> {
        session = session || null;
        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await Organization.create([org], { session: session });

            this.logger.info("Created Organization %s", org.name);

            return await Organization.findOne({ domainName: org.domainName }).session(session).orFail();
        }
        catch (error) {
            throw Database.createException("Organization", error);
        }
    }

    public async createOrganizationRole(orgRole: OrganizationRoleDocument, session?: ClientSession): Promise<OrganizationRoleDocument> {

        try {
            await OrganizationRole.create([orgRole], { session: session });

            this.logger.info("Created OrganizationRole: %s", orgRole);

            return await OrganizationRole.findOne({
                user: orgRole.user?._id,
                org: orgRole.org._id,
                role: orgRole.role
            }).populate('user').populate('org').session(session).orFail();
        }
        catch (error) {
            throw Database.createException("OrganizationRole", error);
        }
    }

    public async listOrganizationDataSharingTemplates(
        org: OrganizationDocument,
        options?: ListQueryOptions): Promise<OrganizationDataSharingTemplateDocument[]> {

        options = options || new ListQueryOptions();
        return await OrganizationDataSharingTemplate.find({ org: org._id })
            .sort(options.asSortCriteria())
            .skip(options.offset)
            .limit(options.limit)
            .populate('org', '-verification')
            .populate('template')
            .exec();
    }


    public async createOrganizationDataSharingTemplate(
        template: OrganizationDataSharingTemplateDocument,
        session?: ClientSession): Promise<OrganizationDataSharingTemplateDocument> {

        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await OrganizationDataSharingTemplate.create([template], { session: session });

            this.logger.info("Created Organization DataSharingTemplate: %s", template.name || template.template.name);

            return await OrganizationDataSharingTemplate.findOne({ org: template.org, template: template.template })
                .populate('org', '-verification')
                .populate('template')
                .session(session);
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingTemplate", error);
        }
    }

    public async listOrganizationDataSharingAgreements(
        org: OrganizationDocument,
        options?: ListQueryOptions): Promise<OrganizationDataSharingAgreementDocument[]> {

        options = options || new ListQueryOptions();
        return await OrganizationDataSharingAgreement.find({ $or: [{ producer: org._id }, { consumer: org._id }] })
            .sort(options.asSortCriteria())
            .skip(options.offset)
            .limit(options.limit)
            .populate('producer', '-verification')
            .populate('consumer', '-verification')
            .populate({
                // Organization's template member of the Agreement:
                path: 'template',
                populate: {
                    // Base template:
                    path: 'template',
                    populate: {
                        path: 'fragments'
                    }
                }
            })
            .exec();
    }

    public async createOrganizationDataSharingAgreement(
        agreement: OrganizationDataSharingAgreementDocument,
        session?: ClientSession): Promise<OrganizationDataSharingAgreementDocument> {

        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            const result: OrganizationDataSharingAgreementDocument[] = await OrganizationDataSharingAgreement.create([agreement], { session: session });
            this.logger.info("Created Organization DataSharingAgreement: %s", agreement.name);

            return OrganizationDataSharingAgreement.findById(result[0]?._id)
                .populate('producer', '-verification')
                .populate('consumer', '-verification')
                .populate({
                    // Organization's template member of the Agreement:
                    path: 'template',
                    populate: {
                        // Base template:
                        path: 'template',
                        populate: {
                            path: 'fragments'
                        }
                    }
                })
                .session(session)
                .exec();
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingAgreement", error);
        }
    }

    public async updateSensorThingsStatus(
        status: OrganizationSensorThingsStatusDocument,
        session?: ClientSession): Promise<OrganizationSensorThingsStatusDocument> {

        return await OrganizationSensorThingsStatus.findOneAndUpdate({
            org: status.org._id
        }, status, {
            new: true,
            session: session,
            upsert: true
        });

    }


}