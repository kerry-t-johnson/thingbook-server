import { ClientSession } from "mongoose";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from "../models/data-sharing.model";
import { ListQueryOptions } from "../models/options";
import { OrganizationDataSharingAgreementDocument } from "../models/organization.model";

export interface DataSharingService {

    // Data Sharing Fragment
    listDataSharingFragments: (options?: ListQueryOptions) => Promise<DataSharingFragmentDocument[]>;
    createDataSharingFragment: (fragment: DataSharingFragmentDocument, session?: ClientSession) => Promise<DataSharingFragmentDocument>;

    // Data Sharing Template
    listDataSharingTemplates: (options?: ListQueryOptions) => Promise<DataSharingTemplateDocument[]>;
    createDataSharingTemplate: (fragment: DataSharingTemplateDocument, session?: ClientSession) => Promise<DataSharingTemplateDocument>;

    // Organization Data Sharing Agreement
    // NOTE: Agreements are created via Organization Service based on the data producer
    listDataSharingAgreements: (options?: ListQueryOptions) => Promise<OrganizationDataSharingAgreementDocument[]>;

}
