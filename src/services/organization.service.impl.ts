import { Organization, OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplate, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationRole, OrganizationRoleDocument, OrganizationSensorThingsStatus, OrganizationSensorThingsStatusDocument } from '../models/organization.model';
import { OrganizationService } from './organization.service';
import { injectable, container } from 'tsyringe';
import { AbstractService } from './service.common';
import { assertIsValidObjectId, Database } from '../utils/database.utils';
import mongoose = require('mongoose');
import { ThingBookHttpError } from '../utils/error.utils';
import { StatusCodes } from 'http-status-codes';
import * as api from 'thingbook-api';
import { SocketService } from './socket.service';
import { Namespace } from 'socket.io';
import { EventService } from './event-service';
import Agenda, { Job } from 'agenda';
import { Logger } from 'winston';
import { getLogger } from '../utils/logger';
import { Configuration } from '../config';
import { SensorThingsMQTT } from './sensor-things.service';
import { format } from 'fecha';

const ORG_WS_NAMESPACE_SELECTOR: RegExp = /^\/organization\/(\w+)/;
const DATA_SHARING_AGREEMENT_WS_NAMESPACE_SELECTOR: RegExp = /^\/data-sharing-agreement\/(\w+)/;

@injectable()
export class OrganizationServiceImpl extends AbstractService implements OrganizationService {

    private orgObservers: { [key: string]: OrganizationWebsocketSender } = {};
    private dsaObservers: { [key: string]: DataSharingAgreementWebsocketSender } = {};

    constructor() {
        super("OrganizationService");

        const socketSvc: SocketService = container.resolve("SocketService");

        const orgWsNamespace = socketSvc.registerNamespace(ORG_WS_NAMESPACE_SELECTOR);
        orgWsNamespace.on(`${ORG_WS_NAMESPACE_SELECTOR}:created`, (value: Namespace) => {
            this.orgObservers[value.name] = new OrganizationWebsocketSender(value);
        });
        orgWsNamespace.on(`${ORG_WS_NAMESPACE_SELECTOR}:destroyed`, (value) => {
            this.orgObservers[value.name]?.destroy();
            delete this.orgObservers[value.name];
        });

        const dsaWsNamespace = socketSvc.registerNamespace(DATA_SHARING_AGREEMENT_WS_NAMESPACE_SELECTOR);
        dsaWsNamespace.on(`${DATA_SHARING_AGREEMENT_WS_NAMESPACE_SELECTOR}:created`, (value: Namespace) => {
            this.dsaObservers[value.name] = new DataSharingAgreementWebsocketSender(value);
        });
        dsaWsNamespace.on(`${DATA_SHARING_AGREEMENT_WS_NAMESPACE_SELECTOR}:destroyed`, (value) => {
            this.dsaObservers[value.name]?.destroy();
            delete this.dsaObservers[value.name];
        });
    }

    public async findOrganization(idOrName: string | number): Promise<OrganizationDocument> {
        const foundByName = await Organization.findOne({ name: idOrName.toString() }).exec();

        if (foundByName) {
            return foundByName;
        }

        assertIsValidObjectId(idOrName);
        const foundById = await Organization.findById(idOrName).exec();

        if (foundById) {
            return foundById;
        }

        throw new ThingBookHttpError(StatusCodes.NOT_FOUND, `Unable to find Organization: ${idOrName}`);
    }

    public async listOrganizations(options?: api.PaginationOptions): Promise<api.PaginatedResults<OrganizationDocument>> {
        return Organization.list(options);
    }

    public async createOrganization(org: OrganizationDocument, session?: mongoose.ClientSession | null): Promise<OrganizationDocument> {
        session = session || null;
        try {
            org.name = org.name?.trim();
            org.domainName = org.domainName?.trim();
            org.sensorThingsAPI = org.sensorThingsAPI?.trim();
            org.sensorThingsMQTT = org.sensorThingsMQTT?.trim();

            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await Organization.create([org], { session: session });

            this.logger.info("Created Organization %s", org.name);

            return await Organization.findOne({ domainName: org.domainName }).session(session).orFail();
        }
        catch (error) {
            throw Database.createException("Organization", error);
        }
    }

    public async createOrganizationRole(orgRole: OrganizationRoleDocument, session: mongoose.ClientSession | null = null): Promise<OrganizationRoleDocument> {

        try {
            await OrganizationRole.create([orgRole], { session: session });

            this.logger.info("Created OrganizationRole: %s", orgRole);

            return await OrganizationRole.findOne({
                user: orgRole.user?._id,
                org: orgRole.org._id,
                role: orgRole.role
            }).populate('user').populate('org').session(session).orFail();
        }
        catch (error) {
            throw Database.createException("OrganizationRole", error);
        }
    }

    public async listOrganizationDataSharingTemplates(
        org: OrganizationDocument,
        options?: api.PaginationOptions): Promise<OrganizationDataSharingTemplateDocument[]> {

        options = options || new api.PaginationOptions();
        return await OrganizationDataSharingTemplate.find({ org: org._id })
            .sort(options.asSortCriteria())
            .skip(options.page_number * options.page_size)
            .limit(options.page_size)
            .populate('org', '-verification')
            .populate('template')
            .exec();
    }


    public async createOrganizationDataSharingTemplate(
        template: OrganizationDataSharingTemplateDocument,
        session: mongoose.ClientSession | null = null): Promise<OrganizationDataSharingTemplateDocument> {

        try {
            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            await OrganizationDataSharingTemplate.create([template], { session: session });

            this.logger.info("Created Organization DataSharingTemplate: %s", template.name || template.template.name);

            return await OrganizationDataSharingTemplate.findOne({ org: template.org, template: template.template })
                .populate('org', '-verification')
                .populate('template')
                .session(session)
                .orFail();
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingTemplate", error);
        }
    }

    public async findAgreement(idOrName: string | number): Promise<OrganizationDataSharingAgreementDocument> {
        const foundByName = await OrganizationDataSharingAgreement.findOne({ name: idOrName.toString() })
            .populate('producer', '-verification')
            .populate('consumers', '-verification')
            .populate({
                // Organization's template member of the Agreement:
                path: 'template',
                populate: {
                    // Base template:
                    path: 'template',
                    populate: {
                        path: 'fragments'
                    }
                }
            })
            .exec();

        if (foundByName) {
            return foundByName;
        }

        assertIsValidObjectId(idOrName);
        const foundById = await OrganizationDataSharingAgreement.findById(idOrName)
            .populate('producer', '-verification')
            .populate('consumers', '-verification')
            .populate({
                // Organization's template member of the Agreement:
                path: 'template',
                populate: {
                    // Base template:
                    path: 'template',
                    populate: {
                        path: 'fragments'
                    }
                }
            })
            .exec();

        if (foundById) {
            return foundById;
        }

        throw new ThingBookHttpError(StatusCodes.NOT_FOUND, `Unable to find Data Sharing Agreement: ${idOrName}`);
    }

    public async listAllOrganizationDataSharingAgreements(options?: api.PaginationOptions): Promise<api.PaginatedResults<OrganizationDataSharingAgreementDocument>> {
        const localPagination = options || new api.PaginationOptions();

        return new Promise<api.PaginatedResults<OrganizationDataSharingAgreementDocument>>(async (resolve, reject) => {
            try {
                const results = await OrganizationDataSharingAgreement.find()
                    .sort(localPagination.asSortCriteria())
                    .skip(localPagination.page_number * localPagination.page_size)
                    .limit(localPagination.page_size)
                    .populate('producer', '-verification')
                    .populate('consumers', '-verification')
                    .populate({
                        // Organization's template member of the Agreement:
                        path: 'template',
                        populate: {
                            // Base template:
                            path: 'template',
                            populate: {
                                path: 'fragments'
                            }
                        }
                    })
                    .exec();

                const totalCount: number = await OrganizationDataSharingAgreement.estimatedDocumentCount();

                resolve(new api.PaginatedResults<OrganizationDataSharingAgreementDocument>(results, api.PaginationStatus.fromPaginationOptions(localPagination, totalCount)));
            }
            catch (error) {
                reject(error);
            }
        });
    }

    public async listOrganizationDataSharingAgreements(
        org: OrganizationDocument,
        role?: string,
        options?: api.PaginationOptions): Promise<api.PaginatedResults<OrganizationDataSharingAgreementDocument>> {

        const localPagination = options || new api.PaginationOptions();
        const producerMatch = { producer: org._id };
        const consumerMatch = { consumers: { $elemMatch: { $eq: mongoose.Types.ObjectId(org._id) } } };
        const eitherMatch = { $or: [producerMatch, consumerMatch] };
        const localMatcher = role == 'producer' ? producerMatch : (role == 'consumer' ? consumerMatch : eitherMatch);

        return new Promise<api.PaginatedResults<OrganizationDataSharingAgreementDocument>>(async (resolve, reject) => {
            try {
                const results = await OrganizationDataSharingAgreement.find(localMatcher)
                    .sort(localPagination.asSortCriteria())
                    .skip(localPagination.page_number * localPagination.page_size)
                    .limit(localPagination.page_size)
                    .populate('producer', '-verification')
                    .populate('consumers', '-verification')
                    .populate({
                        // Organization's template member of the Agreement:
                        path: 'template',
                        populate: {
                            // Base template:
                            path: 'template',
                            populate: {
                                path: 'fragments'
                            }
                        }
                    })
                    .exec();

                const totalCount: number = await OrganizationDataSharingAgreement.countDocuments(localMatcher);

                resolve(new api.PaginatedResults<OrganizationDataSharingAgreementDocument>(results, api.PaginationStatus.fromPaginationOptions(localPagination, totalCount)));
            }
            catch (error) {
                reject(error);
            }
        });
    }

    public async createOrganizationDataSharingAgreement(
        agreement: OrganizationDataSharingAgreementDocument,
        session: mongoose.ClientSession | null = null): Promise<OrganizationDataSharingAgreementDocument> {

        try {
            agreement = new OrganizationDataSharingAgreement(agreement);
            await agreement.populate('consumers').populate('producer').execPopulate();

            // Create the Plant UML diagram links:
            agreement.imageURL = DataSharingAgreementUmlImageUrl(agreement);
            agreement.extraImageURLs = {};
            for (const action of ['publish']) {
                agreement.extraImageURLs[action] = DataSharingAgreementUmlImageUrl(agreement, action);
            }

            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            const result: OrganizationDataSharingAgreementDocument[] = await OrganizationDataSharingAgreement.create([agreement], { session: session });
            this.logger.info("Created Organization DataSharingAgreement: %s", agreement.name);

            return OrganizationDataSharingAgreement.findById(result[0]?._id)
                .populate('producer', '-verification')
                .populate('consumers', '-verification')
                .populate({
                    // Organization's template member of the Agreement:
                    path: 'template',
                    populate: {
                        // Base template:
                        path: 'template',
                        populate: {
                            path: 'fragments'
                        }
                    }
                })
                .session(session)
                .orFail()
                .exec();
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingAgreement", error);
        }
    }


    public async updateOrganizationDataSharingAgreement(
        agreement: OrganizationDataSharingAgreementDocument,
        session: mongoose.ClientSession | null = null): Promise<OrganizationDataSharingAgreementDocument> {

        try {
            // Create the Plant UML diagram links:
            agreement.imageURL = DataSharingAgreementUmlImageUrl(agreement);

            for (const action of ['publish']) {
                agreement.extraImageURLs[action] = DataSharingAgreementUmlImageUrl(agreement, action);
            }

            // Note the syntax which is used to create multiple.
            // This syntax must be used with transactions.
            const result: OrganizationDataSharingAgreementDocument = await agreement.save();
            this.logger.info("Updated Organization DataSharingAgreement: %s", agreement.name);

            return OrganizationDataSharingAgreement.findById(result._id)
                .populate('producer', '-verification')
                .populate('consumers', '-verification')
                .populate({
                    // Organization's template member of the Agreement:
                    path: 'template',
                    populate: {
                        // Base template:
                        path: 'template',
                        populate: {
                            path: 'fragments'
                        }
                    }
                })
                .session(session)
                .orFail()
                .exec();
        }
        catch (error) {
            throw Database.createException("OrganizationDataSharingAgreement", error);
        }
    }


    public async updateSensorThingsStatus(
        status: OrganizationSensorThingsStatusDocument,
        session?: mongoose.ClientSession): Promise<OrganizationSensorThingsStatusDocument> {

        return await OrganizationSensorThingsStatus.findOneAndUpdate({
            org: status.org._id
        }, status, {
            new: true,
            session: session,
            upsert: true
        });

    }
}

class OrganizationWebsocketSender {

    private logger: Logger;
    private orgId: string;
    private eventListener: (...args: any[]) => void;
    private mqtt: SensorThingsMQTT | undefined;

    constructor(private namespace: Namespace) {
        const eventSvc: EventService = container.resolve("EventService");
        const orgMatch = ORG_WS_NAMESPACE_SELECTOR.exec(namespace.name);
        this.orgId = orgMatch![1]!.toString();

        Organization.findById(this.orgId, (error: any, org: OrganizationDocument) => {
            if (error) {
                this.logger.error(error);
            }
            else {
                this.mqtt = SensorThingsMQTT.getInstance(org.sensorThingsMQTT);
            }
        });

        this.logger = getLogger(namespace.name);
        this.eventListener = this.onEvent.bind(this);

        this.updateAgenda('5 seconds');

        eventSvc.listen('sensor-things-api.updated', this.eventListener);
    }

    public destroy() {
        const config: Configuration = container.resolve("Configuration");
        const eventSvc: EventService = container.resolve("EventService");

        eventSvc.stopListening('sensor-things-api.updated', this.eventListener);
        this.updateAgenda(config.sensorThingsApiStatusRepeatEvery);
    }

    private updateAgenda(newInterval: string) {
        const agenda: Agenda = container.resolve("agenda");
        agenda.jobs({ name: 'sensor-things-api-status', data: { org: mongoose.Types.ObjectId(this.orgId) } })
            .then(jobs => {
                jobs.forEach((value: Job) => {
                    value.run()
                        .then((job) => {
                            job.repeatEvery(newInterval);
                            job.computeNextRunAt();
                            job.save()
                                .then((job) => {
                                    this.logger.debug(`Updated job to repeat every ${job.attrs.repeatInterval}`);
                                })
                                .catch((error) => this.logger.error(error));
                        });
                });
            });
    }

    private onEvent(event: any) {
        const { org, api, status } = event;

        if (org == this.orgId) {
            const now: Date = new Date();
            this.logger.debug(`Emit sensor-things-api for ${event.api}`);
            this.namespace.emit(
                'sensor-things-api', {
                name: api,
                status: status.reachable,
                date: format(now, 'isoDateTime'),
            });

            if (this.mqtt !== undefined) {
                this.logger.debug(`Emit sensor-things-mqtt for ${this.mqtt.url}`);
                this.namespace.emit('sensor-things-mqtt', {
                    name: this.mqtt.url,
                    status: this.mqtt.isConnected(),
                    date: format(now, 'isoDateTime'),
                });
            }
        }
    }

}


class DataSharingAgreementWebsocketSender {

    private logger: Logger;
    private dsaId: string;
    private observationEventListener: (...args: any[]) => void;
    private metricsEventListener: (...args: any[]) => void;

    constructor(private namespace: Namespace) {
        const eventSvc: EventService = container.resolve("EventService");
        const orgMatch = DATA_SHARING_AGREEMENT_WS_NAMESPACE_SELECTOR.exec(namespace.name);
        this.dsaId = orgMatch![1]!.toString();


        this.logger = getLogger(namespace.name);
        this.observationEventListener = this.onObservationEvent.bind(this);
        this.metricsEventListener = this.onMetricsEvent.bind(this);

        eventSvc.listen('sensor-things-observation', this.observationEventListener);
        eventSvc.listen('data-sharing-agreement.metrics', this.metricsEventListener);
    }

    public destroy() {
        const eventSvc: EventService = container.resolve("EventService");
        eventSvc.stopListening('sensor-things-observation', this.observationEventListener);
        eventSvc.stopListening('data-sharing-agreement.metrics', this.metricsEventListener);
    }

    private onObservationEvent(event: any) {
        const { sourceId, sourceURL, topic, data } = event;

        if (sourceId == this.dsaId) {
            const now: Date = new Date();
            this.logger.debug(`Emit sensor-things-observation for ${sourceURL}`);
            this.namespace.emit(
                'sensor-things-observation', {
                topic: topic,
                observation: data,
                date: format(now, 'isoDateTime'),
            });
        }
    }

    private onMetricsEvent(event: any) {
        const { sourceId, data } = event;

        if (sourceId == this.dsaId) {
            const now: Date = new Date();
            this.logger.debug(`Emit data-sharing-agreement.metrics for ${data.name}`);
            this.namespace.emit(
                'data-stream-metrics', {
                metrics: data,
                date: format(now, 'isoDateTime'),
            });
        }
    }

}


function DataSharingAgreementUmlImageUrl(dsa: OrganizationDataSharingAgreementDocument, action: string = 'none'): string {
    const producer = dsa.producer.name.replace(/\W+/g, '-');
    const topics = dsa.datastreams.map((ds: any) => `"${ds.name.replace('(', '').replace(')', '')}"`);
    const consumers = dsa.consumers.map((consumer: api.Organization) => consumer.name.replace(/\W+/g, '-'));

    const plantUmlContent = `
            @startuml "Dynamic"
            hide methods
            ! _action_ = "${action}"

            namespace ThingBook {

                class "thingbook-server"

                class "thingbook-mqtt" {
                    "${dsa.name}"
                }

            }

            namespace ${producer} {
                class "sensor-things" {
                    ${topics.join('\r\n')}
                }
            }

            ${consumers.map((consumer) => `namespace ${consumer} {}`).join('\r\n')}


            !if (_action_ == "none")
                "ThingBook.thingbook-server"   --> "ThingBook.thingbook-mqtt" : publishes
                "${producer}.sensor-things" <-- "ThingBook.thingbook-server" : subscribes
                ${consumers.map((consumer) => `"ThingBook.thingbook-mqtt" <-- "${consumer}" : subscribes`).join('\r\n')}
            !elseif (_action_ == "publish")
                "ThingBook.thingbook-server"   -[#green,dashed,thickness=4]-> "ThingBook.thingbook-mqtt" : publishes
                "${producer}.sensor-things" -[#green,dashed,thickness=4]-> "ThingBook.thingbook-server" : observation
                ${consumers.map((consumer) => `"ThingBook.thingbook-mqtt" -[#green,dashed,thickness=4]-> "${consumer}" : observation`).join('\r\n')}
            !endif

            @enduml
            `;

    const plantUmlHex = Buffer.from(plantUmlContent).toString('hex');

    return `http://www.plantuml.com/plantuml/img/~h${plantUmlHex}`;
}
