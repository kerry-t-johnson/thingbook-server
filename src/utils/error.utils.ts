export class ThingBookError extends Error {
    public httpCode: number;

    constructor(httpCode: number, msg: string) {
        super(msg);
        this.httpCode = httpCode;
    }
}