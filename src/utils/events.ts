import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { getLogger } from './logger';

export class Events {

    private static impl = new EventEmitter();
    private static logger: Logger = getLogger('Events');

    public static listen(eventName: string, callback: (...args: any[]) => void): void {
        Events.impl.addListener(eventName, callback);
        Events.logger.debug(`Number of ${eventName} listeners: ${Events.impl.listenerCount(eventName)}`);
    }

    public static post(eventName: string, ...args: any[]): void {
        Events.logger.debug(`Posting event: ${eventName}`);
        Events.impl.emit(eventName, ...args);
    }


}