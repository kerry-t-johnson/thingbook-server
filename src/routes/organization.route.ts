import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { inject, injectable } from 'tsyringe';
import { OrganizationDataSharingAgreementDocument, OrganizationDataSharingTemplateDocument, OrganizationDocument, OrganizationSchema } from '../models/organization.model';
import { AbstractRoute } from './route.common';
import { assertIsDefined } from '../utils';
import { OrganizationManager } from '../business/organization.manager';
import * as core from 'express-serve-static-core';
import { PaginatedResults, PaginationOptions } from '../../../thingbook-api/src/metadata.api';


@injectable()
export class OrganizationRoutes extends AbstractRoute {

    public constructor(
        @inject("OrganizationService") private orgSvc?: OrganizationService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager) {
        super('Organization');

        OrganizationSchema.virtual('links').get(this.createOrganizationLinks);

    }

    public addRoutes(parent: core.Router) {
        super.addRoutes(parent);

        // Parameters
        this.router.param('org', this.wrapParam(this.populateOrgParam));

        this.router.get('/', this.wrapRoute(this.get));
        this.router.get('/:org', this.wrapRoute(this.getOrg));
        this.router.get('/:org/template', this.wrapRoute(this.getOrgTemplates));
        this.router.post('/:org/template', this.wrapRoute(this.postOrgTemplate));
        this.router.get('/:org/agreement', this.wrapRoute(this.getOrgAgreements));
        this.router.post('/:org/agreement', this.wrapRoute(this.postOrgAgreement));

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

    private async get(req: Request, res: Response): Promise<PaginatedResults<OrganizationDocument>> {
        assertIsDefined(this.orgSvc);
        const options: PaginationOptions = this.getListOptions(req);
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

    createOrganizationLinks() {
        return OrganizationRoutes.createLinks('organization', this);
    }

    private static createLinks(type: string, obj: any) {
        const selfUrl = `http://localhost:3000/api/v1/${type}/${obj._id}`

        return {
            self: { href: selfUrl },
            template: { title: 'Data Sharing Templates', href: `${selfUrl}/template` },
            agreement: { title: 'Data Sharing Agreements', href: `${selfUrl}/agreement` }
        }
    }

}

