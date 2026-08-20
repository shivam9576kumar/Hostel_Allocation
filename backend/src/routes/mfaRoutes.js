const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { mfaSetup, mfaVerify } = require('../controllers/authController');

router.use(adminAuth);

router.post('/setup', mfaSetup);
router.post('/verify', mfaVerify);

module.exports = router;
