import { expect } from "chai";
import { DependencyInjection } from "../../src/dependency-injection";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from "../../src/models/data-sharing.model";
import { PaginationOptions } from 'thingbook-api';
import { DataSharingService } from "../../src/services/data-sharing.service";
import { ThingFaker } from "../thing.faker";

describe('DataSharingService', function () {

    it('Create a new DataSharingFragment', async function () {
        const uut: DataSharingService = DependencyInjection.resolve("DataSharingService");
        const testFragment = ThingFaker.createDataSharingFragment();

        const result = await uut.createDataSharingFragment(testFragment);

        expect(result.name).equal(testFragment.name);
        expect(result.text).equal(testFragment.text);
        expect(result.type).equal(testFragment.type);
    });

    it('Lists existing DataSharingFragment(s)', async function () {
        const uut: DataSharingService = DependencyInjection.resolve("DataSharingService");
        const numTestItems: number = 20;
        for (let i = 0; i < numTestItems; ++i) {
            await ThingFaker.createDataSharingFragmentEntity();
        }

        const actual: DataSharingFragmentDocument[] = await uut.listDataSharingFragments(new PaginationOptions({ limit: 1000 }));

        expect(actual.length).equal(numTestItems);

    });

    it('Create a new DataSharingTemplate', async function () {
        const uut: DataSharingService = DependencyInjection.resolve("DataSharingService");
        const testTemplate = await ThingFaker.createDataSharingTemplate();

        const result = await uut.createDataSharingTemplate(testTemplate);

        expect(result.name).equal(testTemplate.name);
        expect(result.fragments).is.lengthOf(testTemplate.fragments.length);
        for (let i = 0; i < testTemplate.fragments.length; ++i) {
            expect(result.fragments[i]).to.exist;
            expect(result.fragments[i]?._id.toString()).equal(testTemplate.fragments[i].toString());
        }
    });

    it('Lists existing DataSharingTemplate(s)', async function () {
        const uut: DataSharingService = DependencyInjection.resolve("DataSharingService");
        const numTestItems: number = 11;
        for (let i = 0; i < numTestItems; ++i) {
            await ThingFaker.createDataSharingTemplateEntity();
        }

        const actual: DataSharingTemplateDocument[] = await uut.listDataSharingTemplates(new PaginationOptions({ limit: 1000 }));

        expect(actual.length).equal(numTestItems);

    });

});
