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

@injectable()
export class UserRoutes {

    private router: Router = Router();

    public constructor(@inject("UserService") private userSvc?: UserService,
        @inject("Configuration") private config?: Configuration) {
        this.router.param('user', this.populateUserParam.bind(this));
        this.router.get('/', this.listUsers.bind(this));
        this.router.get('/:user', this.findUser.bind(this));
        this.router.post('/login', passport.authenticate('local'), this.login.bind(this));
        this.router.get('/logout', this.logout.bind(this));
        this.router.post('/register', this.register.bind(this));
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

    private populateUserParam(req: Request, res: Response, next: NextFunction, id: string) {
        this.userSvc?.findUser(id)
            .then(function (user: UserDocument) {
                req.userParam = user;
                next();
            });
    }

    private async listUsers(req: Request, res: Response) {
        try {
            const users = await this.userSvc?.list(new ResourceListOptions({
                offset: +R.pathOr(0, ['query', 'offset'], req),
                limit: +R.pathOr(9999, ['query', 'limit'], req)
            }));

            res.status(200).json(users);
        }
        catch (error) {
            res.status(500).json({ msg: error });
        }
    }

    private findUser(req: Request, res: Response) {
        if (req?.userParam) {
            res.status(200).json(req.userParam);
        }
        else {
            res.status(404).end();
        }
    }

    private login(req: Request, res: Response) {
        res.status(200).json(req.user);
    }

    private logout(req: Request, res: Response) {
        req.logout();
        res.status(200).end();
    }

    private async register(req: Request, res: Response) {
        try {
            // Remove password field from request's JSON body:
            const { password, ...body } = req.body;
            const user = await this.userSvc?.create(<UserDocument>body, password);
            res.status(200).json(user);
        }
        catch (error) {
            res.status(500).json({ msg: error });
        }
    }
}
