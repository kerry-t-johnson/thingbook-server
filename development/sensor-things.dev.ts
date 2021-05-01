import { Logger } from "winston";
import { SensorThingsHTTP } from "../src/services/sensor-things.service";
import { getLogger } from "../src/utils/logger";
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import { assertIsDefined } from "../src/utils";
import * as faker from "faker";
import { ThingBookError } from "../src/utils/error.utils";
import { StatusCodes } from "http-status-codes";
import * as api from 'thingbook-api';

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
    RANDOM_VEHICLE = "RANDOM_VEHICLE",
    RANDOM_WORDS = "RANDOM_WORDS",
}


export class EntityCreationRequestFactory {

    private logger: Logger = getLogger('EntityCreationRequestFactory');

    constructor() {
    }

    public fromYamlFile(...paths: string[]): api.EntityCreationStatus[] {
        const results: api.EntityCreationStatus[] = [];

        for (let p of paths) {
            this.logger.debug(`Reading entities from ${p}`)
            const contents: string = fs.readFileSync(p, 'utf-8');
            const yaml: any = jsyaml.load(contents);

            results.push(...this.fromYamlElement(yaml));
        }

        this.logger.info(`Read ${results.length} entities from ${paths.length} files`);
        return results;
    }

    public fromYamlElement(element: any): api.EntityCreationStatus[] {
        const results: api.EntityCreationStatus[] = [];

        if (typeof element === 'object' && element !== null) {
            for (let [key, value] of Object.entries(element)) {
                try {
                    const resource: SensorThingsResource = toSensorThingsResource(key);

                    for (let v of <any[]>value) {
                        results.push(...EntityCreationRequestFactory.createRequest(resource, v));
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

    public static createRequest(resource: string, data: any, now: Date = new Date()): api.EntityCreationStatus[] {
        const results: api.EntityCreationStatus[] = [];

        const repeat = data?.['sensor-things-repeat'] || { interval: 0, quantity: 1 };
        const dynamic = data?.['sensor-things-dynamic'];

        const copy = JSON.parse(JSON.stringify(data));
        delete copy['sensor-things-dynamic'];
        delete copy['sensor-things-repeat'];

        for (let i = 1; i <= repeat.quantity; ++i) {
            results.push(<api.EntityCreationStatus>{
                resource: resource,
                data: copy,
                dynamic: dynamic,
                createAt: new Date(now.getTime() + (repeat.interval * i * 1000))
            });
        }

        return results;
    }

}

export class SensorThingsEntityFactory {

    private logger: Logger = getLogger('SensorThingsEntityFactory');
    private st: SensorThingsHTTP;

    public constructor(url: URL | string) {
        this.st = SensorThingsHTTP.getInstance(url);
    }

    entityToString(entity: api.EntityCreationStatus, data: any) {
        return `${data.name ? data.name : '<anonymous>'} (${entity.resource})`;
    }

    async create(entity: api.EntityCreationStatus): Promise<api.EntityCreationStatus> {
        const data: any = JSON.parse(entity.data);
        const dynamic: any = entity.dynamic ? JSON.parse(entity.dynamic) : undefined;

        if (entity.status == StatusCodes.SEE_OTHER || entity.status == StatusCodes.CREATED) {
            return entity;
        }

        const now: Date = new Date();
        if (entity.createAt && now < entity.createAt) {
            entity.status = StatusCodes.PRECONDITION_FAILED;
            return entity;
        }

        if (dynamic === undefined && await this.exists(entity.resource, data) !== false) {
            this.logger.silly(`${this.entityToString(entity, data)} already exists`);
            entity.status = StatusCodes.SEE_OTHER;
            return entity;
        }

        const populated: boolean = await this.populate(data, dynamic);

        if (populated === false) {
            this.logger.warn(`Creation of ${this.entityToString(entity, data)} deferred...`);
            entity.status = StatusCodes.UNPROCESSABLE_ENTITY;
            return entity;
        }

        await this.st.post(entity.resource, data);
        this.logger.info(`Created ${this.entityToString(entity, data)}`);

        entity.status = StatusCodes.CREATED;
        return entity;
    }

    private async populate(data: any, dynamic: any): Promise<any> {
        for (let [key, value] of Object.entries(data)) {
            const resource: SensorThingsResource | undefined = toSensorThingsResource(key, false);

            if (resource && typeof (value) === 'string') {
                this.logger.silly(`Found reference to type ${resource}`);

                const refEntity = await this.exists(resource, value);
                if (refEntity === false) {
                    return false;
                }

                data[key] = refEntity;
                this.logger.silly(`Reference lookup successful: ${key} => ${refEntity['@iot.id']}`);
            }
        }

        if (dynamic) {
            for (let [dKey, dValue] of Object.entries(dynamic)) {
                data[dKey] = SensorThingsEntityFactory.dynamicValue(dValue);
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
                return faker.datatype.boolean();
            case DynamicMethods.RANDOM_VEHICLE:
                return faker.vehicle.vehicle();
            case DynamicMethods.RANDOM_WORDS:
                return faker.lorem.words(3);
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
