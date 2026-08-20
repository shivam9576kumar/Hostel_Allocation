const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  adminLogin,
  login,
  studentMicrosoftAuth,
  refresh,
  logout,
  mfaSetup,
  mfaVerify
} = require('../controllers/authController');

// Standard Auth Endpoints
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/student/microsoft', studentMicrosoftAuth);
router.post('/refresh', refresh);
router.post('/logout', logout);

// MFA Endpoints
router.post('/mfa/setup', adminAuth, mfaSetup);
router.post('/mfa/verify', adminAuth, mfaVerify);

module.exports = router;
