import { Logger } from "winston";
import { SensorThingsHTTP } from "../src/services/sensor-things.service";
import { getLogger } from "../src/utils/logger";
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import { assertIsDefined } from "../src/utils";
import * as faker from "faker";
import { ThingBookError } from "../src/utils/error.utils";
import { StatusCodes } from "http-status-codes";

enum SensorThingsResource {
    DATASTREAM_RESOURCE = 'Datastreams',
    FEATURE_RESOURCE = 'FeaturesOfInterest',
    LOCATION_RESOURCE = 'Locations',
    OBSERVED_PROPERTY_RESOURCE = 'ObservedProperties',
    SENSOR_RESOURCE = 'Sensors',
    THING_RESOURCE = 'Things',
    OBSERVATION_RESOURCE = 'Observations',
}

enum DynamicMethods {
    CURRENT_TIME = "CURRENT_TIME",
    RANDOM_BOOLEAN = "RANDOM_BOOLEAN",
}

export interface ThingBookEntityCreationRequest {
    url: string,
    resource: string,
    data: any,
    dynamic: any,
    createAt: Date
}

export class ThingBookEntityFactory {

    private logger: Logger = getLogger('ThingBookEntityFactory');

    constructor(private url: string) {

    }

    public fromYamlFile(...paths: string[]): ThingBookEntityCreationRequest[] {
        const results: ThingBookEntityCreationRequest[] = [];

        for (let p of paths) {
            this.logger.debug(`Reading entities from ${p}`)
            const contents: string = fs.readFileSync(p, 'utf-8');
            const yaml: any = jsyaml.load(contents);

            results.push(...this.fromYamlElement(yaml));
        }

        this.logger.info(`Read ${results.length} entities from ${paths.length} files`);
        return results;
    }

    public fromYamlElement(element: any): ThingBookEntityCreationRequest[] {
        const results: ThingBookEntityCreationRequest[] = [];

        if (typeof element === 'object' && element !== null) {
            for (let [key, value] of Object.entries(element)) {
                try {
                    const resource: SensorThingsResource = toSensorThingsResource(key);

                    for (let v of <any[]>value) {
                        results.push(...ThingBookEntityFactory.createRequest(this.url, resource, v));
                    }
                }
                catch (error) {
                    if (typeof value === 'object') {
                        results.push(...this.fromYamlElement(value));
                    }
                }
            }
        }

        return results;
    }

    public static createRequest(url: string, resource: string, data: any, now: Date = new Date()): ThingBookEntityCreationRequest[] {
        const results: ThingBookEntityCreationRequest[] = [];

        const repeat = data?.['sensor-things-repeat'] || { interval: 0, quantity: 1 };
        const dynamic = data?.['sensor-things-dynamic'];

        const copy = JSON.parse(JSON.stringify(data));
        delete copy['sensor-things-dynamic'];
        delete copy['sensor-things-repeat'];

        for (let i = 1; i <= repeat.quantity; ++i) {
            results.push(<ThingBookEntityCreationRequest>{
                url: url,
                resource: resource,
                data: copy,
                dynamic: dynamic,
                createAt: new Date(now.getTime() + (repeat.interval * i * 1000))
            });
        }

        return results;
    }

}

export class ThingBookEntity {

    private logger: Logger = getLogger('ThingBookEntity');
    private st: SensorThingsHTTP;

    public constructor(private createSpec: ThingBookEntityCreationRequest) {
        this.st = SensorThingsHTTP.getInstance(createSpec.url);
    }

    toString() {
        return `${this.createSpec.data?.name ? this.createSpec.data.name : '<anonymous>'} (${this.createSpec.resource})`;
    }

    async create(): Promise<number> {
        const now: Date = new Date();
        if (now < this.createSpec.createAt) {
            return StatusCodes.PRECONDITION_FAILED;
        }

        if (this.createSpec.dynamic === undefined && await this.exists(this.createSpec.resource, this.createSpec.data) !== false) {
            this.logger.silly(`${this} already exists`);
            return StatusCodes.SEE_OTHER;
        }

        const populated: boolean = await this.populate();

        if (populated === false) {
            this.logger.warn(`Creation of ${this} deferred...`);
            return StatusCodes.UNPROCESSABLE_ENTITY;
        }

        await this.st.post(this.createSpec.resource, this.createSpec.data);
        this.logger.info(`Created ${this}`);

        return StatusCodes.CREATED;
    }

    private async populate(): Promise<any> {
        for (let [key, value] of Object.entries(this.createSpec.data)) {
            const resource: SensorThingsResource | undefined = toSensorThingsResource(key, false);

            if (resource && typeof (value) === 'string') {
                this.logger.silly(`Found reference to type ${resource}`);

                const refEntity = await this.exists(resource, value);
                if (refEntity === false) {
                    return false;
                }

                this.createSpec.data[key] = refEntity;
                this.logger.silly(`Reference lookup successful: ${key} => ${refEntity['@iot.id']}`);
            }
        }

        if (this.createSpec.dynamic) {
            for (let [dKey, dValue] of Object.entries(this.createSpec.dynamic)) {
                this.createSpec.data[dKey] = ThingBookEntity.dynamicValue(dValue);
            }
        }

        return true;
    }


    public async exists(resource: string, data: any): Promise<any> {
        try {
            const name = typeof data === 'string' ? data : data.name;
            return await this.st.search(name, resource);
        }
        catch (error) {
            // this.logger.error(error);
            return false;
        }
    }

    private static dynamicValue(dynamicType: any) {
        const result = Object.values(DynamicMethods).find((x) => {
            return x === dynamicType;
        });

        switch (result) {
            case DynamicMethods.CURRENT_TIME:
                return new Date().toISOString();
            case DynamicMethods.RANDOM_BOOLEAN:
                return faker.random.boolean();
            default:
                throw new ThingBookError(`Dynamic value not implemented: ${dynamicType}`);
        }
    }

}



function toSensorThingsResource(val: string): SensorThingsResource;
function toSensorThingsResource(val: string, throwOnError: true): SensorThingsResource;
function toSensorThingsResource(val: string, throwOnError: boolean): SensorThingsResource;
function toSensorThingsResource(val: string, throwOnError: boolean = true): SensorThingsResource | undefined {
    const result: SensorThingsResource | undefined = Object.values(SensorThingsResource).find((x) => {
        if (x === val) {
            return true;
        }
        else {
            // Handle the special cases of references, which uses *singular* instead of
            // plural:
            let alt: string = x.toString();
            alt = alt.replace(/Features/, 'Feature')
                .replace(/ObservedProperties/, 'ObservedProperty')
                .replace(/s$/, '');
            return alt === val;
        }
    });

    if (throwOnError) {
        assertIsDefined(result);
    }

    return result;
}
