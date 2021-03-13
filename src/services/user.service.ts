import { ListQueryOptions } from "../models/options";
import { UserDocument } from "../models/user.model";

export { ListQueryOptions as ListQueryOptions };

export interface UserService {

    listUsers: (options?: ListQueryOptions) => Promise<UserDocument[]>;
    createUser: (user: UserDocument, password: string) => Promise<UserDocument>;
    findUser: (idOrEmail: string | number) => Promise<UserDocument>;
}