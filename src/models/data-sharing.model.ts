import { Document, Model, Schema, model } from "mongoose";
import { enumValues } from "../utils";


// ===========================================================================
// Data Sharing Fragment
// ===========================================================================
export enum DataSharingFragmentType {
    AUTHORIZATION = 'AUTHORIZATION',
    OBLIGATION = 'OBLIGATION',
    PROHIBITION = 'PROHIBITION',
}

export interface DataSharingFragmentDocument extends Document {
    name: string,
    text: string,
    type: DataSharingFragmentType
}

export const DataSharingFragmentSchema = new Schema({
    name: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    type: { type: String, required: true, enum: enumValues(DataSharingFragmentType) }
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
export interface DataSharingTemplateDocument extends Document {
    name: String,
    fragments: DataSharingFragmentDocument[]
}

export const DataSharingTemplateSchema = new Schema({
    name: { type: String, required: true, unique: true },
    fragments: [{ type: Schema.Types.ObjectId, ref: 'DataSharingFragment' }]
}, {
    timestamps: true,
    collection: 'data-sharing-template'
});

export interface DataSharingTemplateModel extends Model<DataSharingTemplateDocument> {

}

export const DataSharingTemplate: DataSharingTemplateModel = model<DataSharingTemplateDocument, DataSharingTemplateModel>('DataSharingTemplate', DataSharingTemplateSchema);
