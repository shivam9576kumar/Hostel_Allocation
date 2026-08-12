const { Student, Room, Floor, Block, Hostel, Booking, SwapRequest, PDFHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const { setSwapActive, isSwapActive } = require('../config/redis');
const { generateAllocationPDF } = require('../utils/pdfGenerator');

// Utility helper to parse JSON consents safely
function parseConsents(consents) {
  if (typeof consents === 'string') {
    try {
      return JSON.parse(consents);
    } catch (e) {
      return {};
    }
  }
  return consents || {};
}

// Helper to regenerate PDFs post-swap for all involved students
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

    // 2. Fetch updated student details & roommate
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

    const booking = await Booking.findOne({
      where: { student_roll: roll, room_id: student.booked_room_id },
      transaction
    });

    let primaryStudent = student;
    let secondaryStudent = null;

    if (booking && booking.paired_with) {
      const pairedStudentObj = await Student.findByPk(booking.paired_with, { transaction });
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

    // Fetch occupied rooms in same hostel
    const rooms = await Room.findAll({
      where: {
        room_id: { [Op.ne]: currentRoom.room_id },
        current_occupancy: { [Op.gt]: 0 }
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

    return res.json({ eligibleRooms });
  } catch (err) {
    console.error('Error in getEligibleRooms:', err);
    return res.status(500).json({ error: `Failed to fetch eligible rooms: ${err.message}` });
  }
}

// 2. Create Swap Request (Student)
async function createRequest(req, res) {
  try {
    const initiatorRoll = req.student.roll_number;
    const { target_room_id, swap_type, target_student_roll } = req.body;

    if (!target_room_id || !swap_type) {
      return res.status(400).json({ error: 'target_room_id and swap_type are required.' });
    }

    if (swap_type !== 'full' && swap_type !== 'individual') {
      return res.status(400).json({ error: 'swap_type must be either "full" or "individual".' });
    }

    if (swap_type === 'individual' && !target_student_roll) {
      return res.status(400).json({ error: 'target_student_roll is required for individual swap.' });
    }

    const initiator = await Student.findByPk(initiatorRoll, {
      include: [{ model: Room, as: 'BookedRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }]
    });

    if (!initiator || !initiator.booked_room_id || initiator.booking_status !== 'Locked') {
      return res.status(400).json({ error: 'Initiator must have an active locked booking.' });
    }

    const sourceRoomId = initiator.booked_room_id;
    if (sourceRoomId === parseInt(target_room_id, 10)) {
      return res.status(400).json({ error: 'Source room and target room must be different.' });
    }

    const targetRoom = await Room.findByPk(target_room_id, {
      include: [
        { model: Floor, include: [{ model: Block, include: [Hostel] }] },
        { model: Student }
      ]
    });

    if (!targetRoom || targetRoom.current_occupancy === 0) {
      return res.status(404).json({ error: 'Target room not found or is empty.' });
    }

    const sourceHostelId = initiator.BookedRoom.Floor?.Block?.hostel_id;
    const targetHostelId = targetRoom.Floor?.Block?.hostel_id;

    if (sourceHostelId !== targetHostelId) {
      return res.status(400).json({ error: 'Both rooms must belong to the same hostel.' });
    }

    // Check existing busy swap requests
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

    // Determine involved students
    const sourceOccupants = await Student.findAll({ where: { booked_room_id: sourceRoomId } });
    const targetOccupants = await Student.findAll({ where: { booked_room_id: target_room_id } });

    let involvedRolls = [];
    if (swap_type === 'full') {
      involvedRolls = [
        ...sourceOccupants.map(s => s.roll_number),
        ...targetOccupants.map(s => s.roll_number)
      ];
    } else {
      if (!targetOccupants.some(s => s.roll_number === target_student_roll)) {
        return res.status(400).json({ error: 'Target student is not an occupant of the target room.' });
      }
      involvedRolls = [initiatorRoll, target_student_roll];
    }

    const consents = {};
    involvedRolls.forEach(roll => {
      consents[roll] = (roll === initiatorRoll); // Initiator auto-consents
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours TTL

    const swapRequest = await SwapRequest.create({
      initiator_roll: initiatorRoll,
      source_room_id: sourceRoomId,
      target_room_id: parseInt(target_room_id, 10),
      target_student_roll: swap_type === 'individual' ? target_student_roll : null,
      swap_type,
      status: 'Consenting',
      consents,
      expires_at: expiresAt
    });

    return res.status(201).json({
      message: 'Swap request created successfully. Awaiting required consents.',
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

    console.log('📝 giveConsent called:');
    console.log('  - Request ID:', id);
    console.log('  - Student Roll:', studentRoll);
    console.log('  - Consent value:', consent);

    const swapRequest = await SwapRequest.findByPk(id);
    if (!swapRequest) {
      console.log('❌ Swap request not found');
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    console.log('  - Current status:', swapRequest.status);
    console.log('  - Current consents (raw):', swapRequest.consents);

    if (swapRequest.status !== 'Pending' && swapRequest.status !== 'Consenting') {
      return res.status(400).json({ error: `Cannot give consent to a swap request with status: ${swapRequest.status}` });
    }

    if (new Date() > new Date(swapRequest.expires_at)) {
      await swapRequest.update({ status: 'Expired' });
      return res.status(400).json({ error: 'Swap request has expired.' });
    }

    // Parse consents – handle both string and object
    let consents = typeof swapRequest.consents === 'string' 
      ? JSON.parse(swapRequest.consents) 
      : (swapRequest.consents || {});

    console.log('  - Parsed consents:', consents);

    if (!(studentRoll in consents)) {
      return res.status(403).json({ error: 'You are not part of this swap request.' });
    }

    // Update the consent
    if (consent === false) {
      consents[studentRoll] = false;
      const consentsString = JSON.stringify(consents);
      console.log('  - Rejecting: consents to save:', consentsString);
      await swapRequest.update({ consents: consentsString, status: 'Cancelled' });
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

    console.log('  - Updated consents:', consentsString);
    console.log('  - All consented?', allConsented);

    if (allConsented) {
      console.log('✅ All consented! Executing swap...');
      // Execute the swap (this function also updates the status)
      // Save stringified consents first so executeSwapInternal sees all consents true
      await swapRequest.update({ consents: consentsString });
      const pdfResults = await executeSwapInternal(swapRequest);
      await swapRequest.reload();
      return res.json({
        message: 'All required consents received! Room swap executed and new PDFs generated successfully.',
        swapRequest: swapRequest.toJSON(),
        newPdfPaths: pdfResults.newPdfPaths
      });
    } else {
      console.log('⏳ Not all consented. Updating consents in database...');
      // ✅ FIX: Stringify and save the consents
      await swapRequest.update({ 
        consents: consentsString, 
        status: 'Consenting' 
      });
      await swapRequest.reload();
      console.log('  - Database updated. New consents:', swapRequest.consents);
      
      return res.json({
        message: 'Consent recorded successfully. Awaiting remaining student consents.',
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
    const consentsMap = parseConsents(swapRequest.consents);
    const involvedRolls = Object.keys(consentsMap);

    if (swapType === 'full') {
      const sourceStudents = await Student.findAll({ where: { booked_room_id: sourceRoomId }, transaction });
      const targetStudents = await Student.findAll({ where: { booked_room_id: targetRoomId }, transaction });

      for (const s of sourceStudents) {
        await s.update({ booked_room_id: targetRoomId }, { transaction });
        await Booking.update({ room_id: targetRoomId }, { where: { student_roll: s.roll_number }, transaction });
      }
      for (const s of targetStudents) {
        await s.update({ booked_room_id: sourceRoomId }, { transaction });
        await Booking.update({ room_id: sourceRoomId }, { where: { student_roll: s.roll_number }, transaction });
      }
    } else {
      const initiator = await Student.findByPk(swapRequest.initiator_roll, { transaction });
      const targetStudent = await Student.findByPk(swapRequest.target_student_roll, { transaction });

      await initiator.update({ booked_room_id: targetRoomId }, { transaction });
      await Booking.update({ room_id: targetRoomId }, { where: { student_roll: initiator.roll_number }, transaction });

      await targetStudent.update({ booked_room_id: sourceRoomId }, { transaction });
      await Booking.update({ room_id: sourceRoomId }, { where: { student_roll: targetStudent.roll_number }, transaction });
    }

    // Regenerate PDFs for all affected students inside the transaction
    const { oldPdfPaths, newPdfPaths } = await regenerateSwapPDFs(involvedRolls, transaction);

    await swapRequest.update({
      status: 'Executed',
      old_pdf_paths: oldPdfPaths,
      new_pdf_paths: newPdfPaths
    }, { transaction });

    await transaction.commit();
    return { oldPdfPaths, newPdfPaths };
  } catch (err) {
    await transaction.rollback();
    console.error('Swap Execution Error:', err);
    throw err;
  }
}

// 4. Get Student Swap Requests (Student)
async function getStudentSwapRequests(req, res) {
  try {
    const studentRoll = req.student.roll_number;
    const requests = await SwapRequest.findAll({
      include: [
        { model: Student, as: 'Initiator', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Student, as: 'TargetStudent', attributes: ['roll_number', 'full_name', 'email'] },
        { model: Room, as: 'SourceRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] },
        { model: Room, as: 'TargetRoom', include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }] }
      ],
      order: [['created_at', 'DESC']]
    });

    const userRequests = requests.filter(reqItem => {
      const consents = parseConsents(reqItem.consents);
      return reqItem.initiator_roll === studentRoll || (studentRoll in consents);
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
      return res.status(403).json({ error: 'Only the initiator or an admin can cancel this request.' });
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
