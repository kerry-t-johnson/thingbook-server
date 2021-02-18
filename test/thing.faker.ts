import * as faker from 'faker';
import { container } from "tsyringe";
import { OrganizationDocument } from '../src/models/organization.model';
import { UserDocument } from '../src/models/user.model';
import { OrganizationService } from '../src/services/organization.service';
import { UserService } from '../src/services/user.service';

export class ThingFaker {

    public static createTestUser(): any {
        return {
            email: faker.internet.email()
        };
    }

    public static createTestOrg(withVerification?: boolean): any {
        const result: any = {
            name: faker.random.words(),
            domainName: faker.random.uuid() + '.com',
            sensorThingsURL: faker.internet.url()
        };

        if (withVerification) {
            result.verification = { method: 'HTML_META_TAG' };
        }

        return result;
    }

    public static async createTestUserEntity(): Promise<UserDocument> {
        const userService: UserService = container.resolve("UserService");

        return await userService.createUser(
            <UserDocument>ThingFaker.createTestUser(),
            faker.internet.password()
        );
    }

    public static async createTestOrgEntity(): Promise<OrganizationDocument> {
        const orgService: OrganizationService = container.resolve("OrganizationService");

        return await orgService.createOrganization(<OrganizationDocument>ThingFaker.createTestOrg());
    }

}