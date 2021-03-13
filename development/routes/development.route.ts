import { AbstractRoute } from "../../src/routes/route.common";
import * as core from 'express-serve-static-core';
import { injectable } from "tsyringe";

@injectable()
export class DevelopmentRoutes extends AbstractRoute {

    public constructor() {
        super("Development");
    }

    public addRoutes(parent: core.Router): void {
        this.router.post('/load-data', this.wrapRoute(this.postLoadData));
        parent.use('/development', this.router);
    }

    private async postLoadData(req: Request, res: Response) {

    }

}