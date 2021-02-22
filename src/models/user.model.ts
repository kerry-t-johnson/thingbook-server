import { Schema, model, Document, PassportLocalModel, PassportLocalDocument, Model } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import { isValidEmailAddress, maskEmail } from '../utils';
import { assertIsValidObjectId } from '../utils/database.utils';
import { ResourceListOptions } from './options';

export { ResourceListOptions }


export interface UserDocument extends Document, PassportLocalDocument {
    email: string,
}

export const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, index: true },

}, {
    timestamps: true,
    collection: 'user'
});

export interface UserModel extends Model<UserDocument>, PassportLocalModel<UserDocument> {
    list: (options?: ResourceListOptions) => Promise<UserDocument[]>;
    findByEmailOrId: (idOrEmail: string | number) => Promise<UserDocument>;
}

UserSchema.path('email').validate((value: string) => {
    return isValidEmailAddress(value);
});

UserSchema.statics.list = async function (options?: ResourceListOptions): Promise<UserDocument[]> {
    options = options || new ResourceListOptions();
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

