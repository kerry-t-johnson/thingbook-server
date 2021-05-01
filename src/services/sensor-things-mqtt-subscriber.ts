import * as api from 'thingbook-api';
import { container } from 'tsyringe';
import { Logger } from 'winston';
import { OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument } from '../models/organization.model';
import { ellipsize } from '../utils';
import { getLogger } from '../utils/logger';
import { EventService } from './event-service';
import { SensorThingsMQTT } from './sensor-things.service';

export class SensorThingsMqttSubscriber {

    private logger: Logger;
    private remoteMqtt: SensorThingsMQTT;
    private thingbookMqtt: SensorThingsMQTT;
    private dsaTopic: string;
    private eventSvc: EventService;

    constructor(private agreement: api.OrganizationDataSharingAgreement) {
        let loggerName: string = agreement.producer.sensorThingsMQTT
            .replace(/^mqtt\:\/\//, '')
            .replace(/\:\d+$/, '');

        this.logger = getLogger(ellipsize(loggerName, 20));
        this.remoteMqtt = SensorThingsMQTT.getInstance(agreement.producer.sensorThingsMQTT);
        this.thingbookMqtt = SensorThingsMQTT.getInstance('mqtt://thingbook-mqtt:1883');
        this.dsaTopic = `/dsa/${agreement._id}`;

        for (let ds of agreement.datastreams) {
            this.remoteMqtt.subscribe(`${ds.name}/Observations`, this.onObservation.bind(this));
        }

        this.eventSvc = container.resolve("EventService");
    }

    private async onObservation(topic: string, buffer: Buffer) {
        const observationData = buffer.toString();
        const observation: api.ST_Observation = JSON.parse(observationData);

        const doc: OrganizationDataSharingAgreementDocument = await OrganizationDataSharingAgreement.findById(this.agreement._id).orFail();

        // Route to consumer(s) of the Data Sharing Agreement
        this.logger.silly(`Sending Observation to ${this.thingbookMqtt.url}#${this.dsaTopic}`);
        this.thingbookMqtt.publish(this.dsaTopic, observationData);

        this.eventSvc.post('sensor-things-observation', {
            sourceId: this.agreement._id,
            sourceURL: this.remoteMqtt.url.toString(),
            topic: topic,
            data: observation,
        });

        topic = topic.substring(0, topic.indexOf("/Observations"));

        for (let ds of doc.datastreams) {
            if (ds.name == topic) {
                ds.count = ds.count ? ds.count + 1 : 1;
                ds.lastSuccessfulTime = new Date();

                if (!ds.lastPhenomenonTime || (observation?.phenomenonTime && observation.phenomenonTime > ds.lastPhenomenonTime)) {
                    ds.lastPhenomenonTime = observation.phenomenonTime;
                }

                this.eventSvc.post('data-sharing-agreement.metrics', {
                    sourceId: this.agreement._id,
                    data: ds,
                });

                await doc.save();

                this.logger.silly(`Received Observation from ${ds.name}.  Cumulative count: ${ds.count}`);
                break;
            }
        }

    }

}