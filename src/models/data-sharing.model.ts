import { Document, Model, Schema, model } from "mongoose";
import { enumValues } from "../utils";
import * as api from 'thingbook-api';

// ===========================================================================
// Data Sharing Fragment
// ===========================================================================
export interface DataSharingFragmentDocument extends Document, api.DataSharingFragment {
}

export const DataSharingFragmentSchema = new Schema({
    name: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    type: { type: String, required: true, enum: enumValues(api.DataSharingFragmentType) }
}, {
    timestamps: true,
    collection: 'data-sharing-fragment'
});

export interface DataSharingFragmentModel extends Model<DataSharingFragmentDocument> {

}

export const DataSharingFragment: DataSharingFragmentModel = model<DataSharingFragmentDocument, DataSharingFragmentModel>('DataSharingFragment', DataSharingFragmentSchema);


// ===========================================================================
// Data Sharing Template
// ===========================================================================
export interface DataSharingTemplateDocument extends Document, api.DataSharingTemplate {

}

export const DataSharingTemplateSchema = new Schema({
    name: { type: String, required: true, unique: true },
    fragments: [{ type: Schema.Types.ObjectId, ref: 'DataSharingFragment' }]
}, {
    timestamps: true,
    collection: 'data-sharing-template',
    toJSON: { virtuals: true, getters: true },
});

export interface DataSharingTemplateModel extends Model<DataSharingTemplateDocument> {
    list: (options?: api.PaginationOptions) => Promise<api.PaginatedResults<DataSharingTemplateDocument>>;

}

DataSharingTemplateSchema.statics.list = async function (options?: api.PaginationOptions): Promise<api.PaginatedResults<DataSharingTemplateDocument>> {
    const localPagination = options ?? new api.PaginationOptions();

    return new Promise<api.PaginatedResults<DataSharingTemplateDocument>>(async (resolve, reject) => {
        try {
            const results: DataSharingTemplateDocument[] = await this.find()
                .sort(localPagination.asSortCriteria())
                .skip(localPagination.page_number * localPagination.page_size)
                .limit(localPagination.page_size)
                .populate('fragments')
                .exec();

            const totalCount: number = await this.estimatedDocumentCount();

            resolve(new api.PaginatedResults<DataSharingTemplateDocument>(results, api.PaginationStatus.fromPaginationOptions(localPagination, totalCount)));
        }
        catch (error) {
            reject(error);
        }
    });

}

export const DataSharingTemplate: DataSharingTemplateModel = model<DataSharingTemplateDocument, DataSharingTemplateModel>('DataSharingTemplate', DataSharingTemplateSchema);
