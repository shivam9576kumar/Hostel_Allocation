const { Student, Hostel, Block, Floor, Room, Booking, PDFHistory, AllocationRule } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { generateAllocationPDF } = require('../utils/pdfGenerator');
const redisClient = require('../config/redis');

// Student Dashboard Info & State Persistence Check
async function getStudentDashboard(req, res) {
  try {
    const studentRoll = req.student.roll_number;

    const student = await Student.findOne({
      where: { roll_number: studentRoll },
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const isLocked = student.booking_status === 'Locked';

    // Find latest PDF history entry to check version & swap status
    const latestPdf = await PDFHistory.findOne({
      where: { student_roll: studentRoll, is_current: true },
      order: [['version', 'DESC']]
    });

    // Find eligible hostels if not locked based on Global Settings & Allocation Rules
    const { GlobalSetting } = require('../models');
    const now = new Date();
    let eligibleHostels = [];

    if (!isLocked) {
      const settings = await GlobalSetting.findOne({ where: { id: 1 } });
      const isWindowActive = settings && settings.booking_start_time && settings.booking_end_time
        ? (now >= new Date(settings.booking_start_time) && now <= new Date(settings.booking_end_time))
        : true; // Default to true if not strictly set

      if (isWindowActive) {
        const allHostels = await Hostel.findAll({
          order: [['name', 'ASC']]
        });

        for (const hostel of allHostels) {
          const ruleCount = await AllocationRule.count({
            where: {
              hostel_id: hostel.hostel_id,
              programme: student.programme,
              [Op.and]: [
                { [Op.or]: [{ gender: student.gender }, { gender: null }] },
                { [Op.or]: [{ allowed_year: student.year }, { allowed_year: null }] }
              ]
            }
          });
          if (ruleCount > 0) {
            eligibleHostels.push(hostel);
          }
        }
      }
    }

    return res.json({
      student,
      bookingStatus: student.booking_status,
      redirectToPdf: isLocked,
      pdfInfo: latestPdf ? {
        version: latestPdf.version,
        isSwap: latestPdf.is_swap,
        generatedAt: latestPdf.generated_at
      } : null,
      eligibleHostels
    });
  } catch (err) {
    console.error('Error in getStudentDashboard:', err);
    return res.status(500).json({ error: 'Failed to fetch student dashboard details.' });
  }
}

// Get Active & Eligible Hostels for Student (Redis Cached - 5-min TTL)
async function getEligibleHostels(req, res) {
  try {
    const student = req.student;
    const cacheKey = `hostels:${student.gender}:${student.programme}:${student.year}`;

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning]:', cacheErr.message);
    }

    const { GlobalSetting } = require('../models');
    const now = new Date();

    const settings = await GlobalSetting.findOne({ where: { id: 1 } });
    const isWindowActive = settings && settings.booking_start_time && settings.booking_end_time
      ? (now >= new Date(settings.booking_start_time) && now <= new Date(settings.booking_end_time))
      : true;

    if (!isWindowActive) {
      return res.status(403).json({ error: 'Global booking window is currently closed.' });
    }

    const allHostels = await Hostel.findAll({
      order: [['name', 'ASC']]
    });

    const hostels = [];
    for (const hostel of allHostels) {
      const ruleCount = await AllocationRule.count({
        where: {
          hostel_id: hostel.hostel_id,
          programme: student.programme,
          [Op.and]: [
            { [Op.or]: [{ gender: student.gender }, { gender: null }] },
            { [Op.or]: [{ allowed_year: student.year }, { allowed_year: null }] }
          ]
        }
      });
      if (ruleCount > 0) {
        hostels.push(hostel);
      }
    }

    const responsePayload = { hostels };

    // Store in Redis with 300s TTL (5 minutes)
    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), 'EX', 300);
    } catch (setCacheErr) {
      console.warn('[Redis Cache Set Warning]:', setCacheErr.message);
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Error in getEligibleHostels:', err);
    return res.status(500).json({ error: 'Failed to fetch eligible hostels.' });
  }
}

// Get Non-Reserved Blocks of an Eligible Hostel (Redis Cached - 5-min TTL)
async function getHostelBlocks(req, res) {
  try {
    const { hostelId } = req.params;
    const student = req.student;
    const cacheKey = `blocks:${hostelId}:${student.programme}:${student.gender}:${student.year}`;

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning]:', cacheErr.message);
    }

    const hostel = await Hostel.findByPk(hostelId);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    // Check rules for student's programme, gender, and year
    const rules = await AllocationRule.findAll({
      where: {
        hostel_id: hostelId,
        programme: student.programme,
        [Op.and]: [
          { [Op.or]: [{ gender: student.gender }, { gender: null }] },
          { [Op.or]: [{ allowed_year: student.year }, { allowed_year: null }] }
        ]
      }
    });

    if (rules.length === 0) {
      return res.status(403).json({ error: 'No block allocation rule matches your programme and year for this hostel.' });
    }

    const allowedBlockIds = [...new Set(rules.map(r => r.block_id))];
    const blocks = await Block.findAll({
      where: {
        hostel_id: hostelId,
        block_id: { [Op.in]: allowedBlockIds },
        is_reserved: false
      },
      order: [['name', 'ASC']]
    });

    const responsePayload = { blocks };

    // Store in Redis with 300s TTL (5 minutes)
    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), 'EX', 300);
    } catch (setCacheErr) {
      console.warn('[Redis Cache Set Warning]:', setCacheErr.message);
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Error in getHostelBlocks:', err);
    return res.status(500).json({ error: 'Failed to fetch blocks.' });
  }
}

// Get Non-Reserved Floors of a Block (Redis Cached - 5-min TTL)
async function getBlockFloors(req, res) {
  try {
    const { blockId } = req.params;
    const student = req.student;
    const cacheKey = `floors:${blockId}:${student.programme}:${student.year}`;

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning]:', cacheErr.message);
    }

    const block = await Block.findOne({
      where: { block_id: blockId, is_reserved: false }
    });

    if (!block) {
      return res.status(404).json({ error: 'Block is reserved or not found.' });
    }

    // Check floor range rules for student's programme and year
    const rules = await AllocationRule.findAll({
      where: {
        block_id: blockId,
        programme: student.programme,
        [Op.or]: [
          { allowed_year: student.year },
          { allowed_year: null }
        ]
      }
    });

    let floorWhere = {
      block_id: blockId,
      is_reserved: false
    };

    if (rules.length > 0) {
      const rangeConditions = rules.map(r => ({
        floor_number: { [Op.between]: [r.floor_start, r.floor_end] }
      }));
      floorWhere[Op.or] = rangeConditions;
    }

    const floors = await Floor.findAll({
      where: floorWhere,
      order: [['floor_number', 'ASC']]
    });

    const responsePayload = { floors };

    // Store in Redis with 300s TTL (5 minutes)
    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), 'EX', 300);
    } catch (setCacheErr) {
      console.warn('[Redis Cache Set Warning]:', setCacheErr.message);
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Error in getBlockFloors:', err);
    return res.status(500).json({ error: 'Failed to fetch floors.' });
  }
}

// Get Non-Reserved Rooms of a Floor (Redis Cached - 30-sec Short TTL for Real-time Occupancy)
async function getFloorRooms(req, res) {
  try {
    const { floorId } = req.params;
    const student = req.student;
    const cacheKey = `rooms:${floorId}:${student.programme}:${student.gender}:${student.year}`;

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning]:', cacheErr.message);
    }

    const floor = await Floor.findByPk(floorId, {
      include: [{ model: Block }]
    });

    if (!floor || floor.is_reserved) {
      return res.status(404).json({ error: 'Floor is reserved or not found.' });
    }

    const rule = await AllocationRule.findOne({
      where: {
        hostel_id: floor.Block.hostel_id,
        block_id: floor.Block.block_id,
        programme: student.programme,
        [Op.and]: [
          { [Op.or]: [{ gender: student.gender }, { gender: null }] },
          { [Op.or]: [{ allowed_year: student.year }, { allowed_year: null }] }
        ]
      }
    });

    const whereClause = {
      floor_id: floorId,
      is_reserved: false
    };

    if (rule && rule.capacity) {
      whereClause.capacity = rule.capacity;
    }

    const rooms = await Room.findAll({
      where: whereClause,
      attributes: ['room_id', 'room_number', 'status', 'capacity', 'current_occupancy'],
      order: [['room_number', 'ASC']]
    });

    const responsePayload = { success: true, rooms };

    // Store in Redis with 30s short TTL for real-time room occupancy updates
    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), 'EX', 30);
    } catch (setCacheErr) {
      console.warn('[Redis Cache Set Warning]:', setCacheErr.message);
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Error in getFloorRooms:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
}

// Download Allocation PDF (Serves Latest Version from PDFHistory)
async function downloadAllocationPDF(req, res) {
  try {
    const studentRoll = req.student.roll_number;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 1. Fetch the student with room details
    const student = await Student.findOne({
      where: { roll_number: studentRoll },
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        }
      ]
    });

    if (!student || student.booking_status !== 'Locked' || !student.BookedRoom) {
      return res.status(400).json({ error: 'No active locked room booking found for PDF download.' });
    }

    const room = student.BookedRoom;
    const floor = room.Floor;
    const block = floor.Block;
    const hostel = block.Hostel;

    // 2. Fetch ALL occupants of the room
    const allOccupants = await Student.findAll({
      where: { booked_room_id: room.room_id },
      order: [['created_at', 'ASC'], ['roll_number', 'ASC']]
    });

    // 3. Extract roll numbers for comparison
    const occupantRolls = allOccupants.map(s => s.roll_number).sort();

    // 4. Check if a cached PDF exists
    const latestPdf = await PDFHistory.findOne({
      where: { student_roll: studentRoll, is_current: true },
      order: [['version', 'DESC']]
    });

    // 5. Determine if cached PDF matches current occupants
    if (latestPdf && fs.existsSync(latestPdf.pdf_path) && req.query.forceRefresh !== 'true') {
      const cachedEntries = await PDFHistory.findAll({
        where: { room_id: room.room_id, is_current: true }
      });
      const cachedRolls = cachedEntries.map(e => e.student_roll).sort();

      if (JSON.stringify(cachedRolls) === JSON.stringify(occupantRolls)) {
        return res.download(latestPdf.pdf_path, `Allocation_Certificate_${studentRoll}_v${latestPdf.version}.pdf`);
      } else {
        // Occupants changed – delete old cached file
        try {
          if (fs.existsSync(latestPdf.pdf_path)) {
            fs.unlinkSync(latestPdf.pdf_path);
          }
        } catch (unlinkErr) {
          console.warn('Could not delete old PDF:', unlinkErr.message);
        }
        await PDFHistory.update(
          { is_current: false },
          { where: { room_id: room.room_id } }
        );
      }
    }

    // 6. Generate a fresh PDF with ALL occupants
    const student1 = allOccupants[0] || student;
    const student2 = allOccupants[1] || null;
    const student3 = allOccupants[2] || null;

    const booking = await Booking.findOne({
      where: { student_roll: studentRoll, room_id: room.room_id }
    });

    const version = (latestPdf ? latestPdf.version + 1 : 1);

    const { filePath } = await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: block.name,
      floorNumber: floor.floor_number,
      roomNumber: room.room_number,
      student1: student1,
      student2: student2,
      student3: student3,
      allocationDate: booking ? booking.booking_date : new Date(),
      isSwap: false,
      version: version
    });

    // 7. Save PDFHistory entries for ALL occupants
    for (const occupant of allOccupants) {
      await PDFHistory.update(
        { is_current: false },
        { where: { student_roll: occupant.roll_number } }
      );
      await PDFHistory.create({
        student_roll: occupant.roll_number,
        room_id: room.room_id,
        pdf_path: filePath,
        version: version,
        is_swap: false,
        is_current: true
      });
    }

    // 8. Serve the new PDF
    return res.download(filePath, `Allocation_Certificate_${studentRoll}_v${version}.pdf`);

  } catch (err) {
    console.error('Error in downloadAllocationPDF:', err);
    return res.status(500).json({ error: 'Failed to generate and download allocation PDF.' });
  }
}

// Get Room Occupants & Live Details for RoomStatusCard
async function getRoomOccupants(req, res) {
  try {
    const { roomId } = req.params;

    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: Floor,
          include: [{ model: Block, include: [Hostel] }]
        }
      ]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const occupants = await Student.findAll({
      where: { booked_room_id: roomId },
      attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'booking_status'],
      order: [['created_at', 'ASC'], ['roll_number', 'ASC']]
    });

    return res.json({
      success: true,
      room,
      occupants
    });
  } catch (err) {
    console.error('Error in getRoomOccupants:', err);
    return res.status(500).json({ error: 'Failed to fetch room occupants.' });
  }
}

// Get PDF status (whether the current PDF is ready)
async function getPdfStatus(req, res) {
  try {
    const studentRoll = req.student.roll_number;

    // Find the latest current PDF for this student
    const latestPdf = await PDFHistory.findOne({
      where: { student_roll: studentRoll, is_current: true },
      order: [['version', 'DESC']],
    });

    return res.json({
      isReady: !!latestPdf,
      version: latestPdf ? latestPdf.version : null,
      pdfPath: latestPdf ? latestPdf.pdf_path : null,
    });
  } catch (err) {
    console.error('Error in getPdfStatus:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ✅ Direct booking for single seater rooms
async function bookSingleSeater(req, res) {
  try {
    const studentId = req.student ? req.student.student_id : req.body.studentId;
    const roomId = req.body.roomId;

    const room = await Room.findByPk(roomId, {
      include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.capacity !== 1) {
      return res.status(400).json({ error: 'This is not a single seater room.' });
    }

    if (room.current_occupancy >= 1) {
      return res.status(400).json({ error: 'Room is already occupied.' });
    }

    const student = req.student || await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.booked_room_id || student.booking_status === 'Allocated') {
      return res.status(400).json({ error: 'Student already has a room allocation.' });
    }

    // Allocate student to room
    await Student.update(
      { booked_room_id: roomId, booking_status: 'Allocated' },
      { where: { roll_number: student.roll_number } }
    );

    // Update room occupancy & status
    await room.update({ current_occupancy: 1, status: 'Locked' });

    // Generate PDF for single student
    const { generateSinglePDF } = require('../utils/pdfGenerator');
    const pdfPath = await generateSinglePDF(student, room);

    // Save to pdf_history
    await PDFHistory.create({
      student_roll: student.roll_number,
      room_id: roomId,
      pdf_path: pdfPath,
      generated_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Single student allocated successfully',
      pdf_path: pdfPath
    });
  } catch (error) {
    console.error('❌ Error in single booking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getStudentDashboard,
  getEligibleHostels,
  getHostelBlocks,
  getBlockFloors,
  getFloorRooms,
  downloadAllocationPDF,
  getRoomOccupants,
  getPdfStatus,
  bookSingleSeater
};
