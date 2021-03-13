import { ClientSession } from "mongoose";
import { injectable } from "tsyringe";
import { DataSharingFragment, DataSharingFragmentDocument, DataSharingTemplate, DataSharingTemplateDocument } from "../models/data-sharing.model";
import { ListQueryOptions } from "../models/options";
import { OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument } from "../models/organization.model";
import { Database } from "../utils/database.utils";
import { DataSharingService } from "./data-sharing.service";
import { AbstractService } from "./service.common";

@injectable()
export class DataSharingServiceImpl extends AbstractService implements DataSharingService {

    constructor() {
        super("DataSharing")
    }

    public async listDataSharingFragments(options?: ListQueryOptions): Promise<DataSharingFragmentDocument[]> {

        options = options || new ListQueryOptions();

        return DataSharingFragment.find()
            .sort(options.asSortCriteria())
            .skip(options.offset)
            .limit(options.limit)
            .exec();
    }

    public async listDataSharingTemplates(options?: ListQueryOptions): Promise<DataSharingTemplateDocument[]> {
        options = options || new ListQueryOptions();

        return DataSharingTemplate.find()
            .sort(options.asSortCriteria())
            .skip(options.offset)
            .limit(options.limit)
            .populate('fragments')
            .exec();
    }


    public async createDataSharingFragment(fragment: DataSharingFragmentDocument, session?: ClientSession): Promise<DataSharingFragmentDocument> {
        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await DataSharingFragment.create([fragment], { session: session });
            this.logger.silly(`Created DataSharingFragment: ${fragment.name}`);

            return await DataSharingFragment.findOne({ name: fragment.name }).session(session).orFail();
        }
        catch (error) {
            throw Database.createException("DataSharingFragment", error);
        }
    }

    public async createDataSharingTemplate(template: DataSharingTemplateDocument, session?: ClientSession): Promise<DataSharingTemplateDocument> {
        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await DataSharingTemplate.create([template], { session: session });
            this.logger.silly(`Created DataSharingTemplate: ${template.name}`);

            return await DataSharingTemplate.findOne({ name: template.name })
                .populate('fragments')
                .session(session);
        }
        catch (error) {
            throw Database.createException("DataSharingTemplate", error);
        }
    }

    public async listDataSharingAgreements(options?: ListQueryOptions): Promise<OrganizationDataSharingAgreementDocument[]> {
        options = options || new ListQueryOptions();

        return await OrganizationDataSharingAgreement.find()
            .sort(options.asSortCriteria())
            .skip(options.offset)
            .limit(options.limit)
            .populate('producer', '-verification -sensorThingsAPI')
            .populate('consumer', '-verification -sensorThingsAPI')
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

}