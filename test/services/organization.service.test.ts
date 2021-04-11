import 'reflect-metadata';
import { OrganizationDocument } from '../../src/models/organization.model';
import { PaginationOptions, PaginatedResults } from 'thingbook-api';
import { expect } from 'chai';
import { isValidObjectId } from 'mongoose';
import { ThingFaker } from '../thing.faker';
import { OrganizationService } from '../../src/services/organization.service';
import { DependencyInjection } from '../../src/dependency-injection';



describe('OrganizationService', function () {
    it('Creates a new Organization', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const testOrg: any = ThingFaker.createOrg();
        const result: OrganizationDocument = await uut.createOrganization(testOrg);

        expect(result.name).equal(testOrg.name);
        expect(result.domainName).equal(testOrg.domainName);
        expect(result.sensorThingsAPI).equal(testOrg.sensorThingsAPI);
        expect(result._id).to.not.be.null;
        expect(isValidObjectId(result._id)).to.be.true;
    });

    it('Will not create a duplicate Organization', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const testOrg: any = ThingFaker.createOrg();
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
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const testOrg: any = ThingFaker.createOrg();
        const incompleteTestOrg = Object.assign(testOrg);
        delete incompleteTestOrg.name;

        return uut.createOrganization(incompleteTestOrg)
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(422);
            })

    });

    it('Will list all existing Organizations', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const numOrganizations: number = 99;
        const testOrgs: any[] = [];

        for (let i = 0; i < numOrganizations; ++i) {
            const testOrg: any = ThingFaker.createOrg();
            testOrgs.push(testOrg);
            await uut.createOrganization(testOrg);
        }

        const actual: PaginatedResults<OrganizationDocument> = await uut.listOrganizations(new PaginationOptions({ page_size: 1000 }));

        expect(actual.items.length).equal(testOrgs.length);
    });

    it('Will limit the number of Organizations returned', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const numOrganizations: number = 20;

        for (let i = 0; i < numOrganizations; ++i) {
            const testOrg: any = ThingFaker.createOrg();
            await uut.createOrganization(testOrg);
        }

        const limit = 7;
        let cumulative = 0;
        let page = 0;
        while (cumulative < numOrganizations) {
            const expectedCount = Math.min(limit, numOrganizations - cumulative);

            const actual: PaginatedResults<OrganizationDocument> = await uut.listOrganizations(new PaginationOptions({ page_number: page, page_size: limit }));

            expect(actual.items.length).equal(expectedCount);

            cumulative += actual.items.length;
            page++;
        }
    });

    it('Will find an Organization by name', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const testOrg: OrganizationDocument = await ThingFaker.createOrgEntity();

        const found: OrganizationDocument = await uut.findOrganization(testOrg.name);

        expect(found.name).equal(testOrg.name);
        expect(found._id.toString()).equal(testOrg._id.toString());
    });

    it('Will find an Organization by ID', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const testOrg: OrganizationDocument = await ThingFaker.createOrgEntity();

        const found: OrganizationDocument = await uut.findOrganization(testOrg._id);

        expect(found.name).equal(testOrg.name);
        expect(found._id.toString()).equal(testOrg._id.toString());
    });

    it('Will throw if unable to find an Organization by name or ID', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        return uut.findOrganization('foo-bar')
            .then(function (result) {
                expect.fail("Expected exception");
            })
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(404);
            });
    });

    it('Creates an Organization Data Sharing Template', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");
        const testTemplate = await ThingFaker.createOrganizationDataSharingTemplate();

        const result = await uut.createOrganizationDataSharingTemplate(testTemplate);

        expect(result.name).equal(testTemplate.name);
        expect(result.org._id.toString()).equal(testTemplate.org.toString());
        expect(result.template._id.toString()).equal(testTemplate.template.toString());
    });

    it('Lists Organization Data Sharing Templates', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const numTestItems = 7;
        const testOrg = await ThingFaker.createOrgEntity();
        const testTemplates = [];
        for (let i = 0; i < numTestItems; ++i) {
            testTemplates.push(await ThingFaker.createOrganizationDataSharingTemplateEntity(testOrg));
        }

        const result = await uut.listOrganizationDataSharingTemplates(testOrg);

        expect(result.length).equal(testTemplates.length).equal(numTestItems);
        for (let i = 0; i < numTestItems; ++i) {
            expect(result[i]?.name, 'name').equal(testTemplates[i]?.name);
        }
    });

    it('Creates an Organization Data Sharing Agreement', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");
        const testAgreement = await ThingFaker.createOrganizationDataSharingAgreement();

        const result = await uut.createOrganizationDataSharingAgreement(testAgreement);

        expect(result.name).equal(testAgreement.name);
        expect(result.producer._id.toString()).equal(testAgreement.producer.toString());
        expect(result.consumer._id.toString()).equal(testAgreement.consumer.toString());
    });

    it('Lists Organization Data Sharing Agreements', async function () {
        const uut: OrganizationService = DependencyInjection.resolve("OrganizationService");

        const numTestItems = 7;
        const testProducer = await ThingFaker.createOrgEntity();
        const testAgreements = [];
        for (let i = 0; i < numTestItems; ++i) {
            testAgreements.push(await ThingFaker.createOrganizationDataSharingAgreementEntity(testProducer));
        }

        const result = await uut.listOrganizationDataSharingAgreements(testProducer);

        expect(result.length).equal(testAgreements.length).equal(numTestItems);
        for (let i = 0; i < numTestItems; ++i) {
            expect(result[i]?.name, 'name').equal(testAgreements[i]?.name);
        }
    });

});
