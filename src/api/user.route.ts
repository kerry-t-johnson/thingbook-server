import { Application as ExpressApplication, Router, Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { ResourceListOptions, UserService } from '../services/user.service';
import R = require('ramda');
import { User, UserDocument } from '../models/user.model';
import passport from 'passport';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { Configuration } from '../config';
import * as utils from '../utils';
import { AbstractRoute } from './route.common';
import { EntityNotFoundError } from '../utils/error.utils';
import { OrganizationManager } from '../business/organization.manager';
import { OrganizationDocument } from '../models/organization.model';
import { ClientSession } from 'mongoose';

@injectable()
export class UserRoutes extends AbstractRoute {

    private router: Router = Router();

    public constructor(
        @inject("UserService") private userSvc?: UserService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager,
        @inject("Configuration") private config?: Configuration) {
        super("User");

        // Parameters
        this.router.param('user', this.wrapParam(this.populateUserParam));

        // User Management
        this.router.get('/', this.wrapRoute(this.get));
        this.router.get('/:user', this.wrapRoute(this.getUser));
        this.router.post('/login', passport.authenticate('local'), this.wrapRoute(this.login));
        this.router.get('/logout', this.wrapRoute(this.logout));
        this.router.post('/register', this.wrapRoute(this.register));

        // Organization Management
        this.router.post('/:user/organization', this.wrapRoute(this.postUserOrganization));
    }

    public initialize(app: ExpressApplication, parent: Router) {
        utils.assertIsDefined(this.config);

        app.use(session({
            secret: this.config?.sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: true,
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

        parent.use('/user', this.router);
    }

    private async populateUserParam(req: Request, res: Response, id: string | number) {
        utils.assertIsDefined(this.userSvc);

        req.userParam = await this.userSvc.findUser(id);

        if (!req.userParam) {
            throw new EntityNotFoundError('user', id);
        }
    }

    private async get(req: Request, res: Response) {
        const users = await this.userSvc?.list(new ResourceListOptions({
            offset: +R.pathOr(0, ['query', 'offset'], req),
            limit: +R.pathOr(9999, ['query', 'limit'], req)
        }));

        res.status(200).json(users);
    }

    private getUser(req: Request, res: Response) {
        this.setEtag(req.userParam, res);
        res.status(200).json(req.userParam);
    }

    private login(req: Request, res: Response) {
        res.status(200).json(req.user);
    }

    private logout(req: Request, res: Response) {
        req.logout();
        res.status(200).end();
    }

    private async register(req: Request, res: Response) {
        // Remove password field from request's JSON body:
        const { password, ...body } = req.body;
        const user = await this.userSvc?.create(<UserDocument>body, password);
        res.status(200).json(user);
    }

    private async postUserOrganization(req: Request, res: Response, session: ClientSession) {
        utils.assertIsDefined(this.orgMgr);

        this.validateEtag(req.get('ETag'), req.userParam);

        const org = this.orgMgr.createOrganization(<UserDocument>req.userParam, <OrganizationDocument>req.body, session);

        res.status(200).json(org);
    }

}
