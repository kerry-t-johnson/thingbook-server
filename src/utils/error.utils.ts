import { StatusCodes } from "http-status-codes";

export class ThingBookError extends Error {
    public httpCode: number;

    constructor(httpCode: number, msg: string) {
        super(msg);
        this.httpCode = httpCode;
    }
}

export class EntityNotFoundError extends ThingBookError {
    constructor(entityType: string, id: any) {
        super(StatusCodes.NOT_FOUND, `${entityType} ${id} not found`);
    }
}