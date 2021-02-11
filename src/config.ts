import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

export class Configuration {
    /** The HTTP/S listen port */
    port: number;

    /** The URL of the MongoDB */
    databaseURL: string;

    sessionSecret: string;

    constructor() {
        dotenv.config();

        this.port = parseInt(process.env.PORT || '3000');
        this.databaseURL = process.env.DATABASE_URL || 'mongodb://mongo:27017';
        this.sessionSecret = process.env.SESSION_SECRET || uuidv4();
    }
}