const { Student, Room, Floor, Block, Hostel, Booking, SwapRequest, PDFHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const { setSwapActive, isSwapActive } = require('../config/redis');
const { generateAllocationPDF } = require('../utils/pdfGenerator');

// Utility helper to parse JSON safely
function parseJsonSafe(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
  return value || {};
}

// Helper to regenerate PDFs post-swap for ALL involved occupants of both rooms
async function regenerateSwapPDFs(involvedRolls, transaction) {
  const oldPdfPaths = {};
  const newPdfPaths = {};

  for (const roll of involvedRolls) {
    // 1. Get current PDF history entry
    const currentPdf = await PDFHistory.findOne({
      where: { student_roll: roll, is_current: true },
      order: [['version', 'DESC']],
      transaction
    });

    if (currentPdf) {
      oldPdfPaths[roll] = currentPdf.pdf_path;
      await currentPdf.update({ is_current: false }, { transaction });
    }

    const nextVersion = currentPdf ? currentPdf.version + 1 : 2;

    // 2. Fetch updated student details
    const student = await Student.findByPk(roll, {
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        }
      ],
      transaction
    });

    if (!student || !student.BookedRoom) {
      console.warn(`[regenerateSwapPDFs] Student ${roll} has no booked room. Skipping PDF.`);
      continue;
    }

    const room = student.BookedRoom;
    const floor = room.Floor;
    const block = floor.Block;
    const hostel = block.Hostel;

    // 3. Fetch all current roommates in the same room (excluding self)
    const roommates = await Student.findAll({
      where: {
        booked_room_id: room.room_id,
        roll_number: { [Op.ne]: roll }
      },
      order: [['roll_number', 'ASC']],
      transaction
    });

    const { filePath } = await generateAllocationPDF({
      hostelName: hostel.name,
      blockName: block.name,
      floorNumber: floor.floor_number,
      roomNumber: room.room_number,
      student1: student,
      roommates: roommates,
      allocationDate: new Date(),
      isSwap: true,
      version: nextVersion
    });

    await PDFHistory.create({
      student_roll: roll,
      room_id: room.room_id,
      pdf_path: filePath,
      version: nextVersion,
      is_swap: true,
      is_current: true
    }, { transaction });

    newPdfPaths[roll] = filePath;
  }

  return { oldPdfPaths, newPdfPaths };
}

// 1. Get Eligible Rooms for Swap (Student)
async function getEligibleRooms(req, res) {
  try {
    const studentRoll = req.student.roll_number;
    const student = await Student.findByPk(studentRoll, {
      include: [{ model: Room, as: 'BookedRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }]
    });

    if (!student || !student.booked_room_id || student.booking_status !== 'Locked') {
      return res.status(400).json({ error: 'You must have an active locked room booking to request a swap.' });
    }

    const currentRoom = student.BookedRoom;
    const roomCapacity = currentRoom.capacity || 2;

    // Check if initiator's own room is fully occupied
    if (currentRoom.current_occupancy !== roomCapacity) {
      return res.status(400).json({
        error: `Room swap requires your room to be fully occupied (${currentRoom.current_occupancy}/${roomCapacity} occupants currently).`
      });
    }

    const hostelId = currentRoom.Floor?.Block?.hostel_id;

    // Find all active pending or consenting swap requests to exclude rooms already involved
    const activeSwaps = await SwapRequest.findAll({
      where: {
        status: { [Op.in]: ['Pending', 'Consenting'] }
      }
    });

    const busyRoomIds = new Set();
    activeSwaps.forEach(swap => {
      busyRoomIds.add(swap.source_room_id);
      busyRoomIds.add(swap.target_room_id);
    });

    // Fetch rooms in same hostel that have matching capacity AND are fully occupied
    const rooms = await Room.findAll({
      where: {
        room_id: { [Op.ne]: currentRoom.room_id },
        capacity: roomCapacity, // Must match same capacity
        current_occupancy: roomCapacity // Must be 100% fully occupied
      },
      include: [
        {
          model: Floor,
          required: true,
          include: [
            {
              model: Block,
              required: true,
              where: { hostel_id: hostelId },
              include: [Hostel]
            }
          ]
        },
        {
          model: Student,
          attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year']
        }
      ],
      order: [['room_number', 'ASC']]
    });

    const eligibleRooms = rooms.filter(r => !busyRoomIds.has(r.room_id));

    // Fetch occupants of initiator's own room for UI roommate selection
    const sourceOccupants = await Student.findAll({
      where: { booked_room_id: currentRoom.room_id },
      attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year']
    });

    return res.json({
      eligibleRooms,
      sourceRoom: {
        room_id: currentRoom.room_id,
        room_number: currentRoom.room_number,
        capacity: roomCapacity,
        current_occupancy: currentRoom.current_occupancy,
        occupants: sourceOccupants
      }
    });
  } catch (err) {
    console.error('Error in getEligibleRooms:', err);
    return res.status(500).json({ error: `Failed to fetch eligible rooms: ${err.message}` });
  }
}

// 2. Create Swap Request (Student)
async function createRequest(req, res) {
  try {
    const initiatorRoll = req.student.roll_number;
    let { target_room_id, swap_type, movers, target_student_roll } = req.body;

    if (!target_room_id || !swap_type) {
      return res.status(400).json({ error: 'target_room_id and swap_type are required.' });
    }

    // Normalize legacy type
    if (swap_type === 'individual') swap_type = 'single';

    if (!['single', 'double', 'full'].includes(swap_type)) {
      return res.status(400).json({ error: 'swap_type must be "single", "double", or "full".' });
    }

    const initiator = await Student.findByPk(initiatorRoll, {
      include: [{ model: Room, as: 'BookedRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }]
    });

    if (!initiator || !initiator.booked_room_id || initiator.booking_status !== 'Locked') {
      return res.status(400).json({ error: 'Initiator must have an active locked booking.' });
    }

    const sourceRoom = initiator.BookedRoom;
    const sourceRoomId = sourceRoom.room_id;
    const sourceCapacity = sourceRoom.capacity || 2;

    if (sourceRoomId === parseInt(target_room_id, 10)) {
      return res.status(400).json({ error: 'Source room and target room must be different.' });
    }

    // Validate full occupancy of initiator room
    if (sourceRoom.current_occupancy !== sourceCapacity) {
      return res.status(400).json({
        error: `Your room must be fully occupied (${sourceRoom.current_occupancy}/${sourceCapacity}) to initiate a swap.`
      });
    }

    const targetRoom = await Room.findByPk(target_room_id, {
      include: [
        { model: Floor, include: [{ model: Block, include: [Hostel] }] },
        { model: Student }
      ]
    });

    if (!targetRoom) {
      return res.status(404).json({ error: 'Target room not found.' });
    }

    const targetCapacity = targetRoom.capacity || 2;

    // Validate capacity for swap
    const reqSourceMoversCount = swap_type === 'single' ? 1 : (swap_type === 'double' ? 2 : sourceCapacity);
    const reqTargetMoversCount = swap_type === 'single' ? 1 : (swap_type === 'double' ? 2 : targetCapacity);

    if (reqSourceMoversCount > targetCapacity) {
      return res.status(400).json({
        error: `Cannot swap ${reqSourceMoversCount} students into a ${targetCapacity}-seater room.`
      });
    }

    const availableVacanciesInTarget = targetCapacity - (targetRoom.current_occupancy - reqTargetMoversCount);
    if (reqSourceMoversCount > availableVacanciesInTarget) {
      return res.status(400).json({
        error: `Room is full or does not have enough capacity for ${reqSourceMoversCount} student(s).`
      });
    }

    const sourceHostelId = sourceRoom.Floor?.Block?.hostel_id;
    const targetHostelId = targetRoom.Floor?.Block?.hostel_id;

    if (sourceHostelId !== targetHostelId) {
      return res.status(400).json({ error: 'Both rooms must belong to the same hostel.' });
    }

    // Validate swap type vs capacity
    if (sourceCapacity === 2 && swap_type === 'double') {
      return res.status(400).json({ error: 'Double swap (2↔2) is only supported for 3-seater rooms.' });
    }

    // Check active busy swap requests
    const busySwap = await SwapRequest.findOne({
      where: {
        status: { [Op.in]: ['Pending', 'Consenting'] },
        [Op.or]: [
          { source_room_id: sourceRoomId },
          { target_room_id: sourceRoomId },
          { source_room_id: target_room_id },
          { target_room_id: target_room_id }
        ]
      }
    });

    if (busySwap) {
      return res.status(400).json({ error: 'One or both rooms are already involved in an active pending swap request.' });
    }

    // Fetch occupants of both rooms
    const sourceOccupants = await Student.findAll({ where: { booked_room_id: sourceRoomId } });
    const targetOccupants = await Student.findAll({ where: { booked_room_id: target_room_id } });

    const sourceOccupantRolls = sourceOccupants.map(s => s.roll_number);
    const targetOccupantRolls = targetOccupants.map(s => s.roll_number);

    let sourceMovers = [];
    let targetMovers = [];

    if (swap_type === 'single') {
      // Initiator is auto the source mover
      sourceMovers = [initiatorRoll];

      // Target mover
      let targetMover = null;
      if (movers && Array.isArray(movers.target_movers) && movers.target_movers.length === 1) {
        targetMover = movers.target_movers[0];
      } else if (target_student_roll) {
        targetMover = target_student_roll;
      }

      if (!targetMover || !targetOccupantRolls.includes(targetMover)) {
        return res.status(400).json({ error: 'Single swap requires selecting exactly 1 valid student from the target room.' });
      }
      targetMovers = [targetMover];

    } else if (swap_type === 'double') {
      if (sourceCapacity !== 3) {
        return res.status(400).json({ error: 'Double swap is only supported for rooms with capacity 3.' });
      }

      // Source movers: initiator + 1 roommate
      if (movers && Array.isArray(movers.source_movers)) {
        sourceMovers = movers.source_movers;
      }
      if (!sourceMovers.includes(initiatorRoll)) {
        sourceMovers.push(initiatorRoll);
      }
      sourceMovers = [...new Set(sourceMovers)];

      if (sourceMovers.length !== 2 || !sourceMovers.every(r => sourceOccupantRolls.includes(r))) {
        return res.status(400).json({ error: 'Double swap requires selecting exactly 1 roommate from your room to move with you.' });
      }

      // Target movers: exactly 2 students from target room
      if (movers && Array.isArray(movers.target_movers)) {
        targetMovers = [...new Set(movers.target_movers)];
      }

      if (targetMovers.length !== 2 || !targetMovers.every(r => targetOccupantRolls.includes(r))) {
        return res.status(400).json({ error: 'Double swap requires selecting exactly 2 students from the target room.' });
      }

    } else if (swap_type === 'full') {
      // Full swap: all occupants in both rooms move
      sourceMovers = sourceOccupantRolls;
      targetMovers = targetOccupantRolls;
    }

    // Consent Collection: ONLY MOVERS must consent!
    const involvedMovers = [...sourceMovers, ...targetMovers];
    const consents = {};
    involvedMovers.forEach(roll => {
      if (roll === initiatorRoll) {
        consents[roll] = true; // Initiator auto-consents
      } else {
        consents[roll] = null; // null = pending response
      }
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours TTL

    const swapRequest = await SwapRequest.create({
      initiator_roll: initiatorRoll,
      source_room_id: sourceRoomId,
      target_room_id: parseInt(target_room_id, 10),
      target_student_roll: targetMovers.length === 1 ? targetMovers[0] : null,
      swap_type,
      movers: {
        source_movers: sourceMovers,
        target_movers: targetMovers
      },
      status: 'Consenting',
      consents,
      expires_at: expiresAt
    });

    return res.status(201).json({
      message: 'Swap request created successfully. Awaiting required consents from moving students.',
      swapRequest
    });
  } catch (err) {
    console.error('Error in createRequest:', err);
    return res.status(500).json({ error: `Failed to create swap request: ${err.message}` });
  }
}

// 3. Give Consent (Student)
async function giveConsent(req, res) {
  try {
    const studentRoll = req.student.roll_number;
    const { id } = req.params;
    const { consent } = req.body;

    console.log(`📝 giveConsent called: reqId=${id}, roll=${studentRoll}, consent=${consent}`);

    const swapRequest = await SwapRequest.findByPk(id);
    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    if (swapRequest.status !== 'Pending' && swapRequest.status !== 'Consenting') {
      return res.status(400).json({ error: `Cannot give consent to a swap request with status: ${swapRequest.status}` });
    }

    if (new Date() > new Date(swapRequest.expires_at)) {
      await swapRequest.update({ status: 'Expired' });
      return res.status(400).json({ error: 'Swap request has expired.' });
    }

    let consents = parseJsonSafe(swapRequest.consents);

    if (!(studentRoll in consents)) {
      return res.status(403).json({
        error: 'You are not a moving student in this swap request. Stayers are automatically notified and do not need to consent.'
      });
    }

    // Update the consent
    if (consent === false) {
      consents[studentRoll] = false;
      await swapRequest.update({
        consents: JSON.stringify(consents),
        status: 'Cancelled'
      });
      await swapRequest.reload();
      return res.json({
        message: 'Swap request rejected and cancelled.',
        swapRequest: swapRequest.toJSON()
      });
    }

    // Consent is true
    consents[studentRoll] = true;
    const allConsented = Object.values(consents).every(val => val === true);
    const consentsString = JSON.stringify(consents);

    if (allConsented) {
      console.log('✅ All movers consented! Executing swap...');
      await swapRequest.update({ consents: consentsString });
      const pdfResults = await executeSwapInternal(swapRequest);
      await swapRequest.reload();
      return res.json({
        message: 'All required consents received! Room swap executed and updated certificates generated.',
        swapRequest: swapRequest.toJSON(),
        newPdfPaths: pdfResults.newPdfPaths
      });
    } else {
      await swapRequest.update({
        consents: consentsString,
        status: 'Consenting'
      });
      await swapRequest.reload();
      return res.json({
        message: 'Consent recorded successfully. Awaiting remaining mover consents.',
        swapRequest: swapRequest.toJSON()
      });
    }
  } catch (err) {
    console.error('❌ Error in giveConsent:', err);
    return res.status(500).json({ error: `Failed to process consent: ${err.message}` });
  }
}

// Internal Transactional Execution Function
async function executeSwapInternal(swapRequest) {
  const transaction = await sequelize.transaction();
  try {
    const sourceRoomId = swapRequest.source_room_id;
    const targetRoomId = swapRequest.target_room_id;
    const swapType = swapRequest.swap_type;

    console.log(`🔄 Executing ${swapType} swap: Room ${sourceRoomId} ↔ Room ${targetRoomId}`);

    // Fetch ALL occupants from BOTH rooms BEFORE updates
    const sourceOccupants = await Student.findAll({
      where: { booked_room_id: sourceRoomId },
      transaction
    });
    const targetOccupants = await Student.findAll({
      where: { booked_room_id: targetRoomId },
      transaction
    });

    const sourceOccupantRolls = sourceOccupants.map(s => s.roll_number);
    const targetOccupantRolls = targetOccupants.map(s => s.roll_number);

    // All occupants in both rooms (4 for 2-seater, 6 for 3-seater)
    const allOccupantRolls = [...sourceOccupantRolls, ...targetOccupantRolls];

    // Determine movers
    let movers = parseJsonSafe(swapRequest.movers);
    let sourceMovers = movers.source_movers || [];
    let targetMovers = movers.target_movers || [];

    // Fallback for legacy swap requests
    if (sourceMovers.length === 0 && targetMovers.length === 0) {
      if (swapType === 'full') {
        sourceMovers = sourceOccupantRolls;
        targetMovers = targetOccupantRolls;
      } else {
        sourceMovers = [swapRequest.initiator_roll];
        targetMovers = [swapRequest.target_student_roll];
      }
    }

    console.log(`  - Moving from Source (Room ${sourceRoomId} → ${targetRoomId}):`, sourceMovers);
    console.log(`  - Moving from Target (Room ${targetRoomId} → ${sourceRoomId}):`, targetMovers);

    // 1. Move source movers to target room
    for (const roll of sourceMovers) {
      await Student.update(
        { booked_room_id: targetRoomId },
        { where: { roll_number: roll }, transaction }
      );
      await Booking.update(
        { room_id: targetRoomId },
        { where: { student_roll: roll }, transaction }
      );
    }

    // 2. Move target movers to source room
    for (const roll of targetMovers) {
      await Student.update(
        { booked_room_id: sourceRoomId },
        { where: { roll_number: roll }, transaction }
      );
      await Booking.update(
        { room_id: sourceRoomId },
        { where: { student_roll: roll }, transaction }
      );
    }

    // 3. Stayers remain untouched in their respective rooms

    // 4. 🔥 CRITICAL: Regenerate PDFs for ALL occupants of BOTH rooms (4 or 6 students)
    console.log(`📄 Regenerating allocation PDFs for all ${allOccupantRolls.length} occupants...`);
    const { oldPdfPaths, newPdfPaths } = await regenerateSwapPDFs(allOccupantRolls, transaction);

    // 5. Update swap request status to Executed
    await swapRequest.update({
      status: 'Executed',
      old_pdf_paths: oldPdfPaths,
      new_pdf_paths: newPdfPaths
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Swap #${swapRequest.id} executed successfully! Certificates generated for: ${Object.keys(newPdfPaths).join(', ')}`);

    return { oldPdfPaths, newPdfPaths };

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Swap Execution Error:', err);
    throw err;
  }
}

// 4. Get Student Swap Requests (Student)
async function getStudentSwapRequests(req, res) {
  try {
    const studentRoll = req.student.roll_number;
    const student = await Student.findByPk(studentRoll);
    const userRoomId = student ? student.booked_room_id : null;

    const requests = await SwapRequest.findAll({
      include: [
        { model: Student, as: 'Initiator', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Student, as: 'TargetStudent', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Room, as: 'SourceRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] },
        { model: Room, as: 'TargetRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Include only if user is initiator or a moving student in consents AND request is active
    const userRequests = requests.filter(reqItem => {
      const consents = parseJsonSafe(reqItem.consents);
      const isInitiator = reqItem.initiator_roll === studentRoll;
      const isMover = studentRoll in consents;
      const isActive = ['Pending', 'Consenting'].includes(reqItem.status);
      return (isInitiator || isMover) && isActive;
    });

    return res.json({ swapRequests: userRequests });
  } catch (err) {
    console.error('Error in getStudentSwapRequests:', err);
    return res.status(500).json({ error: `Failed to fetch student swap requests: ${err.message}` });
  }
}

// 5. Get Swap Status by Request ID
async function getSwapStatus(req, res) {
  try {
    const { id } = req.params;
    const swapRequest = await SwapRequest.findByPk(id, {
      include: [
        { model: Student, as: 'Initiator', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Student, as: 'TargetStudent', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Room, as: 'SourceRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] },
        { model: Room, as: 'TargetRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }
      ]
    });

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    return res.json({ swapRequest });
  } catch (err) {
    console.error('Error in getSwapStatus:', err);
    return res.status(500).json({ error: 'Failed to fetch swap request status.' });
  }
}

// 6. Cancel Swap Request (Student or Admin)
async function cancelRequest(req, res) {
  try {
    const { id } = req.params;
    const studentRoll = req.student ? req.student.roll_number : null;

    const swapRequest = await SwapRequest.findByPk(id);
    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    if (swapRequest.status !== 'Pending' && swapRequest.status !== 'Consenting') {
      return res.status(400).json({ error: `Cannot cancel a swap request with status: ${swapRequest.status}` });
    }

    if (studentRoll && swapRequest.initiator_roll !== studentRoll) {
      const consents = typeof swapRequest.consents === 'string' ? JSON.parse(swapRequest.consents) : (swapRequest.consents || {});
      if (!(studentRoll in consents)) {
        return res.status(403).json({ error: 'Only participating moving students or an admin can cancel this request.' });
      }
    }

    await swapRequest.update({ status: 'Cancelled' });
    return res.json({ message: 'Swap request cancelled successfully.', swapRequest });
  } catch (err) {
    console.error('Error in cancelRequest:', err);
    return res.status(500).json({ error: 'Failed to cancel swap request.' });
  }
}

// 7. Admin Toggle Swap Activity
async function adminToggleSwap(req, res) {
  try {
    const { isActive } = req.body;
    const active = await setSwapActive(!!isActive);
    return res.json({ message: `Swap activity updated to ${active}`, swapActive: active });
  } catch (err) {
    console.error('Error in adminToggleSwap:', err);
    return res.status(500).json({ error: 'Failed to toggle swap activity.' });
  }
}

// 8. Admin Get Swap Active Status
async function adminGetSwapActive(req, res) {
  try {
    const active = await isSwapActive();
    return res.json({ swapActive: active });
  } catch (err) {
    console.error('Error in adminGetSwapActive:', err);
    return res.status(500).json({ error: 'Failed to fetch swap active status.' });
  }
}

// 9. Admin List Requests
async function adminListRequests(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const swapRequests = await SwapRequest.findAll({
      where,
      include: [
        { model: Student, as: 'Initiator', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Student, as: 'TargetStudent', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Room, as: 'SourceRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] },
        { model: Room, as: 'TargetRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json({ swapRequests });
  } catch (err) {
    console.error('Error in adminListRequests:', err);
    return res.status(500).json({ error: 'Failed to fetch swap requests.' });
  }
}

// 10. Admin Force Execute Swap Request
async function adminForceExecute(req, res) {
  try {
    const { id } = req.params;
    const swapRequest = await SwapRequest.findByPk(id);
    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    if (swapRequest.status === 'Executed') {
      return res.status(400).json({ error: 'Swap request has already been executed.' });
    }

    await executeSwapInternal(swapRequest);
    await swapRequest.reload();

    return res.json({ message: 'Swap request force-executed by admin.', swapRequest });
  } catch (err) {
    console.error('Error in adminForceExecute:', err);
    return res.status(500).json({ error: `Force execution failed: ${err.message}` });
  }
}

module.exports = {
  getEligibleRooms,
  createRequest,
  giveConsent,
  getStudentSwapRequests,
  getSwapStatus,
  cancelRequest,
  adminToggleSwap,
  adminGetSwapActive,
  adminListRequests,
  adminForceExecute
};
