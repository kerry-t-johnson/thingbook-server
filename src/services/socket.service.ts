import { Server, Socket } from "socket.io";
import * as http from 'http';
import { getLogger, Logger } from "../utils/logger";

export class SocketService {

    private logger: Logger = getLogger('SocketService');
    private impl: Server | undefined;

    initialize(httpServer: http.Server) {
        this.logger.info('SocketService initialized');
        this.impl = new Server(httpServer, {
            // ...
        });

        this.impl.on("connection", (socket: Socket) => {
            console.log('HERE');
        });
    }

}