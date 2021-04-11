import { PaginationOptions } from 'thingbook-api';
import { expect } from "chai";


describe('model/options', function () {

    it('Creates default PaginationOptions', async function () {
        const options: PaginationOptions = new PaginationOptions();

        expect(options.sort_field).equal('_id');
        expect(options.sort_asc).equal(true);
        expect(options.page_number).equal(0);
        expect(options.limit).equal(30);
    });

    it('Creates PaginationOptions with subset of options', async function () {
        const options: PaginationOptions = new PaginationOptions({ sort_field: 'foo', limit: 11 });

        expect(options.sort_field).equal('foo');
        expect(options.sort_asc).equal(true);
        expect(options.page_number).equal(0);
        expect(options.limit).equal(11);
    });

});