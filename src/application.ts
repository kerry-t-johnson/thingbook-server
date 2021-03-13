import "reflect-metadata";
import { container } from "tsyringe";
import express, { Application as ExpressApplication } from 'express';
import { Router } from './routes';
import { Logger, getLogger } from './utils/logger';
import { Configuration } from "./config";
import { EventService } from "./services/event-service";
import * as http from 'http';
import { SocketService } from "./services/socket.service";

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

    private httpServer: http.Server;

    /** The underlying implementation is an [express.Application](http://expressjs.com/en/api.html#app) */
    private impl: ExpressApplication = express();

    /** Winston-based logger */
    private logger: Logger = getLogger('Application');

    /** The routes */
    private router: Router = new Router();

    private config: Configuration = container.resolve("Configuration");

    private eventSvc: EventService = container.resolve("EventService");

    private socketSvc: SocketService = container.resolve("SocketService");

    /**
     * Instantiates the application, connects the middleware, creates routes, etc.
     */
    constructor() {
        this.httpServer = http.createServer(this.impl);
        this.router.configure(this.impl);
    }

    /**
     * Runs the NodeJS application.
     */
    public async run() {
        this.eventSvc.post('application.initialized');

        this.httpServer.listen(this.config.port, () => {
            this.logger.info('Server listening on port %s', this.config.port);
        });

        this.socketSvc.initialize(this.httpServer);

    }

}

