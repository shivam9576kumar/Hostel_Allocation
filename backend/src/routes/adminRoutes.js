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
  deleteFloor,
  toggleFloorReservation,
  getRooms,
  createRoom,
  deleteRoom,
  toggleRoomReservation,
  getStudents
} = require('../controllers/adminController');

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
router.get('/students', getStudents);

// Hostel Management
router.get('/hostels', getHostels);
router.post('/hostels', createHostel);
router.put('/hostels/:id', updateHostel);
router.put('/hostels/:id/settings', updateHostel);
router.delete('/hostels/:id', deleteHostel);
router.post('/hostels/:id/clear', clearHostelData);

// Block Management
router.get('/blocks', getBlocks);
router.post('/blocks', createBlock);
router.delete('/blocks/:id', deleteBlock);
router.put('/blocks/:id/reserve', toggleBlockReservation);

// Floor Management
router.get('/floors', getFloors);
router.post('/floors', createFloor);
router.delete('/floors/:id', deleteFloor);
router.put('/floors/:id/reserve', toggleFloorReservation);

// Room Management
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.delete('/rooms/:id', deleteRoom);
router.put('/rooms/:id/reserve', toggleRoomReservation);

module.exports = router;
