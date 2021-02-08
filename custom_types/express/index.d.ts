
// import { UserDocument } from '../../models/user.model';


declare namespace Express {
    interface Request {
        userParam: any;
    }
}