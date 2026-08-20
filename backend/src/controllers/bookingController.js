const { Student, Room, Floor, Block, Hostel, Booking, AllocationRule, PDFHistory, sequelize } = require('../models');
const redisClient = require('../config/redis');
const pdfQueue = require('../queues/pdfQueue');
const { generatePairingCode } = require('../utils/codeGenerator');
const { generateAllocationPDF } = require('../utils/pdfGenerator');
const { Op } = require('sequelize');

// Helper for Dialect-Aware Row Locking
function getLockOption(t) {
  return sequelize.getDialect() === 'postgres' ? { lock: t.LOCK.UPDATE } : {};
}

// Helper: Shared Room Pairing Execution Engine
async function executeRoomPairing({ room, studentB, code, transaction, hostel, req }) {
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

    // Broadcast WebSocket room status update
    const broadcastRoomUpdate = req?.app?.get('broadcastRoomUpdate');
    if (broadcastRoomUpdate && room.floor_id) {
      broadcastRoomUpdate(room.floor_id, room.room_id, 'Locked', newOccupancy);
    }

    // Clear Redis keys
    try {
      if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`room:code:${room.room_id}`);
        if (code) await redisClient.del(`code:${code.trim()}`);
      }
    } catch (rDelErr) {
      console.warn('[Redis Del Warning]:', rDelErr.message);
    }

    // Queue asynchronous PDF generation job via BullMQ
    try {
      await pdfQueue.add('generate', {
        roomId: room.room_id,
        occupantRolls: allRolls,
        allocationDate: now
      });
      console.log(`📄 PDF generation job added to queue for room ${room.room_id}`);
    } catch (queueErr) {
      console.error('[pdfQueue Add Warning]:', queueErr.message);
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

    // Broadcast WebSocket room status update
    const broadcastRoomUpdate = req?.app?.get('broadcastRoomUpdate');
    if (broadcastRoomUpdate && room.floor_id) {
      broadcastRoomUpdate(room.floor_id, room.room_id, 'Pending_Pairing', newOccupancy);
    }

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
    await Room.findByPk(roomId, { transaction, ...getLockOption(transaction) });
    const room = await Room.findByPk(roomId, {
      transaction,
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

    // 3. Verify Global Booking Window (System-Wide)
    const { GlobalSetting } = require('../models');
    const now = new Date();
    const settings = await GlobalSetting.findOne({ where: { id: 1 }, transaction });

    if (settings && settings.booking_start_time && settings.booking_end_time) {
      const startTime = new Date(settings.booking_start_time);
      const endTime = new Date(settings.booking_end_time);

      if (now < startTime || now > endTime) {
        if (!transaction.finished) await transaction.rollback();
        return res.status(403).json({ error: 'System-wide booking window is currently closed or not active.' });
      }
    }

    // Check Allocation Rules for hostel, block, floor, programme and year
    const hostel = room.Floor.Block.Hostel;
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

    // Single Seater (Capacity = 1) Direct Allocation
    if (room.capacity === 1) {
      await room.update({
        status: 'Locked',
        pairing_code: null,
        code_expiry: null,
        current_occupancy: 1
      }, { transaction });

      await Booking.create({
        room_id: room.room_id,
        student_roll: student.roll_number,
        booking_date: now,
        is_primary: true,
        paired_with: null
      }, { transaction });

      await Student.update({
        booking_status: 'Locked',
        booked_room_id: room.room_id
      }, {
        where: { roll_number: student.roll_number },
        transaction
      });

      await transaction.commit();

      // Broadcast WebSocket room status update
      const broadcastRoomUpdate = req.app.get('broadcastRoomUpdate');
      if (broadcastRoomUpdate && room.floor_id) {
        broadcastRoomUpdate(room.floor_id, room.room_id, 'Locked', 1);
      }

      try {
        await pdfQueue.add('generate', {
          roomId: room.room_id,
          occupantRolls: [student.roll_number],
          allocationDate: now
        });
        console.log(`📄 Single student PDF generation job added to queue for room ${room.room_id}`);
      } catch (qErr) {
        console.warn('[Queue Warning]:', qErr.message);
      }

      return res.json({
        message: 'Single student allocated successfully.',
        booking_status: 'Locked',
        room: {
          room_id: room.room_id,
          room_number: room.room_number,
          status: 'Locked',
          current_occupancy: 1,
          capacity: 1
        }
      });
    }

    // 4. Generate 6-digit numeric code & 10-minute expiry
    const pairingCode = generatePairingCode();
    const expiryTime = new Date(now.getTime() + 10 * 60 * 1000); // +10 mins

    // 4b. Execute Atomic Room Lock via Redis Lua script
    try {
      if (redisClient && typeof redisClient.eval === 'function') {
        const lockLuaScript = `
          local lock_key = KEYS[1]
          local is_locked = redis.call('SETNX', lock_key, ARGV[1])
          if is_locked == 1 then
              redis.call('EXPIRE', lock_key, ARGV[2])
              return 1
          else
              return 0
          end
        `;
        const lockRes = await redisClient.eval(lockLuaScript, 1, `room:lock:${room.room_id}`, pairingCode, 600);
        if (lockRes === 0) {
          if (!transaction.finished) await transaction.rollback();
          return res.status(409).json({ error: 'Room is currently being booked by another student.' });
        }
      }
    } catch (redisLockErr) {
      console.warn('[Redis Lock Warning]:', redisLockErr.message);
    }

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

    // Broadcast WebSocket room status update
    const broadcastRoomUpdate = req.app.get('broadcastRoomUpdate');
    if (broadcastRoomUpdate && room.floor_id) {
      broadcastRoomUpdate(room.floor_id, room.room_id, 'Pending_Pairing', 1);
    }

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

    await Room.findByPk(roomId, { transaction, ...getLockOption(transaction) });
    const room = await Room.findByPk(roomId, {
      transaction,
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

    // Booking window check uses GlobalSetting (hostel model no longer has time fields)
    const { GlobalSetting } = require('../models');
    const gSettings = await GlobalSetting.findOne({ where: { id: 1 }, transaction });
    if (gSettings && gSettings.booking_start_time && gSettings.booking_end_time) {
      if (now < new Date(gSettings.booking_start_time) || now > new Date(gSettings.booking_end_time)) {
        if (!transaction.finished) await transaction.rollback();
        return res.status(403).json({ error: 'System-wide booking window is currently closed.' });
      }
    }

    const outcome = await executeRoomPairing({ room, studentB, code, transaction, hostel, req });
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
      await Room.findByPk(roomId, { transaction, ...getLockOption(transaction) });
      room = await Room.findByPk(roomId, {
        transaction,
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
      const rawRoom = await Room.findOne({ where: { pairing_code: cleanCode }, transaction });
      if (rawRoom) {
        await Room.findByPk(rawRoom.room_id, { transaction, ...getLockOption(transaction) });
        room = await Room.findByPk(rawRoom.room_id, {
          transaction,
          include: [{
            model: Floor,
            include: [{
              model: Block,
              include: [Hostel]
            }]
          }]
        });
      }
    }

    if (!room) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'Invalid or expired pairing code. Room not found.' });
    }

    if (room.capacity === 1) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: 'This is a single seater room. Single seater rooms do not support pairing codes. Please use direct booking.' });
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

    // Booking window check uses GlobalSetting (hostel model no longer has time fields)
    const { GlobalSetting: GS } = require('../models');
    const gSettings2 = await GS.findOne({ where: { id: 1 }, transaction });
    if (gSettings2 && gSettings2.booking_start_time && gSettings2.booking_end_time) {
      if (now < new Date(gSettings2.booking_start_time) || now > new Date(gSettings2.booking_end_time)) {
        if (!transaction.finished) await transaction.rollback();
        return res.status(403).json({ error: 'System-wide booking window is currently closed.' });
      }
    }

    const outcome = await executeRoomPairing({ room, studentB, code: cleanCode, transaction, hostel, req });
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
