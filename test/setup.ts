import 'reflect-metadata';
import { container } from "tsyringe";
import { Configuration } from '../src/config';
import { Database } from '../src/utils/database.utils';

const config: Configuration = new Configuration();
container.register("Configuration", { useValue: config });

const db: Database = new Database(config);

before(async function () {
    await db.connect(true);
});

beforeEach(async function () {
    await db.clear();
});

after(async function () {
    await db.close();
});