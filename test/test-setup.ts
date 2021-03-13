import 'reflect-metadata';
import { container } from "tsyringe";
import { DependencyInjection } from '../src/dependency-injection';
import { Database } from '../src/utils/database.utils';


before(async function () {
    await DependencyInjection.initialize();
});

beforeEach(async function () {
    const db: Database = container.resolve("Database");
    await db.clear();
});

after(async function () {
    const db: Database = container.resolve("Database");
    await db.close();
});