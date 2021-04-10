


declare namespace Express {
    interface Request {
        authUser?: any;
        userValue?: any;
        orgValue?: any;
        getUrl(p?: string): URL;
    }
}