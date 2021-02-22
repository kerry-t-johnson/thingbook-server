import { Application as ExpressApplication, Router, Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { inject, injectable } from 'tsyringe';
import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, ResourceListOptions } from '../models/organization.model';
import { AbstractRoute } from './route.common';
import { assertIsDefined } from '../utils';
import { OrganizationManager } from '../business/organization.manager';

@injectable()
export class OrganizationRoutes extends AbstractRoute {

    private router: Router = Router();

    public constructor(
        @inject("OrganizationService") private orgSvc?: OrganizationService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager) {
        super('Organization');

        // Parameters
        this.router.param('org', this.wrapParam(this.populateOrgParam));

        this.router.get('/', this.wrapRoute(this.get));
        this.router.get('/:org', this.wrapRoute(this.getOrg));
        this.router.get('/:org/template', this.wrapRoute(this.getOrgTemplates));
        this.router.post('/:org/template', this.wrapRoute(this.postOrgTemplate));
        this.router.get('/:org/agreement', this.wrapRoute(this.getOrgAgreements));
        this.router.post('/:org/agreement', this.wrapRoute(this.postOrgAgreement));
    }

    public initialize(app: ExpressApplication, parent: Router) {
        parent.use('/organization', this.router);
    }

    private async populateOrgParam(req: Request, id: string | number) {
        assertIsDefined(this.orgSvc);

        return await this.orgSvc.findOrganization(id);
    }

    private async getOrg(req: Request, res: Response): Promise<OrganizationDocument> {
        this.setEtag(req.orgValue, res);
        return Promise.resolve(req.orgValue);
    }

    private async get(req: Request, res: Response): Promise<OrganizationDocument[]> {
        assertIsDefined(this.orgSvc);
        const options: ResourceListOptions = this.getListOptions(req);
        return await this.orgSvc.listOrganizations(options);
    }

    private async getOrgTemplates(req: Request, res: Response) {
        assertIsDefined(this.orgSvc);

        return await this.orgSvc.listOrganizationDataSharingTemplates(
            req.orgValue,
            this.getListOptions(req),
        );
    }

    private async postOrgTemplate(req: Request, res: Response) {
        assertIsDefined(this.orgMgr);

        return await this.orgMgr.createTemplate(
            req.orgValue,
            <OrganizationDataSharingTemplateDocument>req.body
        );
    }

    private async getOrgAgreements(req: Request, res: Response) {
        assertIsDefined(this.orgSvc);

        return await this.orgSvc.listOrganizationDataSharingAgreements(
            req.orgValue,
            this.getListOptions(req),
        );
    }

    private async postOrgAgreement(req: Request, res: Response) {
        assertIsDefined(this.orgMgr);

        return await this.orgMgr.createAgreement(
            req.orgValue,
            <OrganizationDataSharingAgreementDocument>req.body
        );
    }

}

