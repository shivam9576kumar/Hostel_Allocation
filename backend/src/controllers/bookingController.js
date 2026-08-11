const { Student, Room, Floor, Block, Hostel, Booking, sequelize } = require('../models');
const redisClient = require('../config/redis');
const { generatePairingCode } = require('../utils/codeGenerator');
const { generateAllocationPDF } = require('../utils/pdfGenerator');
const { Op } = require('sequelize');

// Helper for Dialect-Aware Row Locking
function getLockOption(t) {
  return sequelize.getDialect() === 'postgres' ? { lock: t.LOCK.UPDATE } : {};
}

// Step 1: Primary Student Books Vacant Room & Gets 10-Minute Pairing Code
async function bookRoom(req, res) {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { roomId } = req.params;
    const student = req.student;

    // 1. Check student current booking status
    if (student.booking_status !== 'Pending') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: `Student already has an active booking in status: ${student.booking_status}` });
    }

    // 2. Query Room with row locking
    const room = await Room.findByPk(roomId, {
      transaction,
      ...getLockOption(transaction),
      include: [{
        model: Floor,
        include: [{
          model: Block,
          include: [Hostel]
        }]
      }]
    });

    if (!room) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.is_reserved || room.Floor.is_reserved || room.Floor.Block.is_reserved) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'This room or its block/floor is reserved and unavailable.' });
    }

    if (room.status !== 'Vacant') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: `Room is no longer vacant (Current status: ${room.status}).` });
    }

    // 3. Verify Hostel eligibility and time window
    const hostel = room.Floor.Block.Hostel;
    const now = new Date();

    if (
      hostel.allowed_gender !== student.gender ||
      hostel.allowed_programme !== student.programme ||
      hostel.allowed_year !== student.year
    ) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Student does not match hostel eligibility criteria.' });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking time window has expired or is not yet active.' });
    }

    // 4. Generate 6-digit numeric code & 10-minute expiry
    const pairingCode = generatePairingCode();
    const expiryTime = new Date(now.getTime() + 10 * 60 * 1000); // +10 mins

    // 5. Update room state to Pending_Pairing
    await room.update({
      status: 'Pending_Pairing',
      pairing_code: pairingCode,
      code_expiry: expiryTime,
      current_occupancy: 1
    }, { transaction });

    // 6. Create Primary Booking
    await Booking.create({
      room_id: room.room_id,
      student_roll: student.roll_number,
      booking_date: now,
      is_primary: true,
      paired_with: null
    }, { transaction });

    // 7. Update Student Status
    await Student.update({
      booking_status: 'Pending_Pairing',
      booked_room_id: room.room_id
    }, {
      where: { roll_number: student.roll_number },
      transaction
    });

    await transaction.commit();

    // 8. Store in Redis key room:code:{roomId} and code:{pairingCode} with 600s TTL (Safely handled)
    try {
      if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`room:code:${room.room_id}`, pairingCode, 'EX', 600);
        await redisClient.set(`code:${pairingCode}`, room.room_id.toString(), 'EX', 600);
      }
    } catch (redisErr) {
      console.warn('[Redis Store Warning]:', redisErr.message);
    }

    return res.json({
      message: 'Room selected successfully. Share pairing code with your roommate within 10 minutes.',
      pairingCode,
      codeExpiry: expiryTime,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        status: 'Pending_Pairing'
      }
    });

  } catch (err) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr.message);
      }
    }
    console.error('Error in bookRoom:', err);
    return res.status(500).json({ error: `Booking failed: ${err.message}` });
  }
}

// Step 2: Roommate Enters 10-Minute Pairing Code & Locks Room
async function pairRoom(req, res) {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { roomId } = req.params;
    const { code } = req.body;
    const studentB = req.student;

    if (!code) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Pairing code is required.' });
    }

    // 1. Verify Student B status
    if (studentB.booking_status !== 'Pending') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: `You already have an active booking status: ${studentB.booking_status}` });
    }

    // 2. Query Room with row locking
    const room = await Room.findByPk(roomId, {
      transaction,
      ...getLockOption(transaction),
      include: [{
        model: Floor,
        include: [{
          model: Block,
          include: [Hostel]
        }]
      }]
    });

    if (!room) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.status !== 'Pending_Pairing') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Room is not currently pending roommate pairing.' });
    }

    // 3. Verify Redis TTL & Code
    let redisCode = null;
    try {
      if (redisClient && typeof redisClient.get === 'function') {
        redisCode = await redisClient.get(`room:code:${room.room_id}`);
      }
    } catch (rErr) {
      console.warn('[Redis Fetch Warning]:', rErr.message);
    }

    const now = new Date();
    const isCodeValid = (redisCode && redisCode === code.trim()) ||
      (room.pairing_code === code.trim() && room.code_expiry && now < new Date(room.code_expiry));

    if (!isCodeValid) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Invalid or expired pairing code. Room pairing window (10 minutes) has expired.' });
    }

    // 4. Verify Student B hostel eligibility
    const hostel = room.Floor.Block.Hostel;
    if (
      hostel.allowed_gender !== studentB.gender ||
      hostel.allowed_programme !== studentB.programme ||
      hostel.allowed_year !== studentB.year
    ) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'You do not match the hostel eligibility requirements.' });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking window has closed.' });
    }

    // 5. Find Primary Booking (Student A)
    const primaryBooking = await Booking.findOne({
      where: {
        room_id: room.room_id,
        is_primary: true
      },
      transaction
    });

    if (!primaryBooking) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Primary booking not found for this room.' });
    }

    if (primaryBooking.student_roll === studentB.roll_number) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Primary student cannot pair with themselves.' });
    }

    const studentA = await Student.findOne({ where: { roll_number: primaryBooking.student_roll }, transaction });

    // 6. Update Primary Booking paired_with
    await primaryBooking.update({
      paired_with: studentB.roll_number
    }, { transaction });

    // 7. Create Secondary Booking for Student B
    await Booking.create({
      room_id: room.room_id,
      student_roll: studentB.roll_number,
      booking_date: now,
      is_primary: false,
      paired_with: studentA.roll_number
    }, { transaction });

    // 8. Update Room state to Locked and capacity = 2
    await room.update({
      status: 'Locked',
      current_occupancy: 2,
      pairing_code: null,
      code_expiry: null
    }, { transaction });

    // 9. Update Student A & Student B booking_status to Locked
    await Student.update({
      booking_status: 'Locked',
      booked_room_id: room.room_id
    }, {
      where: {
        roll_number: [studentA.roll_number, studentB.roll_number]
      },
      transaction
    });

    await transaction.commit();

    // 10. Delete Redis Keys
    try {
      if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`room:code:${room.room_id}`);
        await redisClient.del(`code:${code.trim()}`);
      }
    } catch (rDelErr) {
      console.warn('[Redis Del Warning]:', rDelErr.message);
    }

    // 11. Generate Allocation PDF
    await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: room.Floor.Block.name,
      floorNumber: room.Floor.floor_number,
      roomNumber: room.room_number,
      student1: studentA,
      student2: studentB,
      allocationDate: now
    });

    return res.json({
      message: 'Room pairing completed successfully! Room is now locked.',
      redirectToPdf: true,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        status: 'Locked'
      }
    });

  } catch (err) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr.message);
      }
    }
    console.error('Error in pairRoom:', err);
    return res.status(500).json({ error: `Pairing failed: ${err.message}` });
  }
}

// Step 3: Roommate Enters Pairing Code Directly (Instant Code Entry)
async function pairByCode(req, res) {
  let transaction;
  try {
    const { code } = req.body;
    const studentB = req.student;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Pairing code is required.' });
    }

    const cleanCode = code.trim();

    // 1. Verify Student B status
    if (studentB.booking_status !== 'Pending') {
      return res.status(400).json({ error: `You already have an active booking status: ${studentB.booking_status}` });
    }

    // 2. Resolve roomId via Redis or DB lookup
    let roomId = null;
    try {
      if (redisClient && typeof redisClient.get === 'function') {
        const redisRoomId = await redisClient.get(`code:${cleanCode}`);
        if (redisRoomId) {
          roomId = parseInt(redisRoomId, 10);
        }
      }
    } catch (rErr) {
      console.warn('[Redis Lookup Warning]:', rErr.message);
    }

    transaction = await sequelize.transaction();

    let room;
    if (roomId) {
      room = await Room.findByPk(roomId, {
        transaction,
        ...getLockOption(transaction),
        include: [{
          model: Floor,
          include: [{
            model: Block,
            include: [Hostel]
          }]
        }]
      });
    }

    // Fallback to database lookup if not found in Redis or if roomId wasn't valid
    if (!room) {
      room = await Room.findOne({
        where: { pairing_code: cleanCode },
        transaction,
        ...getLockOption(transaction),
        include: [{
          model: Floor,
          include: [{
            model: Block,
            include: [Hostel]
          }]
        }]
      });
    }

    if (!room) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Invalid or expired pairing code. Room not found.' });
    }

    if (room.status !== 'Pending_Pairing') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Room is not currently pending roommate pairing.' });
    }

    const now = new Date();
    const isCodeValid = (room.pairing_code === cleanCode) && room.code_expiry && (now < new Date(room.code_expiry));

    if (!isCodeValid) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Invalid or expired pairing code. Room pairing window (10 minutes) has expired.' });
    }

    // 3. Verify Student B hostel eligibility
    const hostel = room.Floor.Block.Hostel;
    if (
      hostel.allowed_gender !== studentB.gender ||
      hostel.allowed_programme !== studentB.programme ||
      hostel.allowed_year !== studentB.year
    ) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'You do not match the hostel eligibility requirements.' });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking window has closed.' });
    }

    // 4. Find Primary Booking (Student A)
    const primaryBooking = await Booking.findOne({
      where: {
        room_id: room.room_id,
        is_primary: true
      },
      transaction
    });

    if (!primaryBooking) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Primary booking not found for this room.' });
    }

    if (primaryBooking.student_roll === studentB.roll_number) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Primary student cannot pair with themselves.' });
    }

    const studentA = await Student.findOne({ where: { roll_number: primaryBooking.student_roll }, transaction });

    // 5. Update Primary Booking paired_with
    await primaryBooking.update({
      paired_with: studentB.roll_number
    }, { transaction });

    // 6. Create Secondary Booking for Student B
    await Booking.create({
      room_id: room.room_id,
      student_roll: studentB.roll_number,
      booking_date: now,
      is_primary: false,
      paired_with: studentA.roll_number
    }, { transaction });

    // 7. Update Room state to Locked and capacity = 2
    await room.update({
      status: 'Locked',
      current_occupancy: 2,
      pairing_code: null,
      code_expiry: null
    }, { transaction });

    // 8. Update Student A & Student B booking_status to Locked
    await Student.update({
      booking_status: 'Locked',
      booked_room_id: room.room_id
    }, {
      where: {
        roll_number: [studentA.roll_number, studentB.roll_number]
      },
      transaction
    });

    await transaction.commit();

    // 9. Delete Redis Keys
    try {
      if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`room:code:${room.room_id}`);
        await redisClient.del(`code:${cleanCode}`);
      }
    } catch (rDelErr) {
      console.warn('[Redis Del Warning]:', rDelErr.message);
    }

    // 10. Generate Allocation PDF
    await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: room.Floor.Block.name,
      floorNumber: room.Floor.floor_number,
      roomNumber: room.room_number,
      student1: studentA,
      student2: studentB,
      allocationDate: now
    });

    return res.json({
      message: 'Room pairing completed successfully! Room is now locked.',
      redirectToPdf: true,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        status: 'Locked'
      }
    });

  } catch (err) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr.message);
      }
    }
    console.error('Error in pairByCode:', err);
    return res.status(500).json({ error: `Pairing failed: ${err.message}` });
  }
}

module.exports = {
  bookRoom,
  pairRoom,
  pairByCode
};

