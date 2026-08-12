const express = require('express');
const router = express.Router();
const studentAuth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const checkSwapActive = require('../middleware/checkSwapActive');

const {
  getEligibleRooms,
  createRequest,
  giveConsent,
  getStudentSwapRequests,
  getSwapStatus,
  cancelRequest,
  adminToggleSwap,
  adminGetSwapActive,
  adminListRequests,
  adminForceExecute
} = require('../controllers/swapController');

// --- Admin Swap Routes --- (prefix /api/admin/swap)
router.post('/admin/swap/toggle', adminAuth, adminToggleSwap);
router.get('/admin/swap/active', adminAuth, adminGetSwapActive);
router.get('/admin/swap/requests', adminAuth, adminListRequests);
router.post('/admin/swap/execute/:id', adminAuth, adminForceExecute);
router.delete('/admin/swap/cancel/:id', adminAuth, cancelRequest);

// --- Student Swap Routes --- (prefix /api/student/swap)
router.get('/student/swap/active', studentAuth, adminGetSwapActive);
router.get('/student/swap/eligible-rooms', studentAuth, checkSwapActive, getEligibleRooms);
router.get('/student/swap/requests', studentAuth, getStudentSwapRequests);
router.get('/student/swap/status/:id', studentAuth, getSwapStatus);
router.post('/student/swap/request', studentAuth, checkSwapActive, createRequest);
router.post('/student/swap/consent/:id', studentAuth, checkSwapActive, giveConsent);
router.delete('/student/swap/cancel/:id', studentAuth, cancelRequest);

module.exports = router;
