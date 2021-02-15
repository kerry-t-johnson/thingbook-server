import { NextFunction, Request, Response } from "express";
import { Logger, getLogger } from "../utils/logger";
import { ThingBookError } from "../utils/error.utils";
import { StatusCodes } from "http-status-codes";
import { sha256 } from "../utils";

export class ExpressValidationError extends ThingBookError {
    constructor(error: any) {
        super(StatusCodes.BAD_REQUEST, error.errors[0].msg);
        Error.captureStackTrace(this, ExpressValidationError);
    }
}


export abstract class AbstractRoute {
    protected logger: Logger;

    constructor(routeName: string) {
        this.logger = getLogger(routeName);
    }

    protected setEtag(entity: any, res: Response) {
        res.set({ 'ETag': sha256(entity.updatedAt.toLocaleString()) });
    }

    protected validateEtag(etag: string | undefined, entity: any) {
        if (!etag) {
            throw new ThingBookError(StatusCodes.UNPROCESSABLE_ENTITY, `This action requires a valid ETag`);
        }

        if (etag != sha256(entity.updatedAt.toLocaleString())) {
            throw new ThingBookError(StatusCodes.CONFLICT, `Entity ${entity._id} has been modified by another`);
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

    processRoute(func: Function, req: Request, res: Response) {
        this.validate(req);
        func(req, res);
    }

    async processParam(func: Function, req: Request, res: Response, next: NextFunction, id: string | number) {
        try {
            await func(req, res, id);
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

