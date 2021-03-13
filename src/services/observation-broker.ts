import * as api from 'thingbook-api';
import { Logger } from 'winston';
import { OrganizationDataSharingAgreement, OrganizationDataSharingAgreementDocument } from '../models/organization.model';
import { ellipsize } from '../utils';
import { getLogger } from '../utils/logger';
import { SensorThingsMQTT } from './sensor-things.service';

export class ObservationBroker {

    private logger: Logger;
    private st: SensorThingsMQTT;

    constructor(private agreement: api.OrganizationDataSharingAgreement) {
        let loggerName: string = agreement.producer.sensorThingsMQTT
            .replace(/^mqtt\:\/\//, '')
            .replace(/\:\d+$/, '');

        this.logger = getLogger(ellipsize(loggerName, 20));
        this.st = SensorThingsMQTT.getInstance(agreement.producer.sensorThingsMQTT);

        for (let ds of agreement.datastreams) {
            this.st.subscribe(`${ds.name}/Observations`, this.onObservation.bind(this));
        }
    }

    private async onObservation(topic: string, obs: api.ST_Observation) {
        const doc: OrganizationDataSharingAgreementDocument = await OrganizationDataSharingAgreement.findById(this.agreement._id).orFail();

        // TODO: Send to consumer
        topic = topic.substring(0, topic.indexOf("/Observations"));

        for (let ds of doc.datastreams) {
            if (ds.name == topic) {
                ds.count = ds.count ? ds.count + 1 : 1;
                ds.lastSuccessfulTime = new Date();
                if (!ds.lastPhenomenonTime || (obs?.phenomenonTime && obs.phenomenonTime > ds.lastPhenomenonTime)) {
                    ds.lastPhenomenonTime = obs.phenomenonTime;
                }

                await doc.save();

                this.logger.silly(`Received Observation from ${ds.name}.  Cumulative count: ${ds.count}`);
                break;
            }
        }

    }

}