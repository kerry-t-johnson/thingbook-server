import 'reflect-metadata';
import * as faker from 'faker';
import { OrganizationServiceImpl } from '../../src/services/organization.service.impl';
import { Organization, OrganizationDocument, ResourceListOptions } from '../../src/models/organization.model';
import { expect } from 'chai';
import { isValidObjectId } from 'mongoose';

function createTestOrg() {
    return {
        name: faker.random.words(),
        domainName: faker.random.uuid() + '.com',
        sensorThingsURL: faker.internet.url()
    };
}


describe('OrganizationService', function () {
    it('Creates a new Organization', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = createTestOrg();
        const result: OrganizationDocument = await uut.create(testOrg);

        expect(result.name).equal(testOrg.name);
        expect(result.domainName).equal(testOrg.domainName);
        expect(result.sensorThingsURL).equal(testOrg.sensorThingsURL);
        expect(result._id).to.not.be.null;
        expect(isValidObjectId(result._id)).to.be.true;
    });
    it('Will not create a duplicate Organization', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = createTestOrg();
        await uut.create(testOrg);

        // Cannot use this method due to the async nature:
        // expect(uut.create.bind(uut, testOrg)).to.throw();

        // Instead, return the promise with an associated catch
        return uut.create(testOrg)
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(409);
            })
    });
    it('Will not create an incomplete Organization (missing name)', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = createTestOrg();
        const incompleteTestOrg = Object.assign(testOrg);
        delete incompleteTestOrg.name;

        return uut.create(incompleteTestOrg)
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(422);
            })

    });
    it('Will not create an incomplete Organization (missing domainName)', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = createTestOrg();
        const incompleteTestOrg = Object.assign(testOrg);
        delete incompleteTestOrg.domainName;

        return uut.create(incompleteTestOrg)
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(422);
            })

    });
    it('Will not create an incomplete Organization (missing sensorThingsURL)', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = createTestOrg();
        const incompleteTestOrg = Object.assign(testOrg);
        delete incompleteTestOrg.sensorThingsURL;

        return uut.create(incompleteTestOrg)
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(422);
            })
    });
    it('Will list all existing Organizations', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const numOrganizations: number = 99;
        const testOrgs: any[] = [];

        for (let i = 0; i < numOrganizations; ++i) {
            const org: any = createTestOrg();
            testOrgs.push(org);
            await uut.create(org);
        }

        const actual: OrganizationDocument[] = await uut.list(new ResourceListOptions({ limit: 1000 }));

        expect(actual.length).equal(testOrgs.length);
    });
    it('Will limit the number of Organizations returned', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const numOrganizations: number = 20;

        for (let i = 0; i < numOrganizations; ++i) {
            const org: any = createTestOrg();
            await uut.create(org);
        }

        const limit = 7;
        let cumulative = 0;
        while (cumulative < numOrganizations) {
            const expectedCount = Math.min(limit, numOrganizations - cumulative);

            const actual: OrganizationDocument[] = await uut.list(new ResourceListOptions({ offset: cumulative, limit: limit }));

            expect(actual.length).equal(expectedCount);

            cumulative += actual.length;
        }
    });
});
