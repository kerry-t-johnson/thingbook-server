import { OrganizationRoutes } from './organization.route';
import { container } from "tsyringe";
import { UserRoutes } from './user.route';
import express, { Application as ExpressApplication, Router as ExpressRouter, Request, Response } from 'express';
import morgan from 'morgan';
import { AbstractRoute } from './route.common';
import { DataSharingRoutes } from './data-sharing.route';

export class Router extends AbstractRoute {

    public router: ExpressRouter = ExpressRouter();
    private organizationAPI: OrganizationRoutes = container.resolve(OrganizationRoutes);
    private userAPI: UserRoutes = container.resolve(UserRoutes);
    private dataSharingAPI: DataSharingRoutes = container.resolve(DataSharingRoutes);

    constructor() {
        super('Router');
        this.router.get('/status', this.status.bind(this));
    }

    public initialize(app: ExpressApplication) {
        app.use(express.json());
        app.use(morgan("tiny", { stream: { write: this.logRequest.bind(this) } }));

        app.use('/api/v1', this.router);
        this.userAPI.initialize(app, this.router);
        this.organizationAPI.initialize(app, this.router);
        this.dataSharingAPI.initialize(app, this.router);

        // Should always be last
        app.use(this.logError.bind(this));
    }

    private status(req: Request, rsp: Response) {
        rsp.status(200).json({
            status: 'OK',
            name: process.env.npm_package_name,
            version: process.env.npm_package_version
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

}

