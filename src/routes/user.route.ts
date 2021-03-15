import { Application as ExpressApplication, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ListQueryOptions, UserService } from '../services/user.service';
import { User, UserDocument } from '../models/user.model';
import passport from 'passport';
import session from 'express-session';
import * as utils from '../utils';
import { AbstractRoute } from './route.common';
import { OrganizationManager } from '../business/organization.manager';
import { OrganizationDocument } from '../models/organization.model';
import * as core from 'express-serve-static-core';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import * as passportJwt from 'passport-jwt';
import { ThingBookHttpError } from '../utils/error.utils';
import { StatusCodes } from 'http-status-codes';
import { KeyValueService } from '../services/keyvalue.service';

@injectable()
export class UserRoutes extends AbstractRoute {

    private key?: string | undefined;

    public constructor(
        @inject("UserService") private userSvc?: UserService,
        @inject("OrganizationManager") private orgMgr?: OrganizationManager,
        @inject("KeyValue") private kvSvc?: KeyValueService) {
        super("User");
    }

    public async initialize(app: ExpressApplication) {
        utils.assertIsDefined(this.kvSvc);
        utils.assertIsDefined(this.config);
        super.initialize(app);

        this.key = await this.kvSvc.get('jwtSecret');

        if (!this.key) {
            this.key = uuidv4().toString();
            await this.kvSvc.put('jwtSecret', this.key);
        }
        this.logger.silly(`JWT secret: ${this.key}`);

        app.use(session({
            secret: 'TEST',
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

        const jwtOptions: passportJwt.StrategyOptions = {
            secretOrKey: this.key,
            jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
            passReqToCallback: true,
        };

        passport.use(new passportJwt.Strategy(jwtOptions, this.verify.bind(this)));
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
        this.router.get('/:user/profile', passport.authenticate('jwt', { session: false }), this.wrapRoute(this.getUserProfile));
        this.router.post('/:user/refresh', passport.authenticate('jwt', { session: false }), this.wrapRoute(this.refreshJwtToken));
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

    private getUserProfile(req: Request, res: Response) {
        const userId: any = req.params.user;

        if (userId == req.authUser?._id) {
            return req.userValue?.profile || {};
        }

        throw new ThingBookHttpError(StatusCodes.UNAUTHORIZED, 'Not allowed to access the selected profile');
    }

    private async login(req: Request, res: Response) {
        return await this.refreshJwtToken(req, res);
    }

    private async refreshJwtToken(req: Request, res: Response) {
        utils.assertIsDefined(this.key);
        utils.assertIsDefined(this.kvSvc);

        // TODO: If performing a true refresh (vice a login), need to verify
        //       that the existing token in Redis matches

        const user: any = <any>req.user;
        user.authorization = jwt.sign({}, this.key, {
            // algorithm: 'RS256',
            expiresIn: '2d',
            subject: user._id.toString(),
        });

        await this.kvSvc.put(`${user._id}-jwt`, user.authorization);

        this.logger.silly(`Updated user JWT: ${utils.ellipsize(user.authorization, 14)}`);

        return user;
    }

    private async logout(req: Request, res: Response) {
        utils.assertIsDefined(this.kvSvc);
        req.logout();

        await this.kvSvc.del(`${req.userValue._id}-jwt`);

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

        return await this.orgMgr.createOrganization(<UserDocument>req.userValue, <OrganizationDocument>req.body);
    }

    private async verify(req: Request, jwt_payload: any, done: passportJwt.VerifiedCallback) {
        req.authUser = await User.findById(jwt_payload.sub);
        return done(null, req.authUser || false)
    }

}
