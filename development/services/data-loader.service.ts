import { DataLoadRequest } from "thingbook-api/lib";
import { AbstractService } from "../../src/services/service.common";

export class DataLoaderService extends AbstractService {

    constructor() {
        super("DataLoader")
    }

    public async loadData(request: DataLoadRequest) {

    }

}