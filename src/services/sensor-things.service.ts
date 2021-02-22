import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import axios from "axios";
import { ThingBookError } from "../utils/error.utils";

export class SensorThings {

    private logger: Logger = getLogger('SensorThings');
    private url: string;

    constructor(url: string, version: string = 'v1.0') {
        this.url = `${url}/${version}`;
    }

    public async refresh() {
        return await this.get();
    }

    public async listDatastreams(max: number = 100) {
        return await this.list('datastreams', 100);
    }

    public async searchDatastreams(name: string) {
        return await this.search(name, 'datastreams');
    }

    public async getDataStream(id: number) {
        return await this.get(`Datastreams(${id})`, false);
    }

    private async search(name: string, resource: string) {
        const count = 20;
        let offset = 0;

        while (true) {
            const items: any[] = await this.list(resource, count, offset);

            for (const i of items) {
                if (i.name == name) {
                    return i;
                }
            }

            if (items.length < count) {
                throw new ThingBookError(`Unable to find ${resource} with name '${name}'`);
            }

            offset += count;
        }
    }

    private async list(resource: string, count: number = 10, offset: number = 0) {
        const url: string = `${this.url}/${resource}?\$top=${count}&\$skip=${offset}`;
        this.logger.silly(url);
        return await this.get(url);
    }

    private async get(resource: string | undefined = undefined, extract: boolean = true) {
        const url: string = resource ? `${this.url}/${resource}` : this.url;

        const result = await axios.get(url);

        if (!extract) {
            return result.data;
        }
        else if (result.data && result.data.value) {
            return result.data.value;
        }

        throw new ThingBookError(`Unable to understand Sensor Things response: ${result.data}`);
    }
}