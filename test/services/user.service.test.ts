import 'reflect-metadata';
import * as faker from 'faker';
import { UserServiceImpl } from '../../src/services/user.service.impl';
import { User, UserDocument, ResourceListOptions } from '../../src/models/user.model';
import { expect } from 'chai';
import { isValidObjectId } from 'mongoose';


function createTestUser() {
    return {
        email: faker.internet.email()
    };
}



describe('UserService', function () {
    it('Creates a new User', async function () {
        const uut: UserServiceImpl = new UserServiceImpl(User);

        const testUser: any = createTestUser();
        const result: UserDocument = await uut.create(testUser, faker.internet.password());

        expect(result.email).equal(testUser.email);
        expect(result._id).to.not.be.null;
        expect(isValidObjectId(result._id)).to.be.true;
    });
    it('Will not create a duplicate User', async function () {
        const uut: UserServiceImpl = new UserServiceImpl(User);

        const testUser: any = createTestUser();
        await uut.create(testUser, faker.internet.password());

        // Cannot use this method due to the async nature:
        // expect(uut.create.bind(uut, testUser)).to.throw();

        // Instead, return the promise with an associated catch
        return uut.create(testUser, faker.internet.password())
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(409);
            })
    });
    it('Will not create an incomplete User (missing email)', async function () {
        const uut: UserServiceImpl = new UserServiceImpl(User);

        const testUser: any = createTestUser();
        const incompleteTestUser = Object.assign(testUser);
        delete incompleteTestUser.email;

        return uut.create(incompleteTestUser, faker.internet.password())
            .catch(function (error) {
                expect(error).to.have.key('httpCode');
                expect(error.httpCode).to.equal(422);
            })

    });
    it('Will list all existing Users', async function () {
        const uut: UserServiceImpl = new UserServiceImpl(User);

        const numUsers: number = 31;
        const testUsers: any[] = [];

        for (let i = 0; i < numUsers; ++i) {
            const org: any = createTestUser();
            testUsers.push(org);
            await uut.create(org, faker.internet.password());
        }

        const actual: UserDocument[] = await uut.list(new ResourceListOptions({ limit: 1000 }));

        expect(actual.length).equal(testUsers.length);
    });
    it('Will limit the number of Users returned', async function () {
        const uut: UserServiceImpl = new UserServiceImpl(User);

        const numUsers: number = 20;

        for (let i = 0; i < numUsers; ++i) {
            const org: any = createTestUser();
            await uut.create(org, faker.internet.password());
        }

        const limit = 7;
        let cumulative = 0;
        while (cumulative < numUsers) {
            const expectedCount = Math.min(limit, numUsers - cumulative);

            const actual: UserDocument[] = await uut.list(new ResourceListOptions({ offset: cumulative, limit: limit }));

            expect(actual.length).equal(expectedCount);

            cumulative += actual.length;
        }
    });
});
