import { OrganizationRoutes } from './organization.route';
import { container } from "tsyringe";
import { UserRoutes } from './user.route';
import express, { Application as ExpressApplication, Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { getLogger, Logger } from '../../logger';


export class Router {

    public router: ExpressRouter = ExpressRouter();
    private organizationAPI: OrganizationRoutes = container.resolve(OrganizationRoutes);
    private userAPI: UserRoutes = container.resolve(UserRoutes);
    private logger: Logger = getLogger("Router");

    constructor() {
        this.router.get('/status', this.status.bind(this));
    }

    public initialize(app: ExpressApplication) {
        app.use(express.json());
        app.use(morgan("tiny", { stream: { write: this.logRequest.bind(this) } }));
        app.use(this.logError.bind(this));

        app.use('/api/v1', this.router);
        this.userAPI.initialize(app, this.router);
        this.organizationAPI.initialize(app, this.router);
    }

    private status(req: Request, rsp: Response) {
        rsp.json({ status: 'OK' });
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

