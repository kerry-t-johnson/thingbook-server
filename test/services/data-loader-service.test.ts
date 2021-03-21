import { container } from "tsyringe";
import { DataLoaderService } from "../../development/services/data-loader.service";
import * as api from "thingbook-api/lib";
import Agenda from 'agenda';
import { DataLoadRequest, DataLoadRequestDocument } from "../../development/models/data-load.model";

describe('DataLoader', function () {

    if (process.env.DATA_LOADER_TEST == 'true') {

        it('Creates a REST resource from given test data', async function () {
            const uut: DataLoaderService = container.resolve("DataLoaderService");
            const agenda: Agenda = container.resolve("agenda");

            const request: api.DataLoadRequest = {
                name: 'automated test',
                url: new URL('http://mesaverde:8080/v1.0'),
                files: ['assets/development/data/sensor-things/common-data.yml']
            };

            const dlr: api.DataLoadRequest = await uut.loadSensorThingsData(request);

            const jobs = await agenda.jobs(
                { name: "sensor-things-data-load-job" },
            );

            for (let j of jobs) {
                if (dlr._id.equals(j.attrs.data?.dataLoadRequest)) {
                    await j.run();
                    const updatedDlr: DataLoadRequestDocument =
                        await DataLoadRequest.findById(dlr._id).orFail();

                    console.log(updatedDlr);
                }
            }


            console.log('DONE');
        })

    }

});
