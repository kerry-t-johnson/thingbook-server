import { Router, Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import passport from 'passport';
import { UserService } from '../services/user.service';
import R = require('ramda');
import { UserDocument } from 'models/user.model';

@injectable()
export class UserRoutes {

    public router: Router = Router();

    public constructor(@inject("UserService") private userSvc?: UserService) {
        this.router.param('user', this.populateUserParam.bind(this));
        this.router.get('/', this.listUsers.bind(this));
        this.router.get('/:user', this.findUser.bind(this));
        this.router.post('/login', passport.authenticate('local'), this.login.bind(this));
        this.router.get('/logout', this.logout.bind(this));
        this.router.post('/register', this.register.bind(this));
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
            const users = await this.userSvc?.list({
                offset: +R.pathOr(0, ['query', 'offset'], req),
                limit: +R.pathOr(9999, ['query', 'limit'], req)
            });

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
