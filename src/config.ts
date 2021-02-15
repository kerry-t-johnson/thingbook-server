import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

export class Configuration {
    /** The HTTP/S listen port */
    port: number;

    /** The URL of the MongoDB */
    databaseURL: string;

    sessionSecret: string;

    logLevel: string;

    constructor() {
        dotenv.config();

        this.port = parseInt(process.env.PORT || '3000');
        this.databaseURL = process.env.DATABASE_URL || 'mongodb://mongo-rs-0:30000,mongo-rs-1:30001,mongo-rs-2:30002/?replicaSet=rs';
        this.sessionSecret = process.env.SESSION_SECRET || uuidv4();

        if (process.env.NODE_ENV == 'test') {
            this.logLevel = 'error';
        }
        else if (process.env.NODE_ENV == 'dev') {
            this.logLevel = 'silly';
        }
        else {
            this.logLevel = 'info';
        }
    }
}