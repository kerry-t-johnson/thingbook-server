import { expect } from 'chai';
import { io } from 'socket.io-client';
import { delaySeconds } from '../../src/utils';

describe('SocketService', async function () {

    if (process.env.WEB_SOCKET_TEST == 'true') {
        it('Receives web-socket connections', async function () {
            const socket = io('http://localhost:3000');

            let connected: boolean = false;
            socket.on('connect', () => {
                connected = true;
            });

            let attempts = 0;
            while (!connected && attempts++ < 5) {
                await delaySeconds(1);
            }

            expect(connected).to.be.true;
        });
    }

});
