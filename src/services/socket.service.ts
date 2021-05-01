import { Server, Socket, Namespace } from "socket.io";
import * as http from 'http';
import { AbstractService } from "./service.common";
import { Logger } from "winston";
import { getLogger } from "../utils/logger";
import { EventEmitter2 } from "eventemitter2";
import { assertIsDefined } from "../utils";

export class SocketService extends AbstractService {

    private io: Server | undefined;
    private namespaces: { [key: string]: NamespaceManager } = {};

    constructor() {
        super("SocketService");
    }

    public initialize(httpServer: http.Server) {
        this.logger.info('SocketService initialized');
        this.io = new Server(httpServer, {
            cors: {
                origin: '*',
            }
        });

        Object.values(this.namespaces).forEach((nsManager: NamespaceManager) => {
            nsManager.initialize(this.io);
        });
    }

    public registerNamespace(nsp: string | RegExp) {
        const nsManager = new NamespaceManager(nsp);

        // Initialize 'later' (asynchronously), so that we can return the
        // NamespaceManager immediately
        setTimeout(() => {
            nsManager.initialize(this.io);
        });

        return nsManager;
    }

}

export class NamespaceManager extends EventEmitter2 {
    private parent: Namespace | undefined;
    private namespaces: { [key: string]: Namespace } = {};
    protected logger: Logger;

    constructor(private selector: string | RegExp) {
        super();
        this.logger = getLogger(selector.toString());
    }

    public initialize(io: Server | undefined) {
        if (io !== undefined && this.parent === undefined) {
            this.logger.debug(`Initializing NamespaceManager for: ${this.selector}`);
            this.parent = io.of(this.selector);

            this.parent.on('connection', this.onConnection.bind(this));
        }
    }

    private onConnection(socket: Socket) {
        let namespace: Namespace | undefined = this.namespaces[socket.nsp.name];

        if (namespace === undefined) {
            namespace = socket.nsp;
            this.namespaces[namespace.name] = namespace;

            this.logger.debug(`Created namespace: ${namespace.name}`);
            this.emit(`${this.selector}:created`, namespace);
        }

        assertIsDefined(namespace);

        this.logger.debug(`Added client connection.  Number of connected sockets: ${namespace.sockets.size}`);
        this.emit(`${namespace.name}:connected`, socket);

        socket.on('disconnect', (reason) => {
            let namespace: Namespace | undefined = this.namespaces[socket.nsp.name];
            assertIsDefined(namespace);

            this.logger.debug(`Removed client connection.  Number of connected sockets: ${namespace.sockets.size}`);
            this.emit(`${namespace.name}:disconnected`, reason);

            if (namespace.sockets.size === 0) {
                this.emit(`${this.selector}:destroyed`, namespace);
                delete this.namespaces[namespace.name];
                this.logger.debug(`Destroyed namespace: ${namespace.name}`);
            }
        });
    }

}