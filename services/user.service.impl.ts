import { Logger, getLogger } from "../logger";
import { UserDocument, User } from "../models/user.model";
import { ResourceListOptions, UserService } from "./user.service";

export class UserServiceImpl implements UserService {

    private logger: Logger = getLogger('UserService');

    public async list(options: ResourceListOptions): Promise<UserDocument[]> {
        // return User.all(options).map(this.sanitize.bind(this));
        return User.all(options);
    }

    public async findUser(idOrEmail: string): Promise<UserDocument> {
        return await User.findByEmailOrId(idOrEmail);
    }

    public async create(user: UserDocument, password: string): Promise<UserDocument> {
        await User.register(user, password);

        this.logger.info("Created User %s: %s", user._id, user.email);

        return this.findUser(user.email);
    }

}