import "reflect-metadata";
import { container } from "tsyringe";
import express, { Application as ExpressApplication, Request, Response, NextFunction } from 'express';
import { API } from './api';
import { OrganizationServiceImpl } from "./services/organization.service.impl";
import { User } from "./models/user.model";
import mongoose from 'mongoose';
import morgan from 'morgan';
import { Logger, getLogger } from './logger';
import passport from 'passport';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { UserServiceImpl } from "./services/user.service.impl";

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
    private impl: ExpressApplication;

    /** Winston-based logger */
    private logger: Logger;

    /** The routes */
    private api: API = new API();

    /**
     * Instantiates the application, connects the middleware, creates routes, etc.
     */
    constructor() {
        this.impl = express();
        this.logger = getLogger('Application');

        this.impl.use(express.json());
        this.impl.use(session({
            secret: 'TODO',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: true,
                maxAge: 600000 // Time is in miliseconds
            },
            genid: function (req: Request) {
                return uuidv4();
            }
        }));
        this.impl.use(passport.initialize());
        this.impl.use(passport.session());
        this.impl.use(morgan("tiny", { stream: { write: this.logRequest.bind(this) } }));
        this.impl.use('/api/v1', this.api.router);
        this.impl.use(this.logError.bind(this));

        passport.use(User.createStrategy());
        passport.serializeUser(User.serializeUser());
        passport.deserializeUser(User.deserializeUser());
    }

    /**
     * Runs the NodeJS application.
     */
    public async run() {
        const port = parseInt(process.env.PORT || '3000');

        await mongoose.connect(
            process.env.DATABASE_URL || 'mongodb://mongo:27017',
            { useNewUrlParser: true, useUnifiedTopology: true });

        this.impl.listen(port, () => {
            this.logger.info('Server listening on port %s', port);
        });
    }

    /**
     * Using morgan and winston, logs HTTP requests.
     * 
     * @param message details of the HTTP request
     */
    private logRequest(message: string) {
        this.logger.silly(message.trim());
    }

    /**
     * Using morgan and winston, logs HTTP errors
     * 
     * @param err error details
     * @param req request details
     * @param res response details
     * @param next next method in the middelware
     */
    private logError(err: any, req: Request, res: Response, next: NextFunction) {
        this.logger.error(`${req.method} - ${err}  - ${req.originalUrl} - ${req.ip}`);
        next(err);
    }
}

// Dependency Injection 
container.register("OrganizationService", { useClass: OrganizationServiceImpl });
container.register("UserService", { useClass: UserServiceImpl });

export const app: Application = new Application();
app.run();