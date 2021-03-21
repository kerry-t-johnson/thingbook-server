import { Document, model, Model, Schema } from "mongoose";
import * as api from 'thingbook-api';
import { number } from "yargs";
import { ListQueryOptions } from "../../src/models/options";
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
    list: (options?: ListQueryOptions) => Promise<DataLoadRequestDocument[]>;
}

DataLoadRequestSchema.statics.list = async function (options?: ListQueryOptions): Promise<DataLoadRequestDocument[]> {
    options = options || new ListQueryOptions();

    return this.find()
        .sort(options.asSortCriteria())
        .skip(options.offset)
        .limit(options.limit)
        .exec();
}

export const DataLoadRequest: DataLoadRequestModel = model<DataLoadRequestDocument, DataLoadRequestModel>('DataLoadRequest', DataLoadRequestSchema);
