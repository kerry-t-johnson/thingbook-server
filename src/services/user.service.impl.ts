import { inject, injectable } from "tsyringe";
import { UserDocument, UserModel } from "../models/user.model";
import * as utils from "../utils";
import { Database } from "../utils/database.utils";
import { ThingBookError } from "../utils/error.utils";
import { AbstractService } from "./service.common";
import { ResourceListOptions, UserService } from "./user.service";
import { StatusCodes } from 'http-status-codes';

@injectable()
export class UserServiceImpl extends AbstractService implements UserService {

    constructor(@inject("UserModel") private userModel?: UserModel) {
        super("UserService");
    }

    public async list(options?: ResourceListOptions): Promise<UserDocument[]> {
        utils.assertIsDefined(this.userModel);
        return this.userModel.all(options);
    }

    public async findUser(idOrEmail: string): Promise<UserDocument> {
        utils.assertIsDefined(this.userModel);
        return await this.userModel.findByEmailOrId(idOrEmail);
    }

    public async create(user: UserDocument, password: string): Promise<UserDocument> {
        utils.assertIsDefined(this.userModel);

        try {
            await this.userModel.register(user, password);
            user = await this.findUser(user.email);

            this.logger.info("Created User %s: %s", user._id, user.email);

            return user;
        }
        catch (error) {
            if (error?.name == "UserExistsError") {
                throw new ThingBookError(StatusCodes.CONFLICT, error);
            }

            if (error?.name == "MissingUsernameError") {
                throw new ThingBookError(StatusCodes.UNPROCESSABLE_ENTITY, error);
            }

            throw Database.createException("User", error);
        }
    }

}