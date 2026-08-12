const { Student, Hostel, Block, Floor, Room, Booking, PDFHistory } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { generateAllocationPDF } = require('../utils/pdfGenerator');

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

    // Find eligible active hostels if not locked
    const now = new Date();
    const eligibleHostels = isLocked ? [] : await Hostel.findAll({
      where: {
        allowed_gender: student.gender,
        allowed_programme: student.programme,
        allowed_year: student.year,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      }
    });

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

// Get Active & Eligible Hostels for Student
async function getEligibleHostels(req, res) {
  try {
    const student = req.student;
    const now = new Date();

    const hostels = await Hostel.findAll({
      where: {
        allowed_gender: student.gender,
        allowed_programme: student.programme,
        allowed_year: student.year,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      order: [['name', 'ASC']]
    });

    return res.json({ hostels });
  } catch (err) {
    console.error('Error in getEligibleHostels:', err);
    return res.status(500).json({ error: 'Failed to fetch eligible hostels.' });
  }
}

// Get Non-Reserved Blocks of an Eligible Hostel
async function getHostelBlocks(req, res) {
  try {
    const { hostelId } = req.params;
    const student = req.student;
    const now = new Date();

    // Verify hostel is valid, eligible, and within active time window
    const hostel = await Hostel.findOne({
      where: {
        hostel_id: hostelId,
        allowed_gender: student.gender,
        allowed_programme: student.programme,
        allowed_year: student.year,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      }
    });

    if (!hostel) {
      return res.status(403).json({ error: 'Hostel is unavailable or does not match eligibility criteria / active time window.' });
    }

    const blocks = await Block.findAll({
      where: {
        hostel_id: hostelId,
        is_reserved: false
      },
      order: [['name', 'ASC']]
    });

    return res.json({ blocks });
  } catch (err) {
    console.error('Error in getHostelBlocks:', err);
    return res.status(500).json({ error: 'Failed to fetch blocks.' });
  }
}

// Get Non-Reserved Floors of a Block
async function getBlockFloors(req, res) {
  try {
    const { blockId } = req.params;

    const block = await Block.findOne({
      where: { block_id: blockId, is_reserved: false }
    });

    if (!block) {
      return res.status(404).json({ error: 'Block is reserved or not found.' });
    }

    const floors = await Floor.findAll({
      where: {
        block_id: blockId,
        is_reserved: false
      },
      order: [['floor_number', 'ASC']]
    });

    return res.json({ floors });
  } catch (err) {
    console.error('Error in getBlockFloors:', err);
    return res.status(500).json({ error: 'Failed to fetch floors.' });
  }
}

// Get Non-Reserved Rooms of a Floor with Statuses
async function getFloorRooms(req, res) {
  try {
    const { floorId } = req.params;

    const floor = await Floor.findOne({
      where: { floor_id: floorId, is_reserved: false }
    });

    if (!floor) {
      return res.status(404).json({ error: 'Floor is reserved or not found.' });
    }

    const rooms = await Room.findAll({
      where: {
        floor_id: floorId,
        is_reserved: false
      },
      order: [['room_number', 'ASC']]
    });

    return res.json({ rooms });
  } catch (err) {
    console.error('Error in getFloorRooms:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
}

// Download Allocation PDF (Serves Latest Version from PDFHistory)
async function downloadAllocationPDF(req, res) {
  try {
    const studentRoll = req.student.roll_number;

    // Check if current version exists in PDFHistory
    let latestPdf = await PDFHistory.findOne({
      where: { student_roll: studentRoll, is_current: true },
      order: [['version', 'DESC']]
    });

    if (latestPdf && fs.existsSync(latestPdf.pdf_path)) {
      return res.download(latestPdf.pdf_path, `Allocation_Certificate_${studentRoll}_v${latestPdf.version}.pdf`);
    }

    // Fallback: Generate Initial Version (v1) if missing
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

    const booking = await Booking.findOne({
      where: { student_roll: studentRoll, room_id: student.booked_room_id }
    });

    let primaryStudent = student;
    let secondaryStudent = null;

    if (booking && booking.paired_with) {
      const pairedStudentObj = await Student.findOne({ where: { roll_number: booking.paired_with } });
      if (booking.is_primary) {
        secondaryStudent = pairedStudentObj;
      } else {
        primaryStudent = pairedStudentObj;
        secondaryStudent = student;
      }
    }

    const room = student.BookedRoom;
    const floor = room.Floor;
    const block = floor.Block;
    const hostel = block.Hostel;

    const { filePath } = await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: block.name,
      floorNumber: floor.floor_number,
      roomNumber: room.room_number,
      student1: primaryStudent,
      student2: secondaryStudent,
      allocationDate: booking ? booking.booking_date : new Date(),
      isSwap: false,
      version: 1
    });

    latestPdf = await PDFHistory.create({
      student_roll: studentRoll,
      room_id: room.room_id,
      pdf_path: filePath,
      version: 1,
      is_swap: false,
      is_current: true
    });

    return res.download(filePath, `Allocation_Certificate_${studentRoll}_v1.pdf`);
  } catch (err) {
    console.error('Error in downloadAllocationPDF:', err);
    return res.status(500).json({ error: 'Failed to generate and download allocation PDF.' });
  }
}

module.exports = {
  getStudentDashboard,
  getEligibleHostels,
  getHostelBlocks,
  getBlockFloors,
  getFloorRooms,
  downloadAllocationPDF
};
