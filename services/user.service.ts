import { ResourceListOptions } from "../models/options";
import { UserDocument } from "../models/user.model";

export { ResourceListOptions };

export interface UserService {

    list: (options: ResourceListOptions) => Promise<UserDocument[]>;
    create: (user: UserDocument, password: string) => Promise<UserDocument>;
    findUser: (idOrEmail: string) => Promise<UserDocument>;
}