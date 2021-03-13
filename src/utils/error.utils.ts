import { StatusCodes } from "http-status-codes";
import { CustomError } from 'ts-custom-error'

export class ThingBookError extends CustomError {

    constructor(msg: string) {
        super(msg);
    }

}

export class ThingBookHttpError extends CustomError {
    public statusCode: number;

    constructor(statusCode: number, msg: string) {
        super(msg);

        this.statusCode = statusCode;
    }
}

export class EntityNotFoundError extends ThingBookHttpError {
    constructor(entityType: string, id: any) {
        super(StatusCodes.NOT_FOUND, `${entityType} ${id} not found`);
    }
}