import { Schema, model, Document, PassportLocalModel, PassportLocalDocument, Model } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import { isValidEmailAddress, maskEmail } from '../utils';
import { assertIsValidObjectId } from '../utils/database.utils';
import { ListQueryOptions } from './options';
import * as api from 'thingbook-api';

export { ListQueryOptions as ListQueryOptions }


export interface UserDocument extends Document, api.User, PassportLocalDocument {
}

export const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, index: true },
    first: { type: String, required: false },
    last: { type: String, required: false },
    profile: { type: Map, of: String }

}, {
    timestamps: true,
    collection: 'user'
});

export interface UserModel extends Model<UserDocument>, PassportLocalModel<UserDocument> {
    list: (options?: ListQueryOptions) => Promise<UserDocument[]>;
    findByEmailOrId: (idOrEmail: string | number) => Promise<UserDocument>;
}

UserSchema.path('email').validate((value: string) => {
    return isValidEmailAddress(value);
});

UserSchema.statics.list = async function (options?: ListQueryOptions): Promise<UserDocument[]> {
    options = options || new ListQueryOptions();
    return this.find()
        .sort(options.asSortCriteria())
        .skip(options.offset)
        .limit(options.limit)
        .exec();
}

UserSchema.statics.findByEmailOrId = async function (emailOrId: string | number): Promise<UserDocument> {
    if (isValidEmailAddress(emailOrId)) {
        return await this.findOne({ email: emailOrId }).exec();
    }

    assertIsValidObjectId(emailOrId);
    return await this.findById(emailOrId).exec();
}

UserSchema.methods.toString = function () {
    return maskEmail(`${this.email}`);
}

UserSchema.methods.toJSON = function () {
    var obj: any = this.toObject();

    delete obj.hash;
    delete obj.salt;
    delete obj.password;

    return obj;
}

UserSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

export const User: UserModel = model<UserDocument, UserModel>('User', UserSchema);

