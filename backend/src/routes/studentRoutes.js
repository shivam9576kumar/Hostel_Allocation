const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const studentAuth = require('../middleware/auth');
const { pairCodeLimiter } = require('../middleware/rateLimiter');
const {
  getStudentDashboard,
  getEligibleHostels,
  getHostelBlocks,
  getBlockFloors,
  getFloorRooms,
  downloadAllocationPDF,
  getRoomOccupants,
  getPdfStatus,
  bookSingleSeater
} = require('../controllers/studentController');
const { bookRoom, pairRoom, pairByCode } = require('../controllers/bookingController');

// Rate limiter for booking attempts (max 10 attempts per minute per IP)
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many booking attempts. Please wait before trying again.' },
});

// Rate limiter for status polling endpoints (allow 60 checks per minute)
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many status checks. Please wait.' },
});

// All student routes protected by studentAuth
router.use(studentAuth);

router.get('/dashboard', getStudentDashboard);
router.get('/pdf-status', statusLimiter, getPdfStatus);
router.get('/hostels', getEligibleHostels);
router.get('/blocks/:hostelId', getHostelBlocks);
router.get('/hostels/:hostelId/blocks', getHostelBlocks);
router.get('/floors/:blockId', getBlockFloors);
router.get('/blocks/:blockId/floors', getBlockFloors);
router.get('/rooms/:floorId', getFloorRooms);
router.get('/floors/:floorId/rooms', getFloorRooms);
router.get('/room/:roomId/occupants', getRoomOccupants);
router.post('/rooms/:roomId/book', bookingLimiter, bookRoom);
router.post('/book-single', bookingLimiter, bookSingleSeater);
router.post('/rooms/:roomId/pair', pairCodeLimiter, pairRoom);
router.post('/pair-by-code', pairCodeLimiter, pairByCode);
router.get('/pdf', downloadAllocationPDF);

module.exports = router;
