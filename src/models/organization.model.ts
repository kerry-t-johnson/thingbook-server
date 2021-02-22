import { ResourceListOptions } from './options';
import { Schema, model, Model, Document } from 'mongoose';
import { UserDocument } from './user.model';
import { DataSharingTemplateDocument } from './data-sharing.model';
import { enumValues } from '../utils';

export { ResourceListOptions };

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
export interface OrganizationDocument extends Document {

    /** The common name of the {@link Organization} (e.g.Shenandoah, Inc.) */
    name: string,

    /** The domain name of the {@link Organization} (e.g.shenandoah.com) */
    domainName: string,

    /** The URL to the[OGC - compliant Sensor Things API](https://www.ogc.org/standards/sensorthings) of the {@link Organization} */
    sensorThingsURL: string,

    /** If this {@link Organization} is a sub-organizations, references the parent {@link Organization}, else NULL */
    parent?: OrganizationDocument,

    verification?: {
        method: string,
        token: string,
        user: UserDocument,
        verified: boolean,
    }
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
    sensorThingsURL: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Organization' },
    verification: new Schema({
        method: { type: String, required: true, enum: DomainVerificationMethods },
        token: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        verified: { type: Boolean, required: true, default: false },
    })
}, {
    timestamps: true,
    collection: 'organization'
});

export interface OrganizationModel extends Model<OrganizationDocument> {
    list: (options?: ResourceListOptions) => Promise<OrganizationDocument[]>;
}

OrganizationSchema.statics.list = async function (options?: ResourceListOptions): Promise<OrganizationDocument[]> {
    options = options || new ResourceListOptions();

    return this.find()
        .sort(options.asSortCriteria())
        .skip(options.offset)
        .limit(options.limit)
        .exec();
}

OrganizationSchema.methods.toString = function () {
    return `${this.name} (${this.domainName})`;
}

export const Organization: OrganizationModel = model<OrganizationDocument, OrganizationModel>('Organization', OrganizationSchema);


// ===========================================================================
// Organization Role
// ===========================================================================
export interface OrganizationRoleDocument extends Document {
    user: UserDocument,
    org: OrganizationDocument,
    role: string
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

OrganizationSchema.methods.toString = function () {
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
export enum OrganizationDataSharingAgreementState {
    INACTIVE = 'INACTIVE',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'
}

export interface OrganizationDataSharingAgreementDocument extends Document {
    name: string,
    producer: OrganizationDocument,
    consumer: OrganizationDocument,
    commenceDate: Date,
    expirationDate: Date,
    state: OrganizationDataSharingAgreementState,
    template: OrganizationDataSharingTemplateDocument
}

export const OrganizationDataSharingAgreementSchema = new Schema({
    name: { type: String, required: true },
    producer: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    consumer: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    commenceDate: { type: Date, required: true },
    expirationDate: { type: Date, required: true },
    state: { type: String, required: true, enum: enumValues(OrganizationDataSharingAgreementState) },
    template: { type: Schema.Types.ObjectId, ref: 'OrganizationDataSharingTemplate', required: true }
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


export interface OrganizationSensorThingsStatusDocument extends Document {
    org: OrganizationDocument,
    reachable: boolean
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

