const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const {
  uploadStudents,
  getHostels,
  getHostelById,
  getHostelSummary,
  createHostel,
  updateHostel,
  deleteHostel,
  clearHostelData,
  getBlocks,
  getBlockById,
  getBlockSummary,
  createBlock,
  deleteBlock,
  toggleBlockReservation,
  getFloors,
  getFloorById,
  getFloorSummary,
  createFloor,
  bulkCreateFloors,
  deleteFloor,
  toggleFloorReservation,
  getRooms,
  getRoomById,
  getRoomOccupants,
  createRoom,
  bulkCreateRooms,
  bulkReserveRooms,
  bulkDeleteRooms,
  deleteRoom,
  toggleRoomReservation,
  releaseOccupants,
  getStudents,
  getStudentCount,
  getStudentProfile,
  getStudentHistory,
  batchRemoveStudents,
  archiveStudent,
  unarchiveStudent,
  deleteStudent,
  exportStudents,
  getAvailableRooms,
  assignRoom,
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  getHostelAllocationRules,
  getFailedPdfJobs,
  retryFailedPdfJob,
  getEligibleStudentsForRoom,
  assignStudentToRoom,
  searchEligibleStudent
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

const settingsController = require('../controllers/settingsController');

// All admin routes are protected by adminAuth middleware
router.use(adminAuth);

// Global Settings Routes
router.get('/settings', settingsController.getGlobalSettings);
router.put('/settings', settingsController.updateGlobalSettings);

// Student Roster Management
router.post('/upload-students', upload.single('file'), uploadStudents);
router.get('/students/count', getStudentCount);
router.get('/students', getStudents);
router.get('/students/export', exportStudents);
router.get('/students/:rollNumber/profile', getStudentProfile);
router.get('/students/:rollNumber/history', getStudentHistory);
router.delete('/students/batch', batchRemoveStudents);
router.delete('/students/:rollNumber', verifyAdmin, deleteStudent);
router.put('/students/:rollNumber/archive', archiveStudent);
router.put('/students/:rollNumber/unarchive', unarchiveStudent);
router.get('/students/:rollNumber/available-rooms', getAvailableRooms);
router.post('/students/:rollNumber/assign-room', assignRoom);

// Hostel Management
router.get('/hostels', getHostels);
router.get('/hostels/:hostelId/summary', getHostelSummary);
router.get('/hostels/:id', getHostelById);
router.get('/hostels/:hostelId', getHostelById);
router.post('/hostels', createHostel);
router.put('/hostels/:id', updateHostel);
router.put('/hostels/:id/settings', updateHostel);
router.delete('/hostels/:id', deleteHostel);
router.delete('/hostels/:hostelId', deleteHostel);
router.post('/hostels/:id/clear', clearHostelData);
router.post('/hostels/:hostelId/clear', clearHostelData);
router.get('/hostels/:hostelId/rules', getHostelAllocationRules);

// Allocation Rules Management
router.get('/allocation-rules', getAllocationRules);
router.post('/allocation-rules', createAllocationRule);
router.put('/allocation-rules/:ruleId', updateAllocationRule);
router.delete('/allocation-rules/:ruleId', deleteAllocationRule);

// Block Management
router.get('/blocks/summary', getBlockSummary);
router.get('/blocks/:blockId/summary', getBlockSummary);
router.get('/blocks', getBlocks);
router.get('/blocks/:id', getBlockById);
router.get('/blocks/:blockId', getBlockById);
router.get('/blocks/:blockId/floors', getFloors);
router.post('/blocks', createBlock);
router.delete('/blocks/:id', deleteBlock);
router.put('/blocks/:id/reserve', toggleBlockReservation);

// Floor Management
router.get('/floors/summary', getFloorSummary);
router.get('/floors/:floorId/summary', getFloorSummary);
router.get('/floors', getFloors);
router.get('/floors/:id', getFloorById);
router.post('/floors', createFloor);
router.post('/floors/bulk', bulkCreateFloors);
router.delete('/floors/:id', deleteFloor);
router.put('/floors/:id/reserve', toggleFloorReservation);

// Room Management
router.get('/rooms', getRooms);
router.put('/rooms/bulk-reserve', bulkReserveRooms);
router.delete('/rooms/bulk-delete', bulkDeleteRooms);
router.get('/rooms/:id', getRoomById);
router.get('/rooms/:roomId/occupants', getRoomOccupants);
router.post('/rooms', createRoom);
router.post('/rooms/bulk', bulkCreateRooms);
router.delete('/rooms/:id', deleteRoom);
router.put('/rooms/:id/reserve', toggleRoomReservation);
router.post('/rooms/:roomId/release', releaseOccupants);
router.get('/rooms/:roomId/eligible-students', verifyAdmin, getEligibleStudentsForRoom);
router.post('/rooms/:roomId/assign-student', verifyAdmin, assignStudentToRoom);
router.get('/rooms/:roomId/search-student', verifyAdmin, searchEligibleStudent);

// PDF Queue Dead Letter Queue (DLQ) Management
router.get('/pdf-failures', getFailedPdfJobs);
router.post('/pdf-failures/:jobId/retry', retryFailedPdfJob);

module.exports = router;
