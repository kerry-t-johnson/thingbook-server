import { Schema, model, Document, PassportLocalModel, PassportLocalDocument, isValidObjectId } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import { ResourceListOptions } from './options';

export interface UserDocument extends Document, PassportLocalDocument {
    email: string
}

export const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, index: true }
});

UserSchema.path('email').validate((value: string) => {
    const re = /^[a-zA-Z0-9.!#$%&' * +/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    return re.test(String(value).toLowerCase());
});

UserSchema.statics.all = async function ({ sort_field = 'email', sort_asc = true, offset = 0, limit = 9999 }: ResourceListOptions): Promise<UserDocument[]> {
    var sort = { [sort_field]: sort_asc ? 'asc' : 'desc' };
    return this.find()
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .exec();
}

UserSchema.statics.findByEmailOrId = function (emailOrId: string): Promise<UserDocument> {
    if (isValidObjectId(emailOrId)) {
        return this.findById(emailOrId).exec();
    }
    else {
        return this.findOne({ email: emailOrId }).exec();
    }
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

export const User: PassportLocalModel<UserDocument> = model<UserDocument, PassportLocalModel<UserDocument>>('User', UserSchema);
