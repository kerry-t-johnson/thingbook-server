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
    collection: 'data-sharing-template'
});

export interface DataSharingTemplateModel extends Model<DataSharingTemplateDocument> {

}

export const DataSharingTemplate: DataSharingTemplateModel = model<DataSharingTemplateDocument, DataSharingTemplateModel>('DataSharingTemplate', DataSharingTemplateSchema);
