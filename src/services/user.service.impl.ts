import { injectable } from "tsyringe";
import { User, UserDocument } from "../models/user.model";
import { Database } from "../utils/database.utils";
import { ThingBookHttpError } from "../utils/error.utils";
import { AbstractService } from "./service.common";
import { UserService } from "./user.service";
import { StatusCodes } from 'http-status-codes';
import { PaginationOptions } from 'thingbook-api';

@injectable()
export class UserServiceImpl extends AbstractService implements UserService {

    constructor() {
        super("UserService");
    }

    public async listUsers(options?: PaginationOptions): Promise<UserDocument[]> {
        return User.list(options);
    }

    public async findUser(idOrEmail: string | number): Promise<UserDocument> {
        return await User.findByEmailOrId(idOrEmail);
    }

    public async createUser(user: UserDocument, password: string): Promise<UserDocument> {

        try {
            await User.register(user, password);
            user = await this.findUser(user.email);

            this.logger.info("Created User %s: %s", user._id, user.email);

            return user;
        }
        catch (error) {
            if (error?.name == "UserExistsError") {
                throw new ThingBookHttpError(StatusCodes.CONFLICT, error);
            }

            if (error?.name == "MissingUsernameError") {
                throw new ThingBookHttpError(StatusCodes.UNPROCESSABLE_ENTITY, error);
            }

            throw Database.createException("User", error);
        }
    }

}