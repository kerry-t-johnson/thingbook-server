import { ResourceListOptions } from "../../src/models/options";
import { expect } from "chai";


describe('model/options', function () {

    it('Creates default ResourceListOptions', async function () {
        const options: ResourceListOptions = new ResourceListOptions();

        expect(options.sort_field).equal('_id');
        expect(options.sort_asc).equal(true);
        expect(options.offset).equal(0);
        expect(options.limit).equal(30);
    });

    it('Creates ResourceListOptions with subset of options', async function () {
        const options: ResourceListOptions = new ResourceListOptions({ sort_field: 'foo', limit: 11 });

        expect(options.sort_field).equal('foo');
        expect(options.sort_asc).equal(true);
        expect(options.offset).equal(0);
        expect(options.limit).equal(11);
    });

});