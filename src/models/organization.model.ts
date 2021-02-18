import { ResourceListOptions } from './options';
import { Schema, model, Model, Document } from 'mongoose';
import { UserDocument } from './user.model';

export { ResourceListOptions };


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
    name: String,

    /** The domain name of the {@link Organization} (e.g.shenandoah.com) */
    domainName: String,

    /** The URL to the[OGC - compliant Sensor Things API](https://www.ogc.org/standards/sensorthings) of the {@link Organization} */
    sensorThingsURL: String,

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
}, { timestamps: true });

export interface OrganizationModel extends Model<OrganizationDocument> {
    all: (options?: ResourceListOptions) => Promise<OrganizationDocument[]>;
}

OrganizationSchema.statics.all = async function (options?: ResourceListOptions): Promise<OrganizationDocument[]> {
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


export interface OrganizationRoleDocument extends Document {
    user: UserDocument,
    org: OrganizationDocument,
    role: string
}

export const OrganizationRoleSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, required: true },
}, { timestamps: true });

OrganizationRoleSchema.index({ user: 1, org: 1, role: 1 }, { unique: true });

OrganizationSchema.methods.toString = function () {
    return `${this.user} is ${this.role} for ${this.org}`;
}

export interface OrganizationRoleModel extends Model<OrganizationRoleDocument> {
}
export const OrganizationRole: OrganizationRoleModel = model<OrganizationRoleDocument, OrganizationRoleModel>('OrganizationRole', OrganizationRoleSchema);
