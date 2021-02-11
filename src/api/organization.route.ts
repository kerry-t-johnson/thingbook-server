import { Application as ExpressApplication, Router, Request, Response } from 'express';
import R = require('ramda');
import { OrganizationService } from '../services/organization.service';
import { inject, injectable } from 'tsyringe';
import { OrganizationDocument, ResourceListOptions } from '../models/organization.model';

@injectable()
export class OrganizationRoutes {

    private router: Router = Router();

    public constructor(@inject("OrganizationService") private orgsvc?: OrganizationService) {
        this.router.get('/', this.get.bind(this));
        this.router.post('/', this.post.bind(this));
    }

    public initialize(app: ExpressApplication, parent: Router) {
        parent.use('/organization', this.router);
    }

    private async get(req: Request, res: Response) {
        try {
            const orgs = await this.orgsvc?.list(new ResourceListOptions({
                offset: +R.pathOr(0, ['query', 'offset'], req),
                limit: +R.pathOr(9999, ['query', 'limit'], req)
            }));

            res.status(200).json(orgs);
        }
        catch (error) {
            res.status(500).json({ msg: error });
        }
    }

    private async post(req: Request, res: Response) {
        try {
            const org = await this.orgsvc?.create(<OrganizationDocument>req.body);
            res.status(200).json(org);
        }
        catch (error) {
            res.status(500).json({ msg: error });
        }
    }

}

