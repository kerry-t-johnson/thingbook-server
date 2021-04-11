import { expect } from "chai";
import { PaginationOptions } from 'thingbook-api';
import { SensorThingsHTTP, SensorThingsMQTT } from "../../src/services/sensor-things.service";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('SensorThings', function () {

    if (process.env.SENSOR_THINGS_TEST == 'true') {
        const httpUrl: string = 'http://mesaverde:8080/v1.0';
        const mqttUrl: string = 'mqtt://mesaverde-mosquitto:1883';

        it('Refreshes using the base URL', async function () {
            const uut: SensorThingsHTTP = SensorThingsHTTP.getInstance(httpUrl);
            const urls = await uut.list();

            expect(urls.length).equal(8);
        });

        it('Lists resources', async function () {
            const uut: SensorThingsHTTP = SensorThingsHTTP.getInstance(httpUrl);
            const datastreams = await uut.list('datastreams');

            expect(datastreams.length).equal(2);
        });

        it('Searches resources based on name', async function () {
            const expectedDatastreamName = 'MCC-DataStream-001';
            const uut: SensorThingsHTTP = SensorThingsHTTP.getInstance(httpUrl);
            const datastream = await uut.search(expectedDatastreamName, 'datastreams');

            expect(datastream.name).equal(expectedDatastreamName);
        });

        it('Retrieves a resource by ID', async function () {
            // Example: http://foo/v1.0/Datastreams(1)
            const expectedDatastreamID = 'Datastreams(1)';
            const uut: SensorThingsHTTP = SensorThingsHTTP.getInstance(httpUrl);
            const datastream = await uut.get(expectedDatastreamID);

            expect(datastream['@iot.selfLink']).to.include(expectedDatastreamID);
        });

        it('Lists nested resources', async function () {
            // Example: http://foo/v1.0/Datastreams(1)/Observations
            const uut: SensorThingsHTTP = SensorThingsHTTP.getInstance(httpUrl);

            let query = new PaginationOptions({ limit: 5 });
            const data = await uut.list('Observations', query);

            expect(data.length).equal(query.limit);
        });

        it('Tries MQTT, cuz why not', async function () {
            const uut: SensorThingsMQTT = SensorThingsMQTT.getInstance(
                mqttUrl, {
                clientId: 'thingbook_' + Math.random().toString(16).substr(2, 8)
            });

            let count = 0;

            uut.subscribe('Datastreams(2)/Observations', function (topic: string, message: any) {
                console.log(message.toString())
                count++;
            });

            while (count < 5) {
                await sleep(1000);
            }
        });

    }
});