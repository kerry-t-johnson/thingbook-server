import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import axios from "axios";
import { ThingBookError, ThingBookHttpError } from "../utils/error.utils";
import { ListQueryOptions } from "../models/options";
import { MqttClient, connect as MqttConnect } from 'mqtt';
import { StatusCodes } from "http-status-codes";

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

        const result = await axios.get(url);

        return result.data;
    }

    public async post(resource: string, data: any): Promise<any> {
        const url: string = `${this.url}/${resource}`;

        const result = await axios.post(url, data);

        return result.data;
    }

    public async list<T>(resource?: string, query?: ListQueryOptions): Promise<T[]> {
        query = query || new ListQueryOptions();

        // sensor-things uses 'id' vice '_id':
        query.sort_field = query.sort_field == '_id' ? 'id' : query.sort_field;

        const baseUrl = resource ? `${this.url}/${resource}` : this.url;
        const url: string = `${baseUrl}?\$orderby=${query.sort_field}%20${query.sort_asc ? 'asc' : 'desc'}&\$top=${query.limit}&\$skip=${query.offset}`;
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
        let query = new ListQueryOptions();

        while (true) {
            const items: any[] = await this.list(resource, query);

            for (const i of items) {
                if (i.name == name) {
                    return i;
                }
            }

            if (items.length < query.limit) {
                throw new ThingBookHttpError(StatusCodes.NOT_FOUND, `Unable to find ${resource} with name '${name}'`);
            }

            query.offset += query.limit;
        }
    }

}

export class SensorThingsMQTT {

    private static INSTANCES: { [key: string]: SensorThingsMQTT } = {};

    private logger: Logger = getLogger('SensorThingsMQTT');
    private url: string;
    private mqtt: MqttClient;
    private subscriptions: { [key: string]: Function[] } = {};

    public static getInstance(url: string, options: any = { clientId: 'ThingBook' }): SensorThingsMQTT {
        let instance: SensorThingsMQTT | undefined = SensorThingsMQTT.INSTANCES[url];
        if (!instance) {
            instance = new SensorThingsMQTT(url);
            SensorThingsMQTT.INSTANCES[url] = instance;
        }

        return instance;
    }

    private constructor(url: string, options: any = { clientId: 'ThingBook' }) {
        this.url = url;
        this.mqtt = MqttConnect(url, options);

        this.mqtt.on('connect', () => {
            this.logger.debug(`Connected to MQTT broker: ${this.url}`);
        });

        this.mqtt.on('message', this.onMessage.bind(this));
    }

    public async subscribe(topic: string, func: Function) {
        if (!(topic in this.subscriptions)) {
            this.subscriptions[topic] = [];
        }

        this.subscriptions[topic]!.push(func);

        if (this.subscriptions[topic]!.length == 1) {
            this.mqtt.subscribe(topic, (error: any, granted: any) => {
                if (error) {
                    this.logger.error(error);
                }
                else {
                    this.logger.debug(`Subscribed to ${this.url}#${topic}`);
                }
            });
        }
    }

    private async onMessage(topic: string, message: any) {
        const subscribers: Function[] = this.subscriptions[topic] ?? [];

        for (let s of subscribers) {
            s(topic, message);
        }
    }

}