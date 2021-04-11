import { PaginationOptions } from 'thingbook-api';
import { UserDocument } from "../models/user.model";

export interface UserService {

    listUsers: (options?: PaginationOptions) => Promise<UserDocument[]>;
    createUser: (user: UserDocument, password: string) => Promise<UserDocument>;
    findUser: (idOrEmail: string | number) => Promise<UserDocument>;
}