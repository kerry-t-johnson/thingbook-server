import { Request, Response } from "express";
import { Logger, getLogger } from "../../logger";
import { validationResult } from 'express-validator';
import { ThingBookError } from "../utils/error.utils";
import { StatusCodes } from "http-status-codes";

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

    validate(req: Request) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ExpressValidationError(errors);
        }
    }

    wrap(func: Function) {
        return this.process.bind(this, func.bind(this));
    }

    process(func: Function, req: Request, res: Response) {
        try {
            this.validate(req);

            func(req, res);
        }
        catch (error) {
            this.onError(error, res);
        }
    }

    onError(error: any, res: Response) {
        if (error?.httpCode) {
            res.status(error.httpCode).json({ msg: error.message });
        }
        else {
            res.status(500).json({ msg: error });
        }
    }
}

