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


OrganizationSchema.statics.all = async function ({ sort_field = 'name', sort_asc = true, offset = 0, limit = 9999 }: ResourceListOptions): Promise<OrganizationDocument[]> {
    var sort = { [sort_field]: sort_asc ? 'asc' : 'desc' };
    return this.find()
        .sort(sort)
        .skip(offset)
        .limit(limit).exec();
}


export const Organization: Model<OrganizationDocument> = model('Organization', OrganizationSchema);
