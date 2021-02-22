import { expect } from "chai";
import { SensorThings } from "../../src/services/sensor-things.service";

describe('SensorThings', function () {

    if (process.env.SENSOR_THINGS_TEST == 'true') {
        const baseUrl: string = 'http://mesaverde:8080';

        it('Refreshes using the base URL', async function () {
            const uut: SensorThings = new SensorThings(baseUrl);
            const urls = await uut.refresh();

            expect(urls.length).equal(8);
        });

        it('Lists resources', async function () {
            const uut: SensorThings = new SensorThings(baseUrl);
            const datastreams = await uut.listDatastreams();

            expect(datastreams.length).equal(2);
        });

        it('Searches resources based on name', async function () {
            const expectedDatastreamName = 'MCC-DataStream-001';
            const uut: SensorThings = new SensorThings(baseUrl);
            const datastream = await uut.searchDatastreams(expectedDatastreamName);

            expect(datastream.name).equal(expectedDatastreamName);
        });

        it('Retrieves a resource by ID', async function () {
            // Example: http://foo/v1.0/Datastreams(1)
            const expectedDatastreamID = 1;
            const uut: SensorThings = new SensorThings(baseUrl);
            const datastream = await uut.getDataStream(expectedDatastreamID);

            expect(datastream['@iot.id']).equal(expectedDatastreamID);
        });

    }
});