import express = require('express');
const organizationAPI = require('./OrganizationAPI');

const router = express.Router();

router.get('/status', (req, rsp) => {
    rsp.json({ status: 'OK' });
})

router.use('/organization', organizationAPI);


module.exports = router;
