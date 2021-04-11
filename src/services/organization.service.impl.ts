import { Organization, OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplate, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRole, OrganizationRoleDocument, OrganizationSensorThingsStatus, OrganizationSensorThingsStatusDocument } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable } from 'tsyringe';
import { AbstractService } from './service.common';
import { assertIsValidObjectId, Database } from '../utils/database.utils';
import { ClientSession } from 'mongoose';
import { ThingBookHttpError } from '../utils/error.utils';
import { StatusCodes } from 'http-status-codes';
import { PaginatedResults, PaginationOptions } from 'thingbook-api';

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

    public async listOrganizations(options?: PaginationOptions): Promise<PaginatedResults<OrganizationDocument>> {
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

    public async createOrganizationRole(orgRole: OrganizationRoleDocument, session: ClientSession | null = null): Promise<OrganizationRoleDocument> {

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
        options?: PaginationOptions): Promise<OrganizationDataSharingTemplateDocument[]> {

        options = options || new PaginationOptions();
        return await OrganizationDataSharingTemplate.find({ org: org._id })
            .sort(options.asSortCriteria())
            .skip(options.page_number * options.page_size)
            .limit(options.page_size)
            .populate('org', '-verification')
            .populate('template')
            .exec();
    }


    public async createOrganizationDataSharingTemplate(
        template: OrganizationDataSharingTemplateDocument,
        session: ClientSession | null = null): Promise<OrganizationDataSharingTemplateDocument> {

        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await OrganizationDataSharingTemplate.create([template], { session: session });

            this.logger.info("Created Organization DataSharingTemplate: %s", template.name || template.template.name);

            return await OrganizationDataSharingTemplate.findOne({ org: template.org, template: template.template })
                .populate('org', '-verification')
                .populate('template')
                .session(session)
                .orFail();
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingTemplate", error);
        }
    }

    public async listOrganizationDataSharingAgreements(
        org: OrganizationDocument,
        options?: PaginationOptions): Promise<OrganizationDataSharingAgreementDocument[]> {

        options = options || new PaginationOptions();
        return await OrganizationDataSharingAgreement.find({ $or: [{ producer: org._id }, { consumer: org._id }] })
            .sort(options.asSortCriteria())
            .skip(options.page_number * options.page_size)
            .limit(options.page_size)
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
        session: ClientSession | null = null): Promise<OrganizationDataSharingAgreementDocument> {

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
                .orFail()
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