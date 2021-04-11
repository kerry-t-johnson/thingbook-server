import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from "../models/data-sharing.model";
import { PaginationOptions } from 'thingbook-api';
import { DataSharingService } from "../services/data-sharing.service";
import { assertIsDefined } from "../utils";
import { AbstractRoute } from "./route.common";
import * as core from 'express-serve-static-core';

@injectable()
export class DataSharingRoutes extends AbstractRoute {

    public constructor(@inject("DataSharingService") private dsSvc?: DataSharingService) {
        super("DataSharing");
    }

    public addRoutes(parent: core.Router): void {
        this.router.get('/fragment', this.wrapRoute(this.getFragments));
        this.router.post('/fragment', this.wrapRoute(this.postFragment));
        this.router.get('/template', this.wrapRoute(this.getTemplates));
        this.router.post('/template', this.wrapRoute(this.postTemplate));
        this.router.get('/agreement', this.wrapRoute(this.getAgreements));
        parent.use('/data-sharing', this.router);
    }

    private async getFragments(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        const options: PaginationOptions = this.getListOptions(req);
        return await this.dsSvc.listDataSharingFragments(options);
    }

    private async postFragment(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.createDataSharingFragment(<DataSharingFragmentDocument>req.body);
    }

    private async getTemplates(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        const options: PaginationOptions = this.getListOptions(req);
        return await this.dsSvc.listDataSharingTemplates(options);
    }

    private async postTemplate(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.createDataSharingTemplate(<DataSharingTemplateDocument>req.body);
    }

    private async getAgreements(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.listDataSharingAgreements(this.getListOptions(req));
    }

}