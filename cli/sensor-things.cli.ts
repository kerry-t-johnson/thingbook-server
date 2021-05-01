import { EntityCreationRequestFactory, SensorThingsEntityFactory } from "../development/sensor-things.dev";
import yargs = require('yargs/yargs');
import { Logger } from "winston";
import { getLogger } from "../src/utils/logger";
import { StatusCodes } from "http-status-codes";
import { delaySeconds } from "../src/utils";
import * as api from 'thingbook-api';

const LOGGER: Logger = getLogger('sensor-things.cli');

async function processYamlCommand(argv: any) {
    const factory = new EntityCreationRequestFactory();
    let queue: api.EntityCreationStatus[] = factory.fromYamlFile(...argv.file);

    // When run via Agenda, the stored data is stringified... emulate that here
    // (when we are running via CLI)  
    for (let queueItem of queue) {
        queueItem.data = JSON.stringify(queueItem.data);
        if (queueItem.dynamic !== undefined) {
            queueItem.dynamic = JSON.stringify(queueItem.dynamic);
        }
    }

    while (queue.length > 0) {
        const retries: api.EntityCreationStatus[] = [];

        const factory = new SensorThingsEntityFactory(argv.URL);
        for (let queueItem of queue) {
            const result: api.EntityCreationStatus = await factory.create(queueItem);

            switch (result.status) {
                case StatusCodes.CREATED:
                case StatusCodes.SEE_OTHER:
                    // Either way, it now exists
                    break;
                case StatusCodes.UNPROCESSABLE_ENTITY:
                case StatusCodes.PRECONDITION_FAILED:
                    retries.push(queueItem);
                    break;
                default:
                    LOGGER.error(`Unrecognized StatusCode: ${status}`);
            }
        }

        queue = retries;
        if (queue.length > 0) {
            await delaySeconds(1);
        }
    }
}


yargs(process.argv.slice(2))
    .command({
        command: 'yaml <URL> <file...>',
        aliases: ['$0'],
        describe: 'create SensorThings entities for the specified YAML file(s)',
        handler: async (argv) => { await processYamlCommand(argv) },
    })
    .demandCommand(1, 'you must specify a sub-command')
    .help()
    .argv;
