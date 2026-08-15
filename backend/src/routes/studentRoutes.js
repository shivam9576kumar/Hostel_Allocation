const express = require('express');
const router = express.Router();
const studentAuth = require('../middleware/auth');
const {
  getStudentDashboard,
  getEligibleHostels,
  getHostelBlocks,
  getBlockFloors,
  getFloorRooms,
  downloadAllocationPDF,
  getRoomOccupants
} = require('../controllers/studentController');
const { bookRoom, pairRoom, pairByCode } = require('../controllers/bookingController');

// All student routes protected by studentAuth
router.use(studentAuth);

router.get('/dashboard', getStudentDashboard);
router.get('/hostels', getEligibleHostels);
router.get('/blocks/:hostelId', getHostelBlocks);
router.get('/hostels/:hostelId/blocks', getHostelBlocks);
router.get('/floors/:blockId', getBlockFloors);
router.get('/blocks/:blockId/floors', getBlockFloors);
router.get('/rooms/:floorId', getFloorRooms);
router.get('/floors/:floorId/rooms', getFloorRooms);
router.get('/room/:roomId/occupants', getRoomOccupants);
router.post('/rooms/:roomId/book', bookRoom);
router.post('/rooms/:roomId/pair', pairRoom);
router.post('/pair-by-code', pairByCode);
router.get('/pdf', downloadAllocationPDF);

module.exports = router;
