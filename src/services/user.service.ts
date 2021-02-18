import { ResourceListOptions } from "../models/options";
import { UserDocument } from "../models/user.model";

export { ResourceListOptions };

export interface UserService {

    list: (options?: ResourceListOptions) => Promise<UserDocument[]>;
    createUser: (user: UserDocument, password: string) => Promise<UserDocument>;
    findUser: (idOrEmail: string | number) => Promise<UserDocument>;
}