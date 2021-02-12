import * as winston from 'winston';
import { container } from "tsyringe";
import { Logger } from 'winston';
import { sprintf } from 'sprintf-js';
import { Configuration } from './src/config';

export { Logger };


export function getLogger(name: String): Logger {
    const config: Configuration = container.resolve("Configuration");

    return winston.createLogger({
        level: config.logLevel,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { service: name },
        transports: [
            new winston.transports.Console({
                level: config.logLevel,
                format: winston.format.combine(
                    winston.format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss'
                    }),
                    winston.format(info => {
                        info.level = sprintf('%-5s', info.level.toUpperCase());
                        info.service = sprintf('%-20s', info.service);
                        return info;
                    })(),
                    winston.format.colorize({ all: true }),
                    winston.format.printf((info) => {
                        return `${info.timestamp} [${info.level}] ${info.service} ${info.message}`;
                    }),
                )
            })
        ]
        // transports: [
        //     //
        //     // - Write to all logs with level `info` and below to `quick-start-combined.log`.
        //     // - Write all logs error (and below) to `quick-start-error.log`.
        //     //
        //     new transports.File({ filename: 'quick-start-error.log', level: 'error' }),
        //     new transports.File({ filename: 'quick-start-combined.log' })
        // ]
    });
}
