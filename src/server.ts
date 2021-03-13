import { Application } from "./application";
import { DependencyInjection } from './dependency-injection';

const di: Promise<void> = DependencyInjection.initialize();

di.then(function () {
    const app: Application = new Application();

    app.run();
});
