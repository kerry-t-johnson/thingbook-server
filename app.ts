import express = require('express');
import { getLogger } from './logger';

async function start() {
    const app = express();
    const logger = getLogger('app');

    app.get('/', function (req, res) {
        logger.debug('Hellow, world... via logger');
        res.send('Hello World!  This is nice...');
    });

    app.use('/api/v1', require('./api'));

    app.listen(process.env.PORT, () => {
        logger.info('Server listening on port %s', process.env.PORT);
    });
}

start();
