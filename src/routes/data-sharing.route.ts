import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { DataSharingFragmentDocument, DataSharingTemplateDocument, DataSharingTemplateSchema } from "../models/data-sharing.model";
import { PaginatedResults, PaginationOptions } from 'thingbook-api';
import { DataSharingService } from "../services/data-sharing.service";
import { assertIsDefined } from "../utils";
import { AbstractRoute } from "./route.common";
import * as core from 'express-serve-static-core';
import { OrganizationDataSharingAgreementDocument, OrganizationDocument } from "../models/organization.model";
import { OrganizationManager } from "../business/organization.manager";
import { OrganizationService } from "../services/organization.service";
import { EntityNotFoundError } from "../utils/error.utils";

@injectable()
export class DataSharingRoutes extends AbstractRoute {

    public constructor(
        @inject("DataSharingService") private dsSvc?: DataSharingService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager,
        @inject("OrganizationService") private orgSvc?: OrganizationService) {
        super("DataSharing");

        DataSharingTemplateSchema.virtual('links').get(this.createDataSharingTemplateLinks);
    }

    public addRoutes(parent: core.Router): void {
        this.router.param('agreement', this.wrapParam(this.populateAgreementParam));

        this.router.get('/fragment', this.wrapRoute(this.getFragments));
        this.router.post('/fragment', this.wrapRoute(this.postFragment));
        this.router.get('/template', this.wrapRoute(this.getTemplates));
        this.router.post('/template', this.wrapRoute(this.postTemplate));
        this.router.get('/agreement', this.wrapRoute(this.getAgreements));
        this.router.get('/agreement/:agreement', this.wrapRoute(this.getAgreement));
        this.router.post('/agreement/:agreement/consumer', this.wrapRoute(this.postOrgAgreementConsumer));

        parent.use('/data-sharing', this.router);
    }

    private async populateAgreementParam(req: Request, id: string | number) {
        assertIsDefined(this.orgSvc);

        try {
            return await this.orgSvc.findAgreement(id);
        }
        catch (error) {
            throw new EntityNotFoundError('DataSharingAgreement', id);
        }
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

    private async getTemplates(req: Request, res: Response): Promise<PaginatedResults<DataSharingTemplateDocument>> {
        assertIsDefined(this.dsSvc);

        const options: PaginationOptions = this.getListOptions(req);
        return await this.dsSvc.listDataSharingTemplates(options);
    }

    private async postTemplate(req: Request, res: Response) {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.createDataSharingTemplate(<DataSharingTemplateDocument>req.body);
    }

    private async getAgreement(req: Request, res: Response): Promise<OrganizationDataSharingAgreementDocument> {

        return req.agreementValue;
    }

    private async getAgreements(req: Request, res: Response): Promise<PaginatedResults<OrganizationDataSharingAgreementDocument>> {
        assertIsDefined(this.dsSvc);

        return this.dsSvc.listDataSharingAgreements(this.getListOptions(req));
    }

    private async postOrgAgreementConsumer(req: Request, res: Response) {
        assertIsDefined(this.orgMgr);

        return await this.orgMgr.addConsumerToAgreement(
            req.agreementValue,
            <OrganizationDocument>req.body,
        );
    }

    createDataSharingTemplateLinks() {
        return DataSharingRoutes.createLinks('template', this);
    }

    private static createLinks(type: string, obj: any) {
        const selfUrl = `http://localhost:3000/api/v1/data-sharing/${type}/${obj._id}`

        return {
            self: { href: selfUrl },
        }
    }

}