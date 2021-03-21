import "reflect-metadata";
import { container, instanceCachingFactory } from "tsyringe";
import { Configuration } from "./config";
import { OrganizationServiceImpl } from "./services/organization.service.impl";
import { UserServiceImpl } from "./services/user.service.impl";
import { OrganizationManagerImpl } from "./business/organization.manager.impl";
import { DataSharingServiceImpl } from "./services/data-sharing.service.impl";
import { Database } from "./utils/database.utils";
import { ThingBookError } from "./utils/error.utils";
import { EventService } from './services/event-service';
import { OrganizationManager } from "./business/organization.manager";
import { SocketService } from './services/socket.service';
import { KeyValueRedis } from "./services/keyvalue.service.redis";
import { DataLoaderService } from "../development/services/data-loader.service";
import Agenda from "agenda";

export class DependencyInjection {
    private static config: Configuration = new Configuration();
    private static db: Database | undefined;
    private static agenda: Agenda | undefined;
    private static es: EventService | undefined;
    private static io: SocketService | undefined;

    public static async initialize() {
        if (DependencyInjection.db) {
            throw new ThingBookError('Illegal state: already initialized');
        }
        container.register("Configuration", { useValue: DependencyInjection.config });

        DependencyInjection.db = new Database(DependencyInjection.config);
        await this.db?.connect();

        container.register("Database", { useValue: DependencyInjection.db });

        DependencyInjection.agenda = new Agenda({
            db: {
                address: DependencyInjection.config.databaseURL,
                collection: 'agenda-jobs',
                options: {
                    useUnifiedTopology: true
                }
            }
        });
        await DependencyInjection.agenda.start();

        container.register("agenda", { useValue: DependencyInjection.agenda });

        // Dependency Injection - Event Service
        DependencyInjection.es = new EventService();
        container.register("EventService", { useValue: DependencyInjection.es });

        DependencyInjection.io = new SocketService();
        container.register("SocketService", { useValue: DependencyInjection.io });

        // Dependency Injection - Organization (Service, Manager)
        container.register("OrganizationService", { useClass: OrganizationServiceImpl });
        container.register("OrganizationManager", { useFactory: instanceCachingFactory<OrganizationManager>((c) => c.resolve(OrganizationManagerImpl)) });

        // Dependency Injection - User (Model, Service)
        container.register("UserService", { useClass: UserServiceImpl });

        // Dependency Injection - Data Sharing (Models, Service)
        container.register("DataSharingService", { useClass: DataSharingServiceImpl })

        container.register("KeyValue", { useClass: KeyValueRedis });

        container.register("DataLoaderService", { useClass: DataLoaderService });

        this.config.print();
    }

    public static resolve<T>(svc: string): T {
        return container.resolve(svc);
    }
}