import { Document, model, Model, Schema } from "mongoose";
import * as api from 'thingbook-api';
import { PaginationOptions } from "../../../thingbook-api/src/metadata.api";
import { enumValues } from "../../src/utils";


export interface EntityCreationStatusDocument extends Document, api.EntityCreationStatus {
};

export const EntityCreationStatusSchema = new Schema({
    resource: { type: String, required: true },
    data: { type: String, required: true },
    dynamic: { type: String },
    createAt: { type: Date },
    status: { type: Number },
});


export interface DataLoadRequestDocument extends Document, api.DataLoadRequest {
    retries: number,
    entities: EntityCreationStatusDocument[]
}

export const DataLoadRequestSchema = new Schema({
    name: { type: String, required: true },
    url: { type: String },
    state: { type: String, enum: enumValues(api.DataLoadRequestState) },
    files: [{ type: String }],
    created: { type: Number, required: true },
    existing: { type: Number, required: true },
    failed: { type: Number, required: true },
    retries: { type: Number, required: true },
    entities: [EntityCreationStatusSchema],
}, {
    timestamps: true,
    collection: 'data-load-requests',
});

export interface DataLoadRequestModel extends Model<DataLoadRequestDocument> {
    list: (options?: PaginationOptions) => Promise<DataLoadRequestDocument[]>;
}

DataLoadRequestSchema.statics.list = async function (options?: PaginationOptions): Promise<DataLoadRequestDocument[]> {
    options = options || new PaginationOptions();

    return this.find()
        .sort(options.asSortCriteria())
        .skip(options.page_number)
        .limit(options.page_size)
        .exec();
}

export const DataLoadRequest: DataLoadRequestModel = model<DataLoadRequestDocument, DataLoadRequestModel>('DataLoadRequest', DataLoadRequestSchema);
