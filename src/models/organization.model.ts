import { PaginatedResults, PaginationOptions, PaginationStatus } from 'thingbook-api';
import { Schema, model, Model, Document } from 'mongoose';
import { DataSharingTemplateDocument } from './data-sharing.model';
import { enumValues } from '../utils';
import * as api from 'thingbook-api';
const MaskData = require('maskdata');

// ===========================================================================
// Organization
// ===========================================================================
export const DomainVerificationMethods = [
    'DNS_TEXT_RECORD',
    'HTML_META_TAG',
    'HTTP_FILE'
];


/**
 * Interface declaration for an {@link Organization}, as defined by {@link OrganizationSchema}
 * An {@link Organization} is a ThingBook entity which can form Data Sharing
 * Agreements to produce or consume Observations.  See {@link OrganizationSchema}
 * for properties.
 * 
 * @category Domain Model
 */
export interface OrganizationDocument extends Document, api.Organization {

}

/**
 * A [Mongoose.Schema](https://mongoosejs.com/docs/guide.html) which describes
 * the {@link Organization} domain model:
 *
 * @category Domain Model
 */
export const OrganizationSchema = new Schema({
    name: { type: String, required: true },
    domainName: { type: String, unique: true, index: true },
    sensorThingsAPI: { type: String },
    sensorThingsMQTT: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Organization' },
    verification: new Schema({
        method: { type: String, required: true, enum: DomainVerificationMethods },
        token: { type: String, required: true, get: MaskData.maskPassword },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        verified: { type: Boolean, required: true, default: false },
    }, { toJSON: { getters: true } })
}, {
    timestamps: true,
    collection: 'organization',
    toJSON: { virtuals: true, getters: true },
});

export interface OrganizationModel extends Model<OrganizationDocument> {
    list: (options?: PaginationOptions) => Promise<PaginatedResults<OrganizationDocument>>;
}

OrganizationSchema.statics.list = async function (options?: PaginationOptions): Promise<PaginatedResults<OrganizationDocument>> {
    const localPagination = options ?? new PaginationOptions();

    return new Promise<PaginatedResults<OrganizationDocument>>(async (resolve, reject) => {
        try {
            const results: OrganizationDocument[] = await this.find()
                .sort(localPagination.asSortCriteria())
                .skip(localPagination.page_number * localPagination.page_size)
                .limit(localPagination.page_size)
                .exec();

            const totalCount: number = await this.estimatedDocumentCount();

            resolve(new PaginatedResults<OrganizationDocument>(results, PaginationStatus.fromPaginationOptions(localPagination, totalCount)));
        }
        catch (error) {
            reject(error);
        }
    });

}


OrganizationSchema.methods.toString = function () {
    return `${this.name} (${this.domainName})`;
}


export const Organization: OrganizationModel = model<OrganizationDocument, OrganizationModel>('Organization', OrganizationSchema);


// ===========================================================================
// Organization Role
// ===========================================================================
export interface OrganizationRoleDocument extends Document, api.OrganizationRole {
}

export const OrganizationRoleSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, required: true },
}, {
    timestamps: true,
    collection: 'organization-role'
});

OrganizationRoleSchema.index({ user: 1, org: 1, role: 1 }, { unique: true });

OrganizationRoleSchema.methods.toString = function () {
    return `${this.user} is ${this.role} for ${this.org}`;
}

export interface OrganizationRoleModel extends Model<OrganizationRoleDocument> {
}

export const OrganizationRole: OrganizationRoleModel = model<OrganizationRoleDocument, OrganizationRoleModel>('OrganizationRole', OrganizationRoleSchema);


// ===========================================================================
// Organization Data Sharing Template
// ===========================================================================
export interface OrganizationDataSharingTemplateDocument extends Document {
    name?: string,
    org: OrganizationDocument,
    template: DataSharingTemplateDocument,
    auto: boolean,
    keywords: string[],
    datastreams: string[],
}

export const OrganizationDataSharingTemplateSchema = new Schema({
    name: { type: String, required: false },
    org: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    template: { type: Schema.Types.ObjectId, ref: 'DataSharingTemplate', required: true },
    auto: { type: Boolean, required: true },
    keywords: [{ type: String }],
    datastreams: [{ type: String }]
}, {
    timestamps: true,
    collection: 'organization-data-sharing-template'
});
OrganizationDataSharingTemplateSchema.index({ org: 1, template: 1 }, { unique: true });


export interface OrganizationDataSharingTemplateModel extends Model<OrganizationDataSharingTemplateDocument> {
}
export const OrganizationDataSharingTemplate: OrganizationDataSharingTemplateModel = model<OrganizationDataSharingTemplateDocument, OrganizationDataSharingTemplateModel>('OrganizationDataSharingTemplate', OrganizationDataSharingTemplateSchema);


// ===========================================================================
// Organization Data Sharing Agreement
// ===========================================================================
export interface OrganizationDataSharingAgreementDocument extends Document, api.OrganizationDataSharingAgreement {
}

export const OrganizationDataSharingAgreementSchema = new Schema({
    name: { type: String, required: true },
    producer: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    consumer: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    commenceDate: { type: Date, required: true },
    expirationDate: { type: Date, required: true },
    state: { type: String, required: true, enum: enumValues(api.OrganizationDataSharingAgreementState) },
    template: { type: Schema.Types.ObjectId, ref: 'OrganizationDataSharingTemplate', required: true },
    datastreams: [{
        name: { type: String, required: true },
        id: { type: Number, required: false },
        count: { type: Number, required: false },
        lastPhenomenonTime: { type: Date, required: false },
        lastSuccessfulTime: { type: Date, required: false },
        lastAttemptTime: { type: Date, required: false }
    }]
}, {
    timestamps: true,
    collection: 'organization-data-sharing-agreement'
});

export interface OrganizationDataSharingAgreementModel extends Model<OrganizationDataSharingAgreementDocument> {

}

export const OrganizationDataSharingAgreement: OrganizationDataSharingAgreementModel = model<OrganizationDataSharingAgreementDocument, OrganizationDataSharingAgreementModel>('OrganizationDataSharingAgreement', OrganizationDataSharingAgreementSchema);



// ===========================================================================
// Organization Sensor Things Status
// ===========================================================================
export interface OrganizationSensorThingsStatusDocument extends Document, api.OrganizationSensorThingsStatus {
}

export const OrganizationSensorThingsStatusSchema = new Schema({
    org: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    reachable: { type: Boolean, required: true },
    lastStatus: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'organization-sensor-things-status'
});

export interface OrganizationSensorThingsStatusModel extends Model<OrganizationSensorThingsStatusDocument> {

}

export const OrganizationSensorThingsStatus: OrganizationSensorThingsStatusModel = model<OrganizationSensorThingsStatusDocument, OrganizationSensorThingsStatusModel>('OrganizationSensorThingsStatus', OrganizationSensorThingsStatusSchema);

