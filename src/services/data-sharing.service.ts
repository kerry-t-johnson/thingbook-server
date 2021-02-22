import { ClientSession } from "mongoose";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from "../models/data-sharing.model";
import { ResourceListOptions } from "../models/options";

export interface DataSharingService {

    // Data Sharing Fragment
    listDataSharingFragments: (options?: ResourceListOptions) => Promise<DataSharingFragmentDocument[]>;
    createDataSharingFragment: (fragment: DataSharingFragmentDocument, session?: ClientSession) => Promise<DataSharingFragmentDocument>;

    // Data Sharing Template
    listDataSharingTemplates: (options?: ResourceListOptions) => Promise<DataSharingTemplateDocument[]>;
    createDataSharingTemplate: (fragment: DataSharingTemplateDocument, session?: ClientSession) => Promise<DataSharingTemplateDocument>;

}
