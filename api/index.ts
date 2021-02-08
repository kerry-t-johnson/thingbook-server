import { Router, Request, Response } from 'express';
import { OrganizationRoutes } from './organization.route';
import { container } from "tsyringe";
import { UserRoutes } from './user.route';


export class API {

    public router: Router = Router();
    private organizationAPI: OrganizationRoutes = container.resolve(OrganizationRoutes);
    private userAPI: UserRoutes = container.resolve(UserRoutes);

    constructor() {
        this.router.get('/status', this.status.bind(this));
        this.router.use('/organization', this.organizationAPI.router);
        this.router.use('/user', this.userAPI.router);
    }

    private status(req: Request, rsp: Response) {
        rsp.json({ status: 'OK' });
    }
}

