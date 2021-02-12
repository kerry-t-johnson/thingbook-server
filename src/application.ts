import "reflect-metadata";
import { container } from "tsyringe";
import express, { Application as ExpressApplication } from 'express';
import { Router } from './api';
import { OrganizationServiceImpl } from "./services/organization.service.impl";
import { User } from "./models/user.model";
import { Logger, getLogger } from './utils/logger';
import { UserServiceImpl } from "./services/user.service.impl";
import { Organization } from "./models/organization.model";
import { Configuration } from "./config";
import { Database } from "./utils/database.utils";

/**
 * Entrypoint for the application.
 * -------------------------------
 * This module and class:
 * 1. Registers interface implementations, which them may be
 *    dependency-injected throughout the application
 * 2. Instantiates and connects the layers of the entire application.
 * 3. Creates and runs the {@link Application} class
 */
export class Application {

    /** The underlying implementation is an [express.Application](http://expressjs.com/en/api.html#app) */
    private impl: ExpressApplication = express();

    /** Winston-based logger */
    private logger: Logger = getLogger('Application');

    /** The routes */
    private router: Router = new Router();

    private config: Configuration = container.resolve("Configuration");

    /**
     * Instantiates the application, connects the middleware, creates routes, etc.
     */
    constructor() {
        this.router.initialize(this.impl);
    }

    /**
     * Runs the NodeJS application.
     */
    public async run() {
        const db: Database = container.resolve("Database");

        await db.connect();

        this.impl.listen(this.config.port, () => {
            this.logger.info('Server listening on port %s', this.config.port);
        });
    }

}

const config: Configuration = new Configuration();

// Dependency Injection
container.register("Configuration", { useValue: config });
container.register("Database", { useClass: Database });
container.register("OrganizationModel", { useValue: Organization });
container.register("OrganizationService", { useClass: OrganizationServiceImpl });
container.register("UserModel", { useValue: User });
container.register("UserService", { useClass: UserServiceImpl });

export const app: Application = new Application();
app.run();