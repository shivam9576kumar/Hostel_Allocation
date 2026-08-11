const express = require('express');
const router = express.Router();
const { adminLogin, studentMicrosoftAuth } = require('../controllers/authController');

router.post('/admin/login', adminLogin);
router.post('/student/microsoft', studentMicrosoftAuth);

module.exports = router;
