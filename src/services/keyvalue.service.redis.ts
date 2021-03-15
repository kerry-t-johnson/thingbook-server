import * as redis from 'redis';
import { injectable } from 'tsyringe';
import { KeyValueService } from './keyvalue.service';
import { AbstractService } from './service.common';

@injectable()
export class KeyValueRedis extends AbstractService implements KeyValueService {

    private impl: redis.RedisClient;

    constructor() {
        super('KeyValue');
        this.impl = redis.createClient('redis://thingbook-redis');

        this.impl.on('connect', (err: Error) => {
            this.logger.info('Connected');
        });

        this.impl.on('ready', (err: Error) => {
            this.logger.info('Ready');
        });
    }

    async put(key: string, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.impl.set(key, value, (err: Error | null) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            })
        });
    }

    async get(key: string, default_value?: string | undefined): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            this.impl.get(key, (err: Error | null, reply: string | null) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(reply || default_value);
                }
            })
        });

    }

    async del(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.impl.del(key, (err: Error | null) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}