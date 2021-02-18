import 'reflect-metadata';
import { OrganizationServiceImpl } from '../../src/services/organization.service.impl';
import { Organization, OrganizationDocument, ResourceListOptions } from '../../src/models/organization.model';
import { expect } from 'chai';
import { isValidObjectId } from 'mongoose';
import { ThingFaker } from '../thing.faker';



describe('OrganizationService', function () {
    it('Creates a new Organization', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = ThingFaker.createTestOrg();
        const result: OrganizationDocument = await uut.createOrganization(testOrg);

        expect(result.name).equal(testOrg.name);
        expect(result.domainName).equal(testOrg.domainName);
        expect(result.sensorThingsURL).equal(testOrg.sensorThingsURL);
        expect(result._id).to.not.be.null;
        expect(isValidObjectId(result._id)).to.be.true;
    });

    it('Will not create a duplicate Organization', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = ThingFaker.createTestOrg();
        await uut.createOrganization(testOrg);

        // Cannot use this method due to the async nature:
        // expect(uut.create.bind(uut, testOrg)).to.throw();

        // Instead, return the promise with an associated catch
        return uut.createOrganization(testOrg)
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(409);
            })
    });

    it('Will not create an incomplete Organization (missing name)', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const testOrg: any = ThingFaker.createTestOrg();
        const incompleteTestOrg = Object.assign(testOrg);
        delete incompleteTestOrg.name;

        return uut.createOrganization(incompleteTestOrg)
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(422);
            })

    });

    it('Will list all existing Organizations', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const numOrganizations: number = 99;
        const testOrgs: any[] = [];

        for (let i = 0; i < numOrganizations; ++i) {
            const testOrg: any = ThingFaker.createTestOrg();
            testOrgs.push(testOrg);
            await uut.createOrganization(testOrg);
        }

        const actual: OrganizationDocument[] = await uut.list(new ResourceListOptions({ limit: 1000 }));

        expect(actual.length).equal(testOrgs.length);
    });

    it('Will limit the number of Organizations returned', async function () {
        const uut: OrganizationServiceImpl = new OrganizationServiceImpl(Organization);

        const numOrganizations: number = 20;

        for (let i = 0; i < numOrganizations; ++i) {
            const testOrg: any = ThingFaker.createTestOrg();
            await uut.createOrganization(testOrg);
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
