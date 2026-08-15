const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const {
  uploadStudents,
  getHostels,
  createHostel,
  updateHostel,
  deleteHostel,
  clearHostelData,
  getBlocks,
  createBlock,
  deleteBlock,
  toggleBlockReservation,
  getFloors,
  createFloor,
  bulkCreateFloors,
  deleteFloor,
  toggleFloorReservation,
  getRooms,
  createRoom,
  bulkCreateRooms,
  deleteRoom,
  toggleRoomReservation,
  releaseOccupants,
  getStudents,
  getStudentCount,
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  getHostelAllocationRules
} = require('../controllers/adminController');

const verifyAdmin = adminAuth;

// Server-side validation middleware for bulk room creation
const validateBulkRoom = (req, res, next) => {
  const { floorId, floor_id, roomStart, roomEnd } = req.body;
  const targetFloorId = floorId || floor_id;

  if (!targetFloorId || roomStart === undefined || roomEnd === undefined) {
    return res.status(400).json({ error: 'Missing required fields: floorId, roomStart, roomEnd' });
  }

  const start = parseInt(roomStart, 10);
  const end = parseInt(roomEnd, 10);

  if (isNaN(start) || isNaN(end)) {
    return res.status(400).json({ error: 'Room numbers must be valid integers' });
  }

  if (start > end) {
    return res.status(400).json({ error: 'Start room number must be less than or equal to end room number' });
  }

  next();
};

// Multer Upload Setup
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// All admin routes are protected by adminAuth middleware
router.use(adminAuth);

// Student Roster Management
router.post('/upload-students', upload.single('file'), uploadStudents);
router.get('/students/count', getStudentCount);
router.get('/students', getStudents);

// Hostel Management
router.get('/hostels', getHostels);
router.post('/hostels', createHostel);
router.put('/hostels/:id', updateHostel);
router.put('/hostels/:id/settings', updateHostel);
router.delete('/hostels/:id', deleteHostel);
router.post('/hostels/:id/clear', clearHostelData);
router.get('/hostels/:hostelId/rules', getHostelAllocationRules);

// Allocation Rules Management
router.get('/allocation-rules', getAllocationRules);
router.post('/allocation-rules', createAllocationRule);
router.put('/allocation-rules/:ruleId', updateAllocationRule);
router.delete('/allocation-rules/:ruleId', deleteAllocationRule);

// Block Management
router.get('/blocks', getBlocks);
router.post('/blocks', createBlock);
router.delete('/blocks/:id', deleteBlock);
router.put('/blocks/:id/reserve', toggleBlockReservation);

// Floor Management
router.get('/floors', getFloors);
router.post('/floors', createFloor);
router.post('/floors/bulk', bulkCreateFloors);
router.delete('/floors/:id', deleteFloor);
router.put('/floors/:id/reserve', toggleFloorReservation);

// Room Management
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.post('/rooms/bulk', verifyAdmin, validateBulkRoom, bulkCreateRooms);
router.delete('/rooms/:id', deleteRoom);
router.put('/rooms/:id/reserve', toggleRoomReservation);
router.post('/rooms/:roomId/release', releaseOccupants);

module.exports = router;
