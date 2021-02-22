import "reflect-metadata";
import { container } from "tsyringe";
import express, { Application as ExpressApplication } from 'express';
import { Router } from './api';
import { Logger, getLogger } from './utils/logger';
import { Configuration } from "./config";

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
        this.impl.listen(this.config.port, () => {
            this.logger.info('Server listening on port %s', this.config.port);
        });
    }

}

