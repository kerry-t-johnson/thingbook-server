import 'reflect-metadata';
import { UserDocument } from '../../src/models/user.model';
import { ThingFaker } from '../thing.faker';
import { container } from "tsyringe";
import { OrganizationManager } from '../../src/business/organization.manager';
import { OrganizationDocument, OrganizationRole, OrganizationRoleDocument } from '../../src/models/organization.model';
import { expect } from 'chai';

describe('OrganizationManager', function () {

    it('Creates a new Organization associated to a User', async function () {
        const testUser: UserDocument = await ThingFaker.createUserEntity();
        const testOrg: any = ThingFaker.createOrg(true);

        const uut: OrganizationManager = container.resolve("OrganizationManager");
        const result: OrganizationDocument = await uut.createOrganization(testUser, testOrg);
        const role: OrganizationRoleDocument = await OrganizationRole.findOne({
            user: testUser,
            org: result
        }).orFail();

        expect(result.name).equal(testOrg.name);
        expect(result.verification?.method).equal(testOrg.verification.method);
        expect(result.verification?.verified).to.be.false;
        expect(result.verification?.token).length.is.greaterThan(32);
        expect(String(result.verification?.user._id)).equal(String(testUser._id));
        expect(String(role.user._id)).equal(String(testUser._id));
        expect(String(role.org._id)).equal(String(result._id));
        expect(role.role).equal('OWNER');
    });

    it('Rejects a new Organization without verification.method', async function () {
        const testUser: UserDocument = await ThingFaker.createUserEntity();
        const testOrg: any = ThingFaker.createOrg();

        const uut: OrganizationManager = container.resolve("OrganizationManager");
        return uut.createOrganization(testUser, testOrg)
            .then(function (result) {
                expect.fail('Expected exception');
            })
            .catch(function (error) {
            });
    });

    it('Sanitizes results', async function () {
        const testUser: UserDocument = await ThingFaker.createUserEntity();
        const testOrg: any = ThingFaker.createOrg(true);

        const uut: OrganizationManager = container.resolve("OrganizationManager");
        await uut.createOrganization(testUser, testOrg);

        const orgs: OrganizationRoleDocument[] = await uut.getOrganizations(testUser);
        expect(orgs).to.have.lengthOf(1);
    });

});
