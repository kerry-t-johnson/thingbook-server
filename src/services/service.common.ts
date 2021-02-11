import { Logger, getLogger } from "../../logger";

export interface Service {

}

export abstract class AbstractService implements Service {
    protected logger: Logger;

    constructor(serviceName: string) {
        this.logger = getLogger(serviceName);
    }

}

