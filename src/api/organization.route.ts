import { Application as ExpressApplication, Router, Request, Response } from 'express';
import R = require('ramda');
import { OrganizationService } from '../services/organization.service';
import { inject, injectable } from 'tsyringe';
import { OrganizationDocument, ResourceListOptions } from '../models/organization.model';
import { AbstractRoute } from './route.common';

@injectable()
export class OrganizationRoutes extends AbstractRoute {

    private router: Router = Router();

    public constructor(@inject("OrganizationService") private orgsvc?: OrganizationService) {
        super('Organization');
        this.router.get('/', this.wrapRoute(this.get));
    }

    public initialize(app: ExpressApplication, parent: Router) {
        parent.use('/organization', this.router);
    }

    private async get(req: Request, res: Response) {
        const orgs = await this.orgsvc?.list(new ResourceListOptions({
            offset: +R.pathOr(0, ['query', 'offset'], req),
            limit: +R.pathOr(9999, ['query', 'limit'], req)
        }));

        res.status(200).json(orgs);
    }


}

