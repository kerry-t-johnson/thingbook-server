import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import * as snake from 'snake-case';
import { Logger } from 'winston';
import { getLogger } from './utils/logger';

export class Configuration {
    env: string;

    /** The HTTP/S listen port */
    port: number;

    /** The URL of the MongoDB */
    databaseURL: string;

    sessionSecret: string;

    logLevel: string;

    sensorThingsApiStatusRepeatEvery: string;

    constructor() {
        this.env = process.env.NODE_ENV || 'development';

        dotenv.config({ path: `./.${this.env}.env` });

        this.port = parseInt(process.env.PORT || '3000');
        this.databaseURL = process.env.DATABASE_URL || '<NONE>';
        this.sessionSecret = process.env.SESSION_SECRET || uuidv4();
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.sensorThingsApiStatusRepeatEvery = process.env.SENSOR_THINGS_API_STATUS_REPEAT_EVERY || "15 minutes";
    }

    public print() {
        const logger: Logger = getLogger("Configuration");

        for (const [k, v] of Object.entries(this)) {
            let key = snake.snakeCase(k).toUpperCase();

            logger.debug(`${key}: ${v}`);
        }

    }
}