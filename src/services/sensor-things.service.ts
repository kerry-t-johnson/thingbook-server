import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import axios from "axios";
import { ThingBookError, ThingBookHttpError } from "../utils/error.utils";
import { PaginationOptions } from 'thingbook-api';
import { MqttClient, connect as MqttConnect } from 'mqtt';
import { StatusCodes } from "http-status-codes";
const dns = require('dns');

export class SensorThingsHTTP {

    private static INSTANCES: { [key: string]: SensorThingsHTTP } = {};

    private logger: Logger = getLogger('SensorThingsHTTP');
    private url: string;

    public static getInstance(url: string | URL): SensorThingsHTTP {
        let instance: SensorThingsHTTP | undefined = SensorThingsHTTP.INSTANCES[url.toString()];

        if (!instance) {
            instance = new SensorThingsHTTP(url.toString());
            SensorThingsHTTP.INSTANCES[url.toString()] = instance;
        }

        return instance;
    }

    private constructor(url: string) {
        this.url = url;
    }

    public async get(resource: string | undefined = undefined) {
        const url: string = resource ? `${this.url}/${resource}` : this.url;

        const result = await axios.get(url, { timeout: 750 });

        return result.data;
    }

    public async post(resource: string, data: any): Promise<any> {
        const url: string = `${this.url}/${resource}`;

        const result = await axios.post(url, data);

        return result.data;
    }

    public async list<T>(resource?: string, query?: PaginationOptions): Promise<T[]> {
        query = query || new PaginationOptions();

        // sensor-things uses 'id' vice '_id':
        query.sort_field = query.sort_field == '_id' ? 'id' : query.sort_field;

        const baseUrl = resource ? `${this.url}/${resource}` : this.url;
        const url: string = `${baseUrl}?\$orderby=${query.sort_field}%20${query.sort_asc ? 'asc' : 'desc'}&\$top=${query.page_size}&\$skip=${query.page_number}`;
        this.logger.silly(url);

        return new Promise(async function (resolve, reject) {
            const result = await axios.get(url);

            if (result.data && result.data.value) {
                resolve(result.data.value);
            }
            else {
                reject(new ThingBookError(`Unable to understand Sensor Things response: ${result.data}`));
            }
        });
    }

    public async search(name: string, resource: string) {
        this.logger.debug(`Searching for '${resource}' named '${name}'`);
        let query = new PaginationOptions();

        while (true) {
            const items: any[] = await this.list(resource, query);

            for (const i of items) {
                if (i.name == name) {
                    return i;
                }
            }

            if (items.length < query.page_size) {
                throw new ThingBookHttpError(StatusCodes.NOT_FOUND, `Unable to find ${resource} with name '${name}'`);
            }

            query.page_number += query.page_size;
        }
    }

}

export class SensorThingsMQTT {

    private static INSTANCES: { [key: string]: SensorThingsMQTT } = {};

    private logger: Logger = getLogger('SensorThingsMQTT');
    readonly url: URL;
    private mqtt: MqttClient | undefined;
    private subscriptions: { [key: string]: Function[] } = {};

    public static getInstance(url: string, options: any = { clientId: 'ThingBook' }): SensorThingsMQTT {
        let instance: SensorThingsMQTT | undefined = SensorThingsMQTT.INSTANCES[url];
        if (!instance) {
            instance = new SensorThingsMQTT(url);
            SensorThingsMQTT.INSTANCES[url] = instance;
        }

        return instance;
    }

    private constructor(url: string) {
        this.url = new URL(url);

        this.preInitialize();
    }

    private preInitialize() {
        dns.resolve(this.url.hostname, this.onMqttServerResolved.bind(this));
    }

    private onMqttServerResolved(err: any, addresses: any) {
        if (err) {
            this.logger.error(err);

            setTimeout(this.preInitialize.bind(this), 30000);
        }
        else {
            this.initializeMqtt(addresses);
        }
    }

    private initializeMqtt(addresses: []) {
        this.mqtt = MqttConnect({
            clientId: 'ThingBook',
            keepalive: 10000,
            reconnectPeriod: 30000,
            connectTimeout: 10000,
            clean: false,
            servers: addresses.map(a => ({ host: a, port: parseInt(this.url.port) }))
        });

        this.mqtt.on('connect', (ack: any) => {
            this.logger.info(`Connected to MQTT broker: ${this.url}`);

            this.onConnected();
        });

        this.mqtt.on('error', (error) => {
            this.logger.warn(`Error communicating with MQTT broker: ${this.url}: ${error}`);
        });

        this.mqtt.on('reconnect', () => {
            this.logger.silly(`Reconnecting to MQTT broker: ${this.url}`);
        });

        this.mqtt.on('message', this.onMessage.bind(this));
    }

    public isConnected() {
        return this.mqtt?.connected ?? false;
    }

    public async subscribe(topic: string, func: Function) {
        if (!(topic in this.subscriptions)) {
            this.subscriptions[topic] = [];
        }

        this.subscriptions[topic]!.push(func);

        if (this.subscriptions[topic]!.length == 1 && this.mqtt) {
            this.createMqttSubscription(topic);
        }
        else {
            this.logger.debug(`Deferred subscription to ${this.url.toString()}#${topic}`);
        }
    }

    public async publish(topic: string, message: string) {
        if (this.mqtt) {
            this.mqtt.publish(topic, message);
        }
        else {
            this.logger.debug(`Unable to send message on topic '${topic}' (not connected)`);
        }
    }

    private onConnected() {
        for (const topic in this.subscriptions) {
            this.createMqttSubscription(topic);
        }
    }

    private createMqttSubscription(topic: string) {
        this.mqtt!.subscribe(topic, (error: any, granted: any) => {
            if (error) {
                this.logger.error(`Unable to subscribe to topic: ${topic}`);
                this.logger.error(error);
            }
            else {
                this.logger.debug(`Subscribed to ${this.url}#${topic}`);
            }
        });
    }

    private async onMessage(topic: string, message: any) {
        const subscribers: Function[] = this.subscriptions[topic] ?? [];

        for (let s of subscribers) {
            s(topic, message);
        }
    }

}