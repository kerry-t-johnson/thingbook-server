import 'reflect-metadata';
import { container } from "tsyringe";
import { OrganizationManagerImpl } from '../src/business/organization.manager.impl';
import { Configuration } from '../src/config';
import { Organization, OrganizationRole } from '../src/models/organization.model';
import { User } from '../src/models/user.model';
import { OrganizationServiceImpl } from '../src/services/organization.service.impl';
import { UserServiceImpl } from '../src/services/user.service.impl';
import { Database } from '../src/utils/database.utils';

const config: Configuration = new Configuration();
container.register("Configuration", { useValue: config });
container.register("OrganizationModel", { useValue: Organization });
container.register("OrganizationRoleModel", { useValue: OrganizationRole });
container.register("OrganizationService", { useClass: OrganizationServiceImpl });
container.register("OrganizationManager", { useClass: OrganizationManagerImpl });
container.register("UserModel", { useValue: User });
container.register("UserService", { useClass: UserServiceImpl });

const db: Database = new Database(config);

before(async function () {
    await db.connect(true);
});

beforeEach(async function () {
    await db.clear();
});

after(async function () {
    await db.close();
});