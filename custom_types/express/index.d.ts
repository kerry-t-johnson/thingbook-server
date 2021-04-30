


declare namespace Express {
    interface Request {
        authUser?: any;
        userValue?: any;
        orgValue?: any;
        agreementValue?: any;
        getUrl(p?: string): URL;
    }
}