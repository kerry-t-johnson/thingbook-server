import { EventEmitter2 } from 'eventemitter2';
import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { getLogger } from '../utils/logger';

@injectable()
export class EventService {

    private impl = new EventEmitter2({
        wildcard: true
    });
    private logger: Logger = getLogger('Events');

    public listen(eventName: string, callback: (...args: any[]) => void): void {
        // NOTE: Enforcing all callbacks to be async
        this.impl.on(eventName, callback, { async: true });
        this.logger.debug(`Number of ${eventName} listeners: ${this.impl.listenerCount(eventName)}`);
    }

    public post(eventName: string, ...args: any[]): void {
        this.logger.debug(`Posting event: ${eventName}`);
        this.impl.emit(eventName, ...args);
    }


}