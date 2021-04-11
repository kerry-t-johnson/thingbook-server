import { Schema, model, Document, PassportLocalModel, PassportLocalDocument, Model } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import { isValidEmailAddress, maskEmail } from '../utils';
import { assertIsValidObjectId } from '../utils/database.utils';
import { PaginationOptions } from 'thingbook-api';
import * as api from 'thingbook-api';


export interface UserDocument extends Document, api.User, PassportLocalDocument {
}

export const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, index: true },
    first: { type: String, required: false },
    last: { type: String, required: false },
    roles: [{ type: String, required: false }],
    profile: { type: Map, of: String },

}, {
    timestamps: true,
    collection: 'user'
});

export interface UserModel extends Model<UserDocument>, PassportLocalModel<UserDocument> {
    list: (options?: PaginationOptions) => Promise<UserDocument[]>;
    findByEmailOrId: (idOrEmail: string | number) => Promise<UserDocument>;
}

UserSchema.path('email').validate((value: string) => {
    return isValidEmailAddress(value);
});

UserSchema.statics.list = async function (options?: PaginationOptions): Promise<UserDocument[]> {
    options = options || new PaginationOptions();
    return this.find()
        .sort(options.asSortCriteria())
        .skip(options.page_number)
        .limit(options.page_size)
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
    const thisObject: any = <any>this;
    var jsonObject: any = this.toObject();

    delete jsonObject.hash;
    delete jsonObject.salt;
    delete jsonObject.password;
    delete jsonObject.profile;

    if (thisObject?.authorization) {
        jsonObject.authorization = thisObject.authorization;
    }

    return jsonObject;
}

UserSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

export const User: UserModel = model<UserDocument, UserModel>('User', UserSchema);

