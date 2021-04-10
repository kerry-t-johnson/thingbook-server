import { Application as ExpressApplication, Router as ExpressRouter, NextFunction, Request, Response } from "express";
import { Logger, getLogger } from "../utils/logger";
import { EntityNotFoundError, ThingBookHttpError } from "../utils/error.utils";
import { StatusCodes } from "http-status-codes";
import { sha256 } from "../utils";
import { PaginationOptions } from "../../../thingbook-api/src/metadata.api";
import R = require('ramda');
import * as core from 'express-serve-static-core';
import { Configuration } from "../config";
import { container } from "tsyringe";

export class ExpressValidationError extends ThingBookHttpError {
    constructor(error: any) {
        super(StatusCodes.BAD_REQUEST, error.errors[0].msg);
        Error.captureStackTrace(this, ExpressValidationError);
    }
}


export abstract class AbstractRoute {
    protected logger: Logger;
    protected config: Configuration;
    protected children: AbstractRoute[] = [];
    protected router: ExpressRouter = ExpressRouter();

    constructor(routeName: string) {
        this.logger = getLogger(routeName);
        this.config = container.resolve("Configuration");
    }

    public addChild(child: AbstractRoute) {
        this.children.push(child);
    }

    public async configure(app: ExpressApplication): Promise<void> {
        // this.logger.silly('configure');

        await this.initialize(app);
        for (let c of this.children) {
            await c.initialize(app);
        }

        await this.addRoutes(app);
        for (let c of this.children) {
            await c.addRoutes(this.router);
        }
    }

    protected initialize(app: ExpressApplication): void {
        // this.logger.silly('initialize');
    }

    protected addRoutes(parent: core.Router) {
        // this.logger.silly('addRoutes');
    }

    protected getListOptions(req: Request): PaginationOptions {
        return new PaginationOptions({
            page_number: +R.pathOr(0, ['query', 'page_number'], req),
            page_size: +R.pathOr(50, ['query', 'page_size'], req)
        });
    }

    protected setEtag(entity: any, res: Response) {
        res.set({ 'ETag': sha256(entity.updatedAt.toLocaleString()) });
    }

    protected validateEtag(etag: string | undefined, entity: any) {
        if (!etag) {
            throw new ThingBookHttpError(StatusCodes.UNPROCESSABLE_ENTITY, `This action requires a valid ETag`);
        }

        if (etag != sha256(entity.updatedAt.toLocaleString())) {
            throw new ThingBookHttpError(StatusCodes.CONFLICT, `Entity ${entity._id} has been modified by another`);
        }
    }

    validate(req: Request) {
        // validation TBD
    }

    wrapRoute(func: Function) {
        return this.processRoute.bind(this, func.bind(this));
    }

    wrapParam(func: Function) {
        return this.processParam.bind(this, func.bind(this));
    }

    async processRoute(func: Function, req: Request, res: Response, next: NextFunction) {
        try {
            this.validate(req);
            const result = await func(req, res);

            const status = req.method == 'POST' ? StatusCodes.CREATED : StatusCodes.OK;

            if (status == StatusCodes.CREATED && result?._id) {
                res.header('Location', req.getUrl(result._id).toString());
            }

            res.status(status).json(result).end();
        }
        catch (error) {
            next(error);
        }
    }

    async processParam(func: Function, req: Request, res: Response, next: NextFunction, id: string | number, name: string) {
        try {

            const untypedReq: any = req;
            const valueKey = `${name}Value`;
            untypedReq[valueKey] = await func(req, id);

            if (!untypedReq[valueKey]) {
                throw new EntityNotFoundError(name, id);
            }

            next();
        }
        catch (error) {
            next(error);
        }
    }

    /**
     * Using morgan and winston, logs HTTP errors
     * 
     * @param err error details
     * @param req request details
     * @param res response details
     * @param next next method in the middelware
     */
    protected logError(error: any, req: Request, res: Response, next: NextFunction) {
        const errorCode = error?.statusCode || 500;
        const errorMsg = error?.message || error;

        this.logger.error(errorMsg);
        if (error?.stack) {
            this.logger.error(error.stack);
        }

        res.status(errorCode).json({ msg: errorMsg });
    }

}

