import { Application as ExpressApplication, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ListQueryOptions, UserService } from '../services/user.service';
import { User, UserDocument } from '../models/user.model';
import passport from 'passport';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import * as utils from '../utils';
import { AbstractRoute } from './route.common';
import { OrganizationManager } from '../business/organization.manager';
import { OrganizationDocument } from '../models/organization.model';
import * as core from 'express-serve-static-core';

@injectable()
export class UserRoutes extends AbstractRoute {

    public constructor(
        @inject("UserService") private userSvc?: UserService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager) {
        super("User");
    }

    public initialize(app: ExpressApplication) {
        super.initialize(app);

        utils.assertIsDefined(this.config);

        app.use(session({
            secret: this.config?.sessionSecret,
            resave: false,
            saveUninitialized: true,
            cookie: {
                httpOnly: true,
                sameSite: 'none',
                maxAge: 600000 // Time is in miliseconds
            },
            genid: function (req: Request) {
                return uuidv4();
            }
        }));
        app.use(passport.initialize());
        app.use(passport.session());

        passport.use(User.createStrategy());
        passport.deserializeUser(User.deserializeUser());
        // @ts-ignore
        passport.serializeUser(User.serializeUser());
    }

    public addRoutes(parent: core.Router): void {
        super.addRoutes(parent);

        // Parameters
        this.router.param('user', this.wrapParam(this.populateUserParam));

        // User Management
        this.router.get('/', this.wrapRoute(this.get));
        this.router.get('/:user', this.wrapRoute(this.getUser));
        this.router.post('/login', passport.authenticate('local'), this.wrapRoute(this.login));
        this.router.get('/logout', this.wrapRoute(this.logout));
        this.router.post('/register', this.wrapRoute(this.register));

        // Organization Management
        this.router.get('/:user/organization', this.wrapRoute(this.getUserOrganization));
        this.router.post('/:user/organization', this.wrapRoute(this.postUserOrganization));
        parent.use('/user', this.router);
    }


    private async populateUserParam(req: Request, id: string | number) {
        utils.assertIsDefined(this.userSvc);

        return await this.userSvc.findUser(id);
    }

    private async get(req: Request, res: Response) {
        utils.assertIsDefined(this.userSvc);

        const options: ListQueryOptions = this.getListOptions(req);
        return await this.userSvc?.listUsers(options);
    }

    private getUser(req: Request, res: Response) {
        this.setEtag(req.userValue, res);
        return req.userValue;
    }

    private login(req: Request, res: Response) {
        return req.user;
    }

    private logout(req: Request, res: Response) {
        req.logout();
        return {};
    }

    private async register(req: Request, res: Response) {
        // Remove password field from request's JSON body:
        const { password, ...body } = req.body;
        return await this.userSvc?.createUser(<UserDocument>body, password);
    }

    private async getUserOrganization(req: Request, res: Response) {
        utils.assertIsDefined(this.orgMgr);

        return await this.orgMgr.getOrganizations(<UserDocument>req.userValue);
    }

    private async postUserOrganization(req: Request, res: Response) {
        utils.assertIsDefined(this.orgMgr);

        return this.orgMgr.createOrganization(<UserDocument>req.userValue, <OrganizationDocument>req.body);
    }

}
