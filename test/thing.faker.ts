import * as faker from 'faker';
import { container } from "tsyringe";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from '../src/models/data-sharing.model';
import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument } from '../src/models/organization.model';
import { UserDocument } from '../src/models/user.model';
import { DataSharingService } from '../src/services/data-sharing.service';
import { OrganizationService } from '../src/services/organization.service';
import { UserService } from '../src/services/user.service';
import { enumValues, getRandomInt, getRandomIntRange } from '../src/utils';
import * as api from 'thingbook-api';

export class ThingFaker {

    public static createUser(): any {
        return {
            email: faker.internet.email()
        };
    }

    public static createOrg(withVerification?: boolean): any {
        const result: any = {
            name: faker.random.words(),
            domainName: faker.datatype.uuid() + '.com',
            sensorThingsAPI: faker.internet.url(),
            sensorThingsMQTT: faker.internet.url(),
        };

        if (withVerification) {
            result.verification = { method: 'HTML_META_TAG' };
        }

        return result;
    }

    public static createDataSharingFragment(): any {
        return {
            name: faker.random.words(),
            text: faker.lorem.sentences(),
            type: enumValues(api.DataSharingFragmentType)[getRandomInt(3)]
        };
    }

    public static async createDataSharingTemplate(): Promise<any> {
        const fragments: DataSharingFragmentDocument[] = [];
        for (let i = 0; i < getRandomIntRange(3, 6); ++i) {
            fragments.push(await ThingFaker.createDataSharingFragmentEntity());
        }

        return Promise.resolve({
            name: faker.random.words(),
            fragments: fragments.map((f) => f._id)
        });
    }

    public static async createOrganizationDataSharingTemplate(org?: OrganizationDocument): Promise<any> {
        const testOrg = org || await ThingFaker.createOrgEntity();
        const testTemplate = await ThingFaker.createDataSharingTemplateEntity();

        return Promise.resolve({
            name: faker.random.words(),
            org: testOrg._id,
            template: testTemplate._id,
            auto: true,
        });
    }

    public static async createOrganizationDataSharingAgreement(
        producer?: OrganizationDocument,
        consumers?: OrganizationDocument[],
        template?: OrganizationDataSharingTemplateDocument): Promise<any> {
        const testProducer = producer ?? await ThingFaker.createOrgEntity();
        const testConsumers = consumers ?? [await ThingFaker.createOrgEntity()];
        const testTemplate = template ?? await ThingFaker.createOrganizationDataSharingTemplateEntity(testProducer);

        return Promise.resolve({
            name: faker.random.words(),
            producer: testProducer._id,
            consumers: testConsumers.map((c) => c.id),
            commenceDate: faker.date.recent(),
            expirationDate: faker.date.future(),
            state: api.OrganizationDataSharingAgreementState.ACTIVE.toString(),
            template: testTemplate._id
        });
    }

    public static async createUserEntity(): Promise<UserDocument> {
        const userService: UserService = container.resolve("UserService");

        return await userService.createUser(
            <UserDocument>ThingFaker.createUser(),
            faker.internet.password()
        );
    }

    public static async createOrgEntity(): Promise<OrganizationDocument> {
        const orgService: OrganizationService = container.resolve("OrganizationService");

        return await orgService.createOrganization(<OrganizationDocument>ThingFaker.createOrg());
    }

    public static async createDataSharingFragmentEntity(): Promise<DataSharingFragmentDocument> {
        const dataSvc: DataSharingService = container.resolve("DataSharingService");

        return await dataSvc.createDataSharingFragment(<DataSharingFragmentDocument>ThingFaker.createDataSharingFragment());
    }

    public static async createDataSharingTemplateEntity(): Promise<DataSharingTemplateDocument> {
        const dataSvc: DataSharingService = container.resolve("DataSharingService");
        const templateData = await ThingFaker.createDataSharingTemplate();

        return await dataSvc.createDataSharingTemplate(<DataSharingTemplateDocument>templateData);
    }

    public static async createOrganizationDataSharingTemplateEntity(org?: OrganizationDocument): Promise<OrganizationDataSharingTemplateDocument> {
        const orgSvc: OrganizationService = container.resolve("OrganizationService");
        const template = await ThingFaker.createOrganizationDataSharingTemplate(org);

        return await orgSvc.createOrganizationDataSharingTemplate(template);
    }

    public static async createOrganizationDataSharingAgreementEntity(
        producer?: OrganizationDocument,
        consumers?: OrganizationDocument[],
        template?: OrganizationDataSharingTemplateDocument): Promise<OrganizationDataSharingAgreementDocument> {
        const orgSvc: OrganizationService = container.resolve("OrganizationService");
        const agreement = await ThingFaker.createOrganizationDataSharingAgreement(producer, consumers, template);

        return await orgSvc.createOrganizationDataSharingAgreement(agreement);
    }
}
