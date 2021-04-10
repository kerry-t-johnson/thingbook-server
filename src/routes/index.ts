import { container } from "tsyringe";
import express, { Application as ExpressApplication, Request, Response } from 'express';
import morgan from 'morgan';
import { AbstractRoute } from './route.common';
var cors = require('cors');
import * as core from 'express-serve-static-core';
import { UserRoutes } from "./user.route";
import { OrganizationRoutes } from "./organization.route";
import { DataSharingRoutes } from "./data-sharing.route";
import { DevelopmentRoutes } from "../../development/routes/development.route";

export class Router extends AbstractRoute {

    constructor() {
        super('Router');
    }

    public async configure(app: ExpressApplication): Promise<void> {
        this.addChild(container.resolve<AbstractRoute>(UserRoutes));
        this.addChild(container.resolve<AbstractRoute>(OrganizationRoutes));
        this.addChild(container.resolve<AbstractRoute>(DataSharingRoutes));
        this.addChild(container.resolve<AbstractRoute>(DevelopmentRoutes));

        super.configure(app);

        // Should always be last
        app.use(this.logError.bind(this));
    }

    protected initialize(app: ExpressApplication) {
        if (this.config.env != 'production') {
            app.use(cors());
        }
        app.use(express.json());
        app.use(morgan("tiny", { stream: { write: this.logRequest.bind(this) } }));
        app.use(function (req, res, next) {
            req.getUrl = function (p?: string) {
                let path = req.originalUrl;
                if (p) {
                    path = `${path}/${p}`;
                }
                return new URL(path, `${req.protocol}://${req.get('host')}`);
            }
            return next();
        });
    }

    protected addRoutes(parent: core.Router): void {
        this.router.get('/status', this.status.bind(this));
        parent.use('/api/v1', this.router);
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

