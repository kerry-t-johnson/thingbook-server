import { ListQueryOptions } from "../../src/models/options";
import { expect } from "chai";


describe('model/options', function () {

    it('Creates default ListQueryOptions', async function () {
        const options: ListQueryOptions = new ListQueryOptions();

        expect(options.sort_field).equal('_id');
        expect(options.sort_asc).equal(true);
        expect(options.offset).equal(0);
        expect(options.limit).equal(30);
    });

    it('Creates ListQueryOptions with subset of options', async function () {
        const options: ListQueryOptions = new ListQueryOptions({ sort_field: 'foo', limit: 11 });

        expect(options.sort_field).equal('foo');
        expect(options.sort_asc).equal(true);
        expect(options.offset).equal(0);
        expect(options.limit).equal(11);
    });

});