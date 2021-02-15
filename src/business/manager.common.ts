import { Logger } from "winston";
import { getLogger } from "../utils/logger";

export abstract class AbstractManager {

    protected logger: Logger;

    constructor(managerName: string) {
        this.logger = getLogger(managerName);
    }

}