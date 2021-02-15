import { inject, injectable } from "tsyringe";
import { Configuration } from "../config";
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as utils from './index';
import { Logger } from "winston";
import { getLogger } from "./logger";
import { ThingBookError } from "./error.utils";
import { StatusCodes } from 'http-status-codes';

export class DuplicateDatabaseEntryError extends ThingBookError {
    constructor(entityType: string, error: any) {
        super(StatusCodes.CONFLICT, `Attempted to create duplicate ${entityType} entity: ${error}`);
        Error.captureStackTrace(this, DuplicateDatabaseEntryError);
    }
}

export class DatabaseValidationError extends ThingBookError {
    constructor(entityType: string, error: any) {
        super(StatusCodes.UNPROCESSABLE_ENTITY, `Attempted to create incomplete ${entityType} entity: ${error}`);
        Error.captureStackTrace(this, DatabaseValidationError);
    }
}

export class UnknownDatabaseError extends ThingBookError {
    constructor(entityType: string, error: any) {
        super(StatusCodes.INTERNAL_SERVER_ERROR, `Unknown database error re: ${entityType}: ${error}`);
        Error.captureStackTrace(this, UnknownDatabaseError);
    }
}

export function assertIsValidObjectId(id: any) {
    if (!mongoose.isValidObjectId(id)) {
        throw new ThingBookError(StatusCodes.BAD_REQUEST, 'The request included an invalid Object ID');
    }
}

export async function startSession() {
    return await mongoose.startSession();
}

@injectable()
export class Database {

    /** Winston-based logger */
    private logger: Logger = getLogger('Database');
    private mongod: MongoMemoryReplSet | undefined = undefined;

    constructor(@inject("Configuration") private config?: Configuration) {

    }

    public async connect(inMemory: boolean = false) {
        utils.assertIsDefined(this.config);

        if (inMemory) {
            this.mongod = new MongoMemoryReplSet();
            await this.mongod.waitUntilRunning();
            this.config.databaseURL = await this.mongod.getUri();
        }

        const mongooseOpts = {
            useNewUrlParser: true,
            keepAlive: true,
            connectTimeoutMS: 30000,
            useUnifiedTopology: true,
            useCreateIndex: true,
        };

        await mongoose.connect(this.config.databaseURL, mongooseOpts);

        this.logger.info("Connected to MongoDB: %s", this.config.databaseURL);
    }

    public async close() {
        utils.assertIsDefined(this.config);

        await mongoose.connection.close();
        if (this.mongod) {
            this.mongod.stop();
        }

        this.logger.debug("Closed connection to MongoDB: %s", this.config.databaseURL);
    }

    public async clear() {
        for (const [key, collection] of Object.entries(mongoose.connection.collections)) {
            const result = await collection.deleteMany({});
            this.logger.debug("Removed %d items from %s collection", result.deletedCount, key);
        }
    }

    public static createException(entityType: string, error: any) {
        if (error?.code) {
            return Database.createMongoException(entityType, error);
        }
        else if (error?.message) {
            return Database.createMongooseException(entityType, error);
        }
        else {
            return new UnknownDatabaseError(entityType, error);
        }
    }

    private static createMongoException(entityType: string, error: any) {
        // Reference: https://github.com/mongodb/mongo/blob/34228dcee8b2961fb3f5d84e726210d6faf2ef4f/src/mongo/base/error_codes.yml
        switch (error.code) {
            case 11000:
                return new DuplicateDatabaseEntryError(entityType, error);
            default:
                return new UnknownDatabaseError(entityType, error);
        }
    }

    private static createMongooseException(entityType: string, error: any) {
        if (error.message.includes('validation failed')) {
            return new DatabaseValidationError(entityType, error);
        }

        return new UnknownDatabaseError(entityType, error);
    }
}