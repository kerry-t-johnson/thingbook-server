import { AbstractRoute } from "../../src/routes/route.common";
import * as core from 'express-serve-static-core';
import { inject, injectable } from "tsyringe";
import { DataLoaderService } from "../services/data-loader.service";
import { assertIsDefined } from "../../src/utils";
import { DataLoadRequest } from "thingbook-api/lib";
import { PaginationOptions } from 'thingbook-api';
import { Request } from "express";

@injectable()
export class DevelopmentRoutes extends AbstractRoute {

    public constructor(@inject("DataLoaderService") private dataLoaderSvc?: DataLoaderService) {
        super("Development");
    }

    public addRoutes(parent: core.Router): void {
        this.router.get('/sensor-things-test-data', this.wrapRoute(this.getSensorThingsTestData));
        this.router.post('/sensor-things-test-data', this.wrapRoute(this.postSensorThingsTestData));
        parent.use('/development', this.router);
    }

    private async getSensorThingsTestData(req: Request, res: Response): Promise<DataLoadRequest[]> {
        assertIsDefined(this.dataLoaderSvc);
        const options: PaginationOptions = this.getListOptions(req);
        return this.dataLoaderSvc.listSenorThingsDataLoads(options);
    }

    private async postSensorThingsTestData(req: core.Request, res: core.Response) {
        assertIsDefined(this.dataLoaderSvc);

        return await this.dataLoaderSvc.loadSensorThingsData(<DataLoadRequest>req.body);
    }

}
