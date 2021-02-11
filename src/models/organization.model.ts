import { ResourceListOptions } from './options';
import { Schema, model, Model, Document } from 'mongoose';

export { ResourceListOptions };

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
    sensorThingsURL: String
}

/**
 * A [Mongoose.Schema](https://mongoosejs.com/docs/guide.html) which describes
 * the {@link Organization} domain model:
 *
 * @category Domain Model
 */
export const OrganizationSchema = new Schema({
    name: { type: String, required: true },
    domainName: { type: String, required: true, unique: true, index: true },
    sensorThingsURL: { type: String, required: true }
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


export const Organization: OrganizationModel = model<OrganizationDocument, OrganizationModel>('Organization', OrganizationSchema);
