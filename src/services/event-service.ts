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
        this.impl.emit(eventName, ...args);
    }

    public stopListening(eventName: string, callback: (...args: any[]) => void): void {
        this.impl.removeListener(eventName, callback);
    }

}