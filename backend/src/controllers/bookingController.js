const { Student, Room, Floor, Block, Hostel, Booking, AllocationRule, PDFHistory, sequelize } = require('../models');
const redisClient = require('../config/redis');
const { generatePairingCode } = require('../utils/codeGenerator');
const { generateAllocationPDF } = require('../utils/pdfGenerator');
const { Op } = require('sequelize');

// Helper for Dialect-Aware Row Locking
function getLockOption(t) {
  return sequelize.getDialect() === 'postgres' ? { lock: t.LOCK.UPDATE } : {};
}

// Helper: Shared Room Pairing Execution Engine
async function executeRoomPairing({ room, studentB, code, transaction, hostel }) {
  const now = new Date();

  // 1. Get existing bookings in this room
  const existingBookings = await Booking.findAll({
    where: { room_id: room.room_id },
    transaction
  });

  const alreadyJoined = existingBookings.some(b => b.student_roll === studentB.roll_number);
  if (alreadyJoined) {
    if (!transaction.finished) await transaction.rollback();
    return { error: 'You have already joined this room.', status: 400 };
  }

  const primaryBooking = existingBookings.find(b => b.is_primary) || existingBookings[0];
  if (!primaryBooking) {
    if (!transaction.finished) await transaction.rollback();
    return { error: 'Primary booking not found for this room.', status: 400 };
  }

  if (primaryBooking.student_roll === studentB.roll_number) {
    if (!transaction.finished) await transaction.rollback();
    return { error: 'Primary student cannot pair with themselves.', status: 400 };
  }

  const studentA = await Student.findOne({ where: { roll_number: primaryBooking.student_roll }, transaction });

  // 2. Create secondary booking for studentB
  await Booking.create({
    room_id: room.room_id,
    student_roll: studentB.roll_number,
    booking_date: now,
    is_primary: false,
    paired_with: studentA ? studentA.roll_number : null
  }, { transaction });

  // Update primary booking paired_with if null
  if (!primaryBooking.paired_with) {
    await primaryBooking.update({ paired_with: studentB.roll_number }, { transaction });
  }

  const newOccupancy = existingBookings.length + 1;
  const isFullCapacity = newOccupancy >= room.capacity;

  if (isFullCapacity) {
    // Capacity reached! Lock room and set all occupants to Locked
    await room.update({
      status: 'Locked',
      current_occupancy: newOccupancy,
      pairing_code: null,
      code_expiry: null
    }, { transaction });

    const allBookings = await Booking.findAll({
      where: { room_id: room.room_id },
      transaction
    });
    const allRolls = allBookings.map(b => b.student_roll);

    await Student.update({
      booking_status: 'Locked',
      booked_room_id: room.room_id
    }, {
      where: { roll_number: allRolls },
      transaction
    });

    await transaction.commit();

    // Clear Redis keys
    try {
      if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`room:code:${room.room_id}`);
        if (code) await redisClient.del(`code:${code.trim()}`);
      }
    } catch (rDelErr) {
      console.warn('[Redis Del Warning]:', rDelErr.message);
    }

    // Generate PDF for all occupants and save to PDFHistory
    const allOccupants = await Student.findAll({
      where: { roll_number: allRolls },
      order: [['created_at', 'ASC'], ['roll_number', 'ASC']]
    });

    const { filePath } = await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: room.Floor.Block.name,
      floorNumber: room.Floor.floor_number,
      roomNumber: room.room_number,
      student1: allOccupants[0] || studentA,
      student2: allOccupants[1] || studentB,
      student3: allOccupants[2] || null,
      allocationDate: now
    });

    for (const occ of allOccupants) {
      await PDFHistory.update(
        { is_current: false },
        { where: { student_roll: occ.roll_number } }
      );
      await PDFHistory.create({
        student_roll: occ.roll_number,
        room_id: room.room_id,
        pdf_path: filePath,
        version: 1,
        is_swap: false,
        is_current: true
      });
    }

    return {
      result: {
        message: `Room ${room.room_number} pairing completed! Room is now locked at full capacity (${newOccupancy}/${room.capacity}).`,
        redirectToPdf: true,
        room: {
          room_id: room.room_id,
          room_number: room.room_number,
          status: 'Locked',
          current_occupancy: newOccupancy,
          capacity: room.capacity
        }
      }
    };
  } else {
    // Room has additional capacity remaining (e.g. 2nd student in a 3-capacity room)
    await room.update({
      status: 'Pending_Pairing',
      current_occupancy: newOccupancy
      // Keep pairing_code and code_expiry active
    }, { transaction });

    await Student.update({
      booking_status: 'Pending_Pairing',
      booked_room_id: room.room_id
    }, {
      where: { roll_number: studentB.roll_number },
      transaction
    });

    await transaction.commit();

    return {
      result: {
        message: `Joined Room ${room.room_number}! Waiting for ${room.capacity - newOccupancy} more roommate(s) (${newOccupancy}/${room.capacity}).`,
        redirectToPdf: false,
        room: {
          room_id: room.room_id,
          room_number: room.room_number,
          status: 'Pending_Pairing',
          current_occupancy: newOccupancy,
          capacity: room.capacity
        }
      }
    };
  }
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

    if (hostel.allowed_gender !== student.gender) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Student gender does not match hostel criteria.' });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking time window has expired or is not yet active.' });
    }

    // Check Allocation Rules for hostel, block, floor, programme and year
    const rules = await AllocationRule.findAll({
      where: {
        hostel_id: hostel.hostel_id,
        programme: student.programme,
        [Op.or]: [
          { allowed_year: student.year },
          { allowed_year: null }
        ]
      },
      transaction
    });

    if (rules.length > 0) {
      const matchingRule = rules.find(r => 
        r.block_id === room.Floor.block_id && 
        room.Floor.floor_number >= r.floor_start && 
        room.Floor.floor_number <= r.floor_end
      );

      if (!matchingRule) {
        if (!transaction.finished) await transaction.rollback();
        return res.status(403).json({ error: `Your programme (${student.programme}) & Year (${student.year}) is not eligible for Block ${room.Floor.Block.name}, Floor ${room.Floor.floor_number}.` });
      }
    } else {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'No active allocation rule permits your programme and year for this room.' });
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

    // 8. Store in Redis key room:code:{roomId} and code:{pairingCode} with 600s TTL
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
        status: 'Pending_Pairing',
        capacity: room.capacity
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

// Step 2: Roommate Pairs via Specific Room Endpoint
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

    if (studentB.booking_status !== 'Pending') {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: `You already have an active booking status: ${studentB.booking_status}` });
    }

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

    const hostel = room.Floor.Block.Hostel;
    if (hostel.allowed_gender !== studentB.gender) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Student gender does not match hostel criteria.' });
    }

    const rules = await AllocationRule.findAll({
      where: {
        hostel_id: hostel.hostel_id,
        programme: studentB.programme,
        [Op.or]: [
          { allowed_year: studentB.year },
          { allowed_year: null }
        ]
      },
      transaction
    });

    if (rules.length === 0) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'You do not match the hostel eligibility requirements.' });
    }

    const matchingRule = rules.find(r =>
      r.block_id === room.Floor.block_id &&
      room.Floor.floor_number >= r.floor_start &&
      room.Floor.floor_number <= r.floor_end
    );

    if (!matchingRule) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ 
        error: `Your programme (${studentB.programme}) & Year (${studentB.year}) is not eligible for Block ${room.Floor.Block.name}, Floor ${room.Floor.floor_number}.` 
      });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking window has closed.' });
    }

    const outcome = await executeRoomPairing({ room, studentB, code, transaction, hostel });
    if (outcome.error) {
      return res.status(outcome.status || 400).json({ error: outcome.error });
    }
    return res.json(outcome.result);

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

    if (studentB.booking_status !== 'Pending') {
      return res.status(400).json({ error: `You already have an active booking status: ${studentB.booking_status}` });
    }

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

    const hostel = room.Floor.Block.Hostel;
    if (hostel.allowed_gender !== studentB.gender) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Student gender does not match hostel criteria.' });
    }

    const rules = await AllocationRule.findAll({
      where: {
        hostel_id: hostel.hostel_id,
        programme: studentB.programme,
        [Op.or]: [
          { allowed_year: studentB.year },
          { allowed_year: null }
        ]
      },
      transaction
    });

    if (rules.length === 0) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'You do not match the hostel eligibility requirements.' });
    }

    const matchingRule = rules.find(r =>
      r.block_id === room.Floor.block_id &&
      room.Floor.floor_number >= r.floor_start &&
      room.Floor.floor_number <= r.floor_end
    );

    if (!matchingRule) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ 
        error: `Your programme (${studentB.programme}) & Year (${studentB.year}) is not eligible for Block ${room.Floor.Block.name}, Floor ${room.Floor.floor_number}.` 
      });
    }

    if (now < new Date(hostel.start_time) || now > new Date(hostel.end_time)) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(403).json({ error: 'Hostel booking window has closed.' });
    }

    const outcome = await executeRoomPairing({ room, studentB, code: cleanCode, transaction, hostel });
    if (outcome.error) {
      return res.status(outcome.status || 400).json({ error: outcome.error });
    }
    return res.json(outcome.result);

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
