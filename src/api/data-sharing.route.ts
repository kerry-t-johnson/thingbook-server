import { Application as ExpressApplication, Router, Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { DataSharingFragmentDocument, DataSharingTemplateDocument } from "../models/data-sharing.model";
import { ResourceListOptions } from "../models/options";
import { DataSharingService } from "../services/data-sharing.service";
import { assertIsDefined } from "../utils";
import { AbstractRoute } from "./route.common";

@injectable()
export class DataSharingRoutes extends AbstractRoute {

    private router: Router = Router();

    public constructor(@inject("DataSharingService") private dsSvc?: DataSharingService) {
        super("DataSharing");
        this.router.get('/fragment', this.wrapRoute(this.getFragments));
        this.router.post('/fragment', this.wrapRoute(this.postFragment));
        this.router.get('/template', this.wrapRoute(this.getTemplates));
        this.router.post('/template', this.wrapRoute(this.postTemplate));
    }

    public initialize(app: ExpressApplication, parent: Router) {
        parent.use('/data-sharing', this.router);
    }

    private async getFragments(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        const options: ResourceListOptions = this.getListOptions(req);
        return await this.dsSvc.listDataSharingFragments(options);
    }

    private async postFragment(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.createDataSharingFragment(<DataSharingFragmentDocument>req.body);
    }

    private async getTemplates(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        const options: ResourceListOptions = this.getListOptions(req);
        return await this.dsSvc.listDataSharingTemplates(options);
    }

    private async postTemplate(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.createDataSharingTemplate(<DataSharingTemplateDocument>req.body);
    }

}