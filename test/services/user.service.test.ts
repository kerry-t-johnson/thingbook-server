import 'reflect-metadata';
import * as faker from 'faker';
import { UserServiceImpl } from '../../src/services/user.service.impl';
import { UserDocument, PaginationOptions } from '../../src/models/user.model';
import { expect } from 'chai';
import { isValidObjectId } from 'mongoose';
import { ThingFaker } from '../thing.faker';
import { DependencyInjection } from '../../src/dependency-injection';



describe('UserService', function () {

    it('Creates a new User', async function () {
        const uut: UserServiceImpl = DependencyInjection.resolve("UserService");

        const testUser: any = ThingFaker.createUser();
        const result: UserDocument = await uut.createUser(testUser, faker.internet.password());

        expect(result.email).equal(testUser.email);
        expect(result._id).to.not.be.null;
        expect(isValidObjectId(result._id)).to.be.true;
    });

    it('Will not create a duplicate User', async function () {
        const uut: UserServiceImpl = DependencyInjection.resolve("UserService");

        const testUser: any = ThingFaker.createUser();
        await uut.createUser(testUser, faker.internet.password());

        // Cannot use this method due to the async nature:
        // expect(uut.create.bind(uut, testUser)).to.throw();

        // Instead, return the promise with an associated catch
        return uut.createUser(testUser, faker.internet.password())
            .then(function (result) {
                expect.fail("Expected exception");
            })
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(409);
            })
    });

    it('Will not create an incomplete User (missing email)', async function () {
        const uut: UserServiceImpl = DependencyInjection.resolve("UserService");

        const testUser: any = ThingFaker.createUser();
        const incompleteTestUser = Object.assign(testUser);
        delete incompleteTestUser.email;

        return uut.createUser(incompleteTestUser, faker.internet.password())
            .then(function (result) {
                expect.fail("Expected exception");
            })
            .catch(function (error) {
                expect(error).to.have.key('statusCode');
                expect(error.statusCode).to.equal(422);
            })

    });

    it('Will list all existing Users', async function () {
        const uut: UserServiceImpl = DependencyInjection.resolve("UserService");

        const numUsers: number = 12;
        const testUsers: any[] = [];

        for (let i = 0; i < numUsers; ++i) {
            const testUser: any = ThingFaker.createUser();
            testUsers.push(testUser);
            await uut.createUser(testUser, faker.internet.password());
        }

        const actual: UserDocument[] = await uut.listUsers(new PaginationOptions({ page_size: 1000 }));

        expect(actual.length).equal(testUsers.length);
    });

    it('Will limit the number of Users returned', async function () {
        const uut: UserServiceImpl = DependencyInjection.resolve("UserService");

        const numUsers: number = 11;

        for (let i = 0; i < numUsers; ++i) {
            const testUser: any = ThingFaker.createUser();
            await uut.createUser(testUser, faker.internet.password());
        }

        const limit = 7;
        let cumulative = 0;
        while (cumulative < numUsers) {
            const expectedCount = Math.min(limit, numUsers - cumulative);

            const actual: UserDocument[] = await uut.listUsers(new PaginationOptions({ page_number: cumulative, page_size: limit }));

            expect(actual.length).equal(expectedCount);

            cumulative += actual.length;
        }
    });
});
