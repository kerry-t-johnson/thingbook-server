import { createLogger, format, transports, Logger } from 'winston';
import { sprintf } from 'sprintf-js';

export { Logger };

export function getLogger(name: String): Logger {
    return createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.errors({ stack: true }),
            format.splat(),
            format.json()
        ),
        defaultMeta: { service: name },
        transports: [
            new transports.Console({
                level: 'silly',
                format: format.combine(
                    format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss'
                    }),
                    format(info => {
                        info.level = sprintf('%-5s', info.level.toUpperCase());
                        info.service = sprintf('%-20s', info.service);
                        return info;
                    })(),
                    format.colorize({ all: true }),
                    format.printf((info) => {
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
