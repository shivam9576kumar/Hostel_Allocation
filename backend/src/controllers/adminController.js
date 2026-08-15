const { parseAndInsertStudents } = require('../utils/csvParser');
const { Hostel, Block, Floor, Room, Booking, Student, SwapRequest, PDFHistory, AllocationRule, sequelize } = require('../models');
const { Op } = require('sequelize');

// 1. Upload Students Roster
async function uploadStudents(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV or Excel file uploaded.' });
    }

    const filePath = req.file.path;
    const result = await parseAndInsertStudents(filePath);

    return res.json({
      message: 'Student upload process completed.',
      result
    });
  } catch (err) {
    console.error('Error in uploadStudents:', err);
    return res.status(500).json({ error: `Upload processing failed: ${err.message}` });
  }
}

// 2. List Hostels
async function getHostels(req, res) {
  try {
    const where = {};

    const hostels = await Hostel.findAll({
      where,
      include: [
        {
          model: Block,
          include: [
            {
              model: Floor,
              include: [Room]
            }
          ]
        }
      ],
      order: [['hostel_id', 'ASC']]
    });

    return res.json({ hostels });
  } catch (err) {
    console.error('Error in getHostels:', err);
    return res.status(500).json({ error: 'Failed to fetch hostels.' });
  }
}

// 3. Create Hostel (ONLY Hostel Name)
async function createHostel(req, res) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Hostel name is required.' });
    }

    const hostel = await Hostel.create({
      name
    });

    return res.status(201).json({ message: 'Hostel created successfully.', hostel });
  } catch (err) {
    console.error('Error in createHostel:', err);
    return res.status(500).json({ error: 'Failed to create hostel.' });
  }
}

// 4. Update Hostel Details
async function updateHostel(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const hostel = await Hostel.findByPk(id);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    await hostel.update({
      name: name || hostel.name
    });

    return res.json({ message: 'Hostel updated successfully.', hostel });
  } catch (err) {
    console.error('Error in updateHostel:', err);
    return res.status(500).json({ error: 'Failed to update hostel.' });
  }
}

// 5. Delete Hostel (with student reset)
async function deleteHostel(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const hostel = await Hostel.findByPk(id, { transaction });
    if (!hostel) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Hostel not found' });
    }

    // 1. Find all rooms belonging to this hostel
    const rooms = await Room.findAll({
      attributes: ['room_id'],
      include: [{
        model: Floor,
        required: true,
        include: [{
          model: Block,
          required: true,
          where: { hostel_id: id }
        }]
      }],
      transaction
    });

    const roomIds = rooms.map(r => r.room_id);

    // 2. ✅ Reset students BEFORE deleting rooms
    if (roomIds.length > 0) {
      const updatedStudents = await Student.update(
        { 
          booked_room_id: null, 
          booking_status: 'Pending' 
        },
        { 
          where: { booked_room_id: roomIds },
          transaction 
        }
      );
      console.log(`🔄 Reset ${updatedStudents[0]} student(s) before deleting hostel #${id}`);
    }

    // 3. Delete all swap_requests referencing these rooms
    if (roomIds.length > 0) {
      await SwapRequest.destroy({
        where: {
          [Op.or]: [
            { source_room_id: roomIds },
            { target_room_id: roomIds }
          ]
        },
        transaction
      });
    }

    // 4. Delete the hostel (cascades to blocks → floors → rooms → bookings)
    await hostel.destroy({ transaction });

    await transaction.commit();
    return res.json({ 
      message: `Hostel "${hostel.name}" deleted successfully. All students have been reset.`,
      studentsReset: roomIds.length > 0 ? 'All assigned students reset to Pending' : 'No students affected'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete hostel error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete hostel',
      details: error.message 
    });
  }
}

// 6. Clear Hostel Data (with swap_requests cleanup)
async function clearHostelData(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Verify the hostel exists
    const hostel = await Hostel.findByPk(id, { transaction });
    if (!hostel) {
      await transaction.rollback();
      return res.status(404).json({ 
        error: `Hostel with ID ${id} not found` 
      });
    }

    // 2. Find all rooms belonging to this hostel (through blocks → floors)
    const rooms = await Room.findAll({
      attributes: ['room_id', 'floor_id'],
      include: [{
        model: Floor,
        required: true,
        include: [{
          model: Block,
          required: true,
          where: { hostel_id: id }
        }]
      }],
      transaction
    });

    const roomIds = rooms.map(r => r.room_id);

    let deletedSwaps = 0;
    let deletedBookings = 0;
    let studentsReset = 0;
    let deletedRooms = 0;

    // 3. 🔥 CRITICAL: Delete all swap_requests referencing these rooms FIRST
    if (roomIds.length > 0) {
      deletedSwaps = await SwapRequest.destroy({
        where: {
          [Op.or]: [
            { source_room_id: roomIds },
            { target_room_id: roomIds }
          ]
        },
        transaction
      });
      console.log(`🗑️ Deleted ${deletedSwaps} swap request(s) referencing rooms in hostel #${id}`);
    }

    // 4. Delete all bookings for rooms in this hostel
    if (roomIds.length > 0) {
      deletedBookings = await Booking.destroy({
        where: { room_id: roomIds },
        transaction
      });
      console.log(`🗑️ Deleted ${deletedBookings} booking(s) for rooms in hostel #${id}`);
    }

    // 5. Reset students who were booked in this hostel
    if (roomIds.length > 0) {
      const updatedStudents = await Student.update(
        { 
          booked_room_id: null, 
          booking_status: 'Pending' 
        },
        { 
          where: { booked_room_id: roomIds },
          transaction 
        }
      );
      studentsReset = updatedStudents[0] || 0;
      console.log(`🔄 Reset ${studentsReset} student(s) booked in hostel #${id}`);
    }

    // 6. Delete all rooms in this hostel
    if (roomIds.length > 0) {
      deletedRooms = await Room.destroy({
        where: { room_id: roomIds },
        transaction
      });
      console.log(`🗑️ Deleted ${deletedRooms} room(s) in hostel #${id}`);
    }

    // 7. Delete all floors in this hostel
    const floors = await Floor.findAll({
      attributes: ['floor_id'],
      include: [{
        model: Block,
        required: true,
        where: { hostel_id: id }
      }],
      transaction
    });
    const floorIds = floors.map(f => f.floor_id);
    let deletedFloors = 0;
    if (floorIds.length > 0) {
      deletedFloors = await Floor.destroy({
        where: { floor_id: floorIds },
        transaction
      });
      console.log(`🗑️ Deleted ${deletedFloors} floor(s) in hostel #${id}`);
    }

    // 8. Delete all blocks in this hostel
    const deletedBlocks = await Block.destroy({
      where: { hostel_id: id },
      transaction
    });
    console.log(`🗑️ Deleted ${deletedBlocks} block(s) in hostel #${id}`);

    // 9. ✅ Commit the transaction
    await transaction.commit();

    return res.json({ 
      success: true,
      message: `✅ All data cleared for hostel "${hostel.name}" (ID: ${id})`,
      summary: {
        hostel: hostel.name,
        blocksDeleted: deletedBlocks,
        floorsDeleted: deletedFloors,
        roomsDeleted: deletedRooms,
        bookingsDeleted: deletedBookings,
        swapRequestsDeleted: deletedSwaps,
        studentsReset: studentsReset
      }
    });

  } catch (error) {
    // Rollback the transaction on any error
    await transaction.rollback();
    console.error('❌ Clear hostel data error:', error);
    
    // Return a clear error message
    return res.status(500).json({ 
      success: false,
      error: 'Failed to clear hostel data.',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// 7. Blocks CRUD
async function getBlocks(req, res) {
  try {
    const { hostelId } = req.query;
    const where = {};
    if (hostelId && hostelId !== 'ALL') where.hostel_id = parseInt(hostelId, 10);

    const blocks = await Block.findAll({
      where,
      include: [Hostel],
      order: [['block_id', 'ASC']]
    });
    return res.json({ blocks });
  } catch (err) {
    console.error('Error in getBlocks:', err);
    return res.status(500).json({ error: 'Failed to fetch blocks.' });
  }
}

async function createBlock(req, res) {
  try {
    const { hostel_id, name } = req.body;
    if (!hostel_id || !name) {
      return res.status(400).json({ error: 'hostel_id and block name are required.' });
    }

    const block = await Block.create({ hostel_id, name, is_reserved: false });
    return res.status(201).json({ message: 'Block created successfully.', block });
  } catch (err) {
    console.error('Error in createBlock:', err);
    return res.status(500).json({ error: 'Failed to create block.' });
  }
}

async function deleteBlock(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const block = await Block.findByPk(id, { transaction });
    if (!block) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Block not found' });
    }

    // 1. Find all rooms in this block
    const rooms = await Room.findAll({
      attributes: ['room_id'],
      include: [{
        model: Floor,
        required: true,
        where: { block_id: id }
      }],
      transaction
    });

    const roomIds = rooms.map(r => r.room_id);

    // 2. ✅ Reset students assigned to these rooms
    if (roomIds.length > 0) {
      await Student.update(
        { booked_room_id: null, booking_status: 'Pending' },
        { where: { booked_room_id: roomIds }, transaction }
      );
    }

    // 3. Delete swap_requests referencing these rooms
    if (roomIds.length > 0) {
      await SwapRequest.destroy({
        where: {
          [Op.or]: [
            { source_room_id: roomIds },
            { target_room_id: roomIds }
          ]
        },
        transaction
      });
    }

    // 4. Delete the block (cascades to floors → rooms)
    await block.destroy({ transaction });

    await transaction.commit();
    return res.json({ message: `Block "${block.name}" deleted successfully.` });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete block error:', error);
    return res.status(500).json({ error: 'Failed to delete block' });
  }
}

async function toggleBlockReservation(req, res) {
  try {
    const { id } = req.params;
    const block = await Block.findByPk(id);
    if (!block) return res.status(404).json({ error: 'Block not found.' });

    await block.update({ is_reserved: !block.is_reserved });
    return res.json({ message: `Block reservation toggled to ${block.is_reserved}`, block });
  } catch (err) {
    console.error('Error in toggleBlockReservation:', err);
    return res.status(500).json({ error: 'Failed to toggle block reservation.' });
  }
}

// 8. Floors CRUD
async function getFloors(req, res) {
  try {
    const { blockId } = req.query;
    const where = {};
    if (blockId && blockId !== 'ALL') where.block_id = parseInt(blockId, 10);

    const floors = await Floor.findAll({
      where,
      include: [{ model: Block, include: [Hostel] }],
      order: [['floor_number', 'ASC']]
    });
    return res.json({ floors });
  } catch (err) {
    console.error('Error in getFloors:', err);
    return res.status(500).json({ error: 'Failed to fetch floors.' });
  }
}

async function createFloor(req, res) {
  try {
    const { block_id, floor_number } = req.body;
    if (!block_id || floor_number === undefined) {
      return res.status(400).json({ error: 'block_id and floor_number are required.' });
    }

    const floor = await Floor.create({ block_id, floor_number: parseInt(floor_number, 10), is_reserved: false });
    return res.status(201).json({ message: 'Floor created successfully.', floor });
  } catch (err) {
    console.error('Error in createFloor:', err);
    return res.status(500).json({ error: 'Failed to create floor.' });
  }
}

async function deleteFloor(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const floor = await Floor.findByPk(id, { transaction });
    if (!floor) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Floor not found' });
    }

    // 1. Find all rooms on this floor
    const rooms = await Room.findAll({
      attributes: ['room_id'],
      where: { floor_id: id },
      transaction
    });

    const roomIds = rooms.map(r => r.room_id);

    // 2. ✅ Reset students assigned to these rooms
    if (roomIds.length > 0) {
      await Student.update(
        { booked_room_id: null, booking_status: 'Pending' },
        { where: { booked_room_id: roomIds }, transaction }
      );
    }

    // 3. Delete swap_requests referencing these rooms
    if (roomIds.length > 0) {
      await SwapRequest.destroy({
        where: {
          [Op.or]: [
            { source_room_id: roomIds },
            { target_room_id: roomIds }
          ]
        },
        transaction
      });
    }

    // 4. Delete the floor (cascades to rooms)
    await floor.destroy({ transaction });

    await transaction.commit();
    return res.json({ message: `Floor ${floor.floor_number} deleted successfully.` });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete floor error:', error);
    return res.status(500).json({ error: 'Failed to delete floor' });
  }
}

async function toggleFloorReservation(req, res) {
  try {
    const { id } = req.params;
    const floor = await Floor.findByPk(id);
    if (!floor) return res.status(404).json({ error: 'Floor not found.' });

    await floor.update({ is_reserved: !floor.is_reserved });
    return res.json({ message: `Floor reservation toggled to ${floor.is_reserved}`, floor });
  } catch (err) {
    console.error('Error in toggleFloorReservation:', err);
    return res.status(500).json({ error: 'Failed to toggle floor reservation.' });
  }
}

// 9. Rooms CRUD & Reservations
async function getRooms(req, res) {
  try {
    const { floorId } = req.query;
    const where = {};
    if (floorId && floorId !== 'ALL') where.floor_id = parseInt(floorId, 10);

    const rooms = await Room.findAll({
      where,
      include: [
        { model: Floor, include: [{ model: Block, include: [Hostel] }] },
        {
          model: Student,
          attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'booking_status']
        }
      ],
      order: [['room_number', 'ASC']]
    });
    return res.json({ rooms });
  } catch (err) {
    console.error('Error in getRooms:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
}

async function createRoom(req, res) {
  try {
    const { floor_id, room_number, capacity } = req.body;
    if (!floor_id || room_number === undefined || room_number === null) {
      return res.status(400).json({ error: 'floor_id and room_number are required.' });
    }

    let formattedRoomNumber = String(room_number).trim();
    if (/^\d+$/.test(formattedRoomNumber)) {
      formattedRoomNumber = formattedRoomNumber.padStart(3, '0');
    }

    const room = await Room.create({
      floor_id,
      room_number: formattedRoomNumber,
      capacity: capacity ? parseInt(capacity, 10) : 2,
      current_occupancy: 0,
      is_reserved: false,
      status: 'Vacant'
    });

    return res.status(201).json({ message: 'Room created successfully.', room });
  } catch (err) {
    console.error('Error in createRoom:', err);
    return res.status(500).json({ error: 'Failed to create room.' });
  }
}

async function deleteRoom(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const room = await Room.findByPk(id, { transaction });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }

    // 1. ✅ Reset students assigned to this room
    await Student.update(
      { booked_room_id: null, booking_status: 'Pending' },
      { where: { booked_room_id: id }, transaction }
    );

    // 2. Delete swap_requests referencing this room
    await SwapRequest.destroy({
      where: {
        [Op.or]: [
          { source_room_id: id },
          { target_room_id: id }
        ]
      },
      transaction
    });

    // 3. Delete the room
    await room.destroy({ transaction });

    await transaction.commit();
    return res.json({ message: `Room ${room.room_number} deleted successfully.` });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete room error:', error);
    return res.status(500).json({ error: 'Failed to delete room' });
  }
}

async function toggleRoomReservation(req, res) {
  try {
    const { id } = req.params;
    const room = await Room.findByPk(id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    await room.update({ is_reserved: !room.is_reserved });
    return res.json({ message: `Room reservation status toggled to ${room.is_reserved}`, room });
  } catch (err) {
    console.error('Error in toggleRoomReservation:', err);
    return res.status(500).json({ error: 'Failed to toggle room reservation.' });
  }
}

// 10. List & Search Students
async function getStudents(req, res) {
  try {
    const { search, gender, programme, year, status } = req.query;
    const where = {};

    if (gender && gender !== 'ALL') where.gender = gender;
    if (programme && programme !== 'ALL') where.programme = programme;
    if (year && year !== 'ALL') where.year = parseInt(year, 10);
    if (status && status !== 'ALL') where.booking_status = status;

    if (search && search.trim()) {
      const searchOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      where[Op.or] = [
        { full_name: { [searchOp]: `%${search.trim()}%` } },
        { roll_number: { [searchOp]: `%${search.trim()}%` } },
        { email: { [searchOp]: `%${search.trim()}%` } }
      ];
    }

    const students = await Student.findAll({
      where,
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        }
      ],
      order: [['roll_number', 'ASC']],
      limit: 1000
    });

    return res.json({ students });
  } catch (err) {
    console.error('Error in getStudents:', err);
    return res.status(500).json({ error: 'Failed to fetch students list.' });
  }
}

async function bulkCreateRooms(req, res) {
  let transaction;
  try {
    const { floorId, floor_id, roomStart, roomEnd, capacity } = req.body;
    const targetFloorId = floorId || floor_id;

    if (!targetFloorId || roomStart === undefined || roomEnd === undefined) {
      return res.status(400).json({ error: 'Missing required fields: floorId, roomStart, roomEnd.' });
    }

    const start = parseInt(roomStart, 10);
    const end = parseInt(roomEnd, 10);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: 'Room numbers must be valid integers.' });
    }

    if (start > end) {
      return res.status(400).json({ error: 'Start room number must be less than or equal to end room number.' });
    }

    const floor = await Floor.findByPk(targetFloorId);
    if (!floor) {
      return res.status(404).json({ error: 'Selected floor does not exist.' });
    }

    transaction = await sequelize.transaction();

    const existingRooms = await Room.findAll({
      where: { floor_id: parseInt(targetFloorId, 10) },
      transaction
    });

    const existingNumbers = new Set(existingRooms.map(r => String(r.room_number)));
    const skipped = [];
    const roomData = [];

    for (let num = start; num <= end; num++) {
      const numStr = String(num);
      const roomNumStr = numStr.padStart(3, '0');
      if (existingNumbers.has(roomNumStr) || existingNumbers.has(numStr)) {
        skipped.push(roomNumStr);
      } else {
        roomData.push({
          floor_id: parseInt(targetFloorId, 10),
          room_number: roomNumStr,
          capacity: capacity ? parseInt(capacity, 10) : 2,
          current_occupancy: 0,
          is_reserved: false,
          status: 'Vacant'
        });
      }
    }

    if (roomData.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'No new rooms to add – all room numbers in this range already exist.',
        skipped,
        skippedRooms: skipped,
        errors: skipped.map(num => `Room ${num} already exists on floor #${targetFloorId} and was skipped.`)
      });
    }

    const createdRooms = await Room.bulkCreate(roomData, { transaction });

    await transaction.commit();

    return res.status(201).json({
      message: `Successfully created ${createdRooms.length} room(s).`,
      createdCount: createdRooms.length,
      createdRooms,
      skipped,
      skippedRooms: skipped,
      errors: skipped.map(num => `Room ${num} already exists on floor #${targetFloorId} and was skipped.`)
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('[bulkCreateRooms Error]:', err.stack || err);
    return res.status(500).json({ error: `Failed to bulk create rooms: ${err.message}` });
  }
}

async function getStudentCount(req, res) {
  try {
    const { status, gender, programme, year, search } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.booking_status = status;
    }
    if (gender && gender !== 'ALL') {
      where.gender = gender;
    }
    if (programme && programme !== 'ALL') {
      where.programme = programme;
    }
    if (year && year !== 'ALL') {
      where.year = parseInt(year, 10);
    }
    if (search && search.trim()) {
      const searchOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      where[Op.or] = [
        { roll_number: { [searchOp]: `%${search.trim()}%` } },
        { full_name: { [searchOp]: `%${search.trim()}%` } },
        { email: { [searchOp]: `%${search.trim()}%` } }
      ];
    }

    const totalCount = await Student.count({ where });

    const programmeBreakdown = await Student.findAll({
      attributes: [
        'programme',
        'year',
        [sequelize.fn('COUNT', sequelize.col('roll_number')), 'count']
      ],
      where,
      group: ['programme', 'year'],
      order: [
        ['programme', 'ASC'],
        ['year', 'ASC']
      ],
      raw: true
    });

    const genderBreakdown = await Student.findAll({
      attributes: [
        'gender',
        [sequelize.fn('COUNT', sequelize.col('roll_number')), 'count']
      ],
      where,
      group: ['gender'],
      raw: true
    });

    const statusBreakdown = await Student.findAll({
      attributes: [
        'booking_status',
        [sequelize.fn('COUNT', sequelize.col('roll_number')), 'count']
      ],
      where,
      group: ['booking_status'],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        total: totalCount,
        programmeBreakdown,
        genderBreakdown,
        statusBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Error fetching student count:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch student count',
      details: error.message
    });
  }
}

// Bulk Create Floors (Range-Based)
async function bulkCreateFloors(req, res) {
  const { blockId, block_id, floorStart, floorEnd } = req.body;
  const targetBlockId = blockId || block_id;
  const transaction = await sequelize.transaction();

  try {
    // Validation
    if (!targetBlockId || floorStart === undefined || floorEnd === undefined) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Missing required fields: blockId, floorStart, floorEnd' });
    }

    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Start floor must be less than or equal to end floor' });
    }

    if (start < 0 || end < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Floor numbers cannot be negative' });
    }

    // Check if block exists
    const block = await Block.findByPk(targetBlockId, { transaction });
    if (!block) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Block not found' });
    }

    const createdFloors = [];
    const skippedFloors = [];

    for (let num = start; num <= end; num++) {
      // Check if floor already exists in this block
      const existing = await Floor.findOne({
        where: { block_id: targetBlockId, floor_number: num },
        transaction
      });

      if (existing) {
        skippedFloors.push(num);
        continue;
      }

      const floor = await Floor.create({
        block_id: targetBlockId,
        floor_number: num,
        is_reserved: false
      }, { transaction });

      createdFloors.push(floor);
    }

    await transaction.commit();

    return res.status(201).json({
      message: `Successfully created ${createdFloors.length} floor(s)`,
      createdCount: createdFloors.length,
      createdFloors,
      skippedFloors,
      skippedCount: skippedFloors.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Bulk floor creation error:', error);
    return res.status(500).json({
      error: 'Failed to create floors',
      details: error.message
    });
  }
}

// 12. Allocation Rules Management
async function getAllocationRules(req, res) {
  try {
    const { hostelId, programme, year } = req.query;
    const where = {};
    if (hostelId && hostelId !== 'ALL') where.hostel_id = parseInt(hostelId, 10);
    if (programme && programme !== 'ALL') where.programme = programme;
    if (year && year !== 'ALL') {
      if (year === 'NULL') where.allowed_year = null;
      else where.allowed_year = parseInt(year, 10);
    }

    const rules = await AllocationRule.findAll({
      where,
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name'] },
        { model: Block, attributes: ['block_id', 'name', 'is_reserved'] }
      ],
      order: [['hostel_id', 'ASC'], ['programme', 'ASC'], ['allowed_year', 'ASC'], ['block_id', 'ASC']]
    });

    return res.json({ success: true, rules });
  } catch (error) {
    console.error('Error fetching allocation rules:', error);
    return res.status(500).json({ error: 'Failed to fetch allocation rules', details: error.message });
  }
}

async function createAllocationRule(req, res) {
  try {
    const { hostel_id, hostelId, programme, allowed_year, allowedYear, year, block_id, blockId, floor_start, floorStart, floor_end, floorEnd, gender, capacity } = req.body;
    const targetHostelId = hostel_id || hostelId;
    const targetBlockId = block_id || blockId;
    const start = floor_start !== undefined ? parseInt(floor_start, 10) : (floorStart !== undefined ? parseInt(floorStart, 10) : 0);
    const end = floor_end !== undefined ? parseInt(floor_end, 10) : (floorEnd !== undefined ? parseInt(floorEnd, 10) : 999);

    const rawYear = allowed_year !== undefined ? allowed_year : (allowedYear !== undefined ? allowedYear : year);
    const parsedYear = (rawYear === null || rawYear === undefined || rawYear === '' || rawYear === 'ALL') ? null : parseInt(rawYear, 10);

    if (!targetHostelId || !programme || !targetBlockId) {
      return res.status(400).json({ error: 'Missing required fields: hostel_id, programme, block_id' });
    }

    if (parsedYear === null || isNaN(parsedYear) || parsedYear < 1 || parsedYear > 5) {
      return res.status(400).json({ error: 'Year selection is required (1st, 2nd, 3rd, 4th, or 5th Year).' });
    }

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      return res.status(400).json({ error: 'Valid floor range (start <= end, start >= 0) is required' });
    }

    const hostel = await Hostel.findByPk(targetHostelId);
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

    const block = await Block.findOne({ where: { block_id: targetBlockId, hostel_id: targetHostelId } });
    if (!block) return res.status(404).json({ error: 'Block does not belong to the selected hostel' });

    // Floor Reservation Overlap Prevention Check
    const existingBlockRules = await AllocationRule.findAll({
      where: { block_id: targetBlockId }
    });

    const overlappingRule = existingBlockRules.find(r => 
      start <= r.floor_end && end >= r.floor_start
    );

    if (overlappingRule) {
      const overlapStart = Math.max(start, overlappingRule.floor_start);
      const overlapEnd = Math.min(end, overlappingRule.floor_end);
      const overlapText = overlapStart === overlapEnd ? `Floor ${overlapStart}` : `Floors ${overlapStart}–${overlapEnd}`;
      const ruleYearText = overlappingRule.allowed_year ? `${overlappingRule.allowed_year}th Year` : 'All Years';
      
      return res.status(400).json({ 
        error: `${overlapText} is already allocated to ${overlappingRule.programme} (${ruleYearText}). Please select different floors.` 
      });
    }

    const rule = await AllocationRule.create({
      hostel_id: targetHostelId,
      programme,
      allowed_year: parsedYear,
      block_id: targetBlockId,
      floor_start: start,
      floor_end: end,
      gender: gender || 'Female',
      capacity: capacity ? parseInt(capacity, 10) : 2
    });

    const fullRule = await AllocationRule.findByPk(rule.rule_id, {
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name'] },
        { model: Block, attributes: ['block_id', 'name', 'is_reserved'] }
      ]
    });

    return res.status(201).json({ message: 'Allocation rule created successfully', rule: fullRule });
  } catch (error) {
    console.error('Error creating allocation rule:', error);
    return res.status(500).json({ error: 'Failed to create allocation rule', details: error.message });
  }
}

async function updateAllocationRule(req, res) {
  try {
    const { ruleId } = req.params;
    const { programme, allowed_year, allowedYear, year, block_id, blockId, floor_start, floorStart, floor_end, floorEnd, gender, capacity } = req.body;

    const rule = await AllocationRule.findByPk(ruleId);
    if (!rule) return res.status(404).json({ error: 'Allocation rule not found' });

    if (programme) rule.programme = programme;
    if (block_id || blockId) rule.block_id = block_id || blockId;
    if (gender) rule.gender = gender;
    if (capacity) rule.capacity = parseInt(capacity, 10);

    const rawYear = allowed_year !== undefined ? allowed_year : (allowedYear !== undefined ? allowedYear : year);
    if (rawYear !== undefined) {
      rule.allowed_year = (rawYear === null || rawYear === '' || rawYear === 'ALL') ? null : parseInt(rawYear, 10);
    }

    if (rule.allowed_year === null || isNaN(rule.allowed_year) || rule.allowed_year < 1 || rule.allowed_year > 5) {
      return res.status(400).json({ error: 'Year selection is required (1st, 2nd, 3rd, 4th, or 5th Year).' });
    }

    if (floor_start !== undefined || floorStart !== undefined) {
      rule.floor_start = parseInt(floor_start !== undefined ? floor_start : floorStart, 10);
    }
    if (floor_end !== undefined || floorEnd !== undefined) {
      rule.floor_end = parseInt(floor_end !== undefined ? floor_end : floorEnd, 10);
    }

    if (rule.floor_start > rule.floor_end || rule.floor_start < 0) {
      return res.status(400).json({ error: 'Start floor must be less than or equal to end floor, and >= 0' });
    }

    // Floor Reservation Overlap Check excluding current ruleId
    const existingBlockRules = await AllocationRule.findAll({
      where: { 
        block_id: rule.block_id,
        rule_id: { [Op.ne]: rule.rule_id }
      }
    });

    const overlappingRule = existingBlockRules.find(r => 
      rule.floor_start <= r.floor_end && rule.floor_end >= r.floor_start
    );

    if (overlappingRule) {
      const overlapStart = Math.max(rule.floor_start, overlappingRule.floor_start);
      const overlapEnd = Math.min(rule.floor_end, overlappingRule.floor_end);
      const overlapText = overlapStart === overlapEnd ? `Floor ${overlapStart}` : `Floors ${overlapStart}–${overlapEnd}`;
      const ruleYearText = overlappingRule.allowed_year ? `${overlappingRule.allowed_year}th Year` : 'All Years';
      
      return res.status(400).json({ 
        error: `${overlapText} is already allocated to ${overlappingRule.programme} (${ruleYearText}). Please select different floors.` 
      });
    }

    await rule.save();

    const fullRule = await AllocationRule.findByPk(rule.rule_id, {
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name'] },
        { model: Block, attributes: ['block_id', 'name', 'is_reserved'] }
      ]
    });

    return res.json({ message: 'Allocation rule updated successfully', rule: fullRule });
  } catch (error) {
    console.error('Error updating allocation rule:', error);
    return res.status(500).json({ error: 'Failed to update allocation rule', details: error.message });
  }
}

async function deleteAllocationRule(req, res) {
  try {
    const { ruleId } = req.params;
    const rule = await AllocationRule.findByPk(ruleId);
    if (!rule) return res.status(404).json({ error: 'Allocation rule not found' });

    await rule.destroy();
    return res.json({ message: 'Allocation rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation rule:', error);
    return res.status(500).json({ error: 'Failed to delete allocation rule', details: error.message });
  }
}

async function getHostelAllocationRules(req, res) {
  try {
    const { hostelId } = req.params;
    const rules = await AllocationRule.findAll({
      where: { hostel_id: hostelId },
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name'] },
        { model: Block, attributes: ['block_id', 'name', 'is_reserved'] }
      ],
      order: [['programme', 'ASC'], ['block_id', 'ASC']]
    });
    return res.json({ success: true, rules });
  } catch (error) {
    console.error('Error fetching hostel allocation rules:', error);
    return res.status(500).json({ error: 'Failed to fetch hostel allocation rules' });
  }
}

/**
 * Release occupants from a room
 * - If clearAll: true → releases ALL students in the room
 * - If clearAll: false → releases only the students in studentRolls array
 */
async function releaseOccupants(req, res) {
  console.log('🔥 [Admin Controller] releaseOccupants called with roomId:', req.params.roomId, 'body:', req.body);
  const { roomId } = req.params;
  const { studentRolls, clearAll } = req.body;

  const transaction = await sequelize.transaction();
  try {
    // 1. Find the room by primary key ID or room_number
    let room = await Room.findByPk(roomId, { transaction });
    if (!room) {
      room = await Room.findOne({ where: { room_number: String(roomId) }, transaction });
    }
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: `Room #${roomId} not found in database.` });
    }

    // 2. Determine which students to release
    if (clearAll === true) {
      // ClearAll takes priority: find any occupants and release them, then reset room to Vacant
      const occupants = await Student.findAll({
        where: { booked_room_id: roomId },
        transaction
      });
      const validRolls = occupants.map(s => s.roll_number);

      if (validRolls.length > 0) {
        // 1. Reset students to Pending
        await Student.update(
          { booked_room_id: null, booking_status: 'Pending' },
          { where: { roll_number: validRolls }, transaction }
        );

        // 2. Delete bookings
        await Booking.destroy({
          where: { student_roll: validRolls },
          transaction
        });

        // 3. Invalidate PDFs
        await PDFHistory.update(
          { is_current: false },
          { where: { student_roll: validRolls, is_current: true }, transaction }
        );

        // 4. Cancel active swap requests
        await SwapRequest.update(
          { status: 'Cancelled' },
          {
            where: {
              status: { [Op.in]: ['Pending', 'Consenting'] },
              [Op.or]: [
                { source_room_id: roomId },
                { target_room_id: roomId },
                { initiator_roll: validRolls },
                { target_student_roll: validRolls }
              ]
            },
            transaction
          }
        );
      }

      // Always reset room to Vacant (0 occupants)
      await room.update({
        current_occupancy: 0,
        status: 'Vacant',
        pairing_code: null,
        code_expiry: null
      }, { transaction });

      await transaction.commit();

      return res.json({
        success: true,
        message: `Room ${room.room_number} cleared successfully.`,
        releasedStudents: validRolls,
        roomStatus: 'Vacant',
        currentOccupancy: 0,
        roomNowVacant: true
      });
    }

    // Regular case: release only selected students
    if (!studentRolls || !Array.isArray(studentRolls) || studentRolls.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'No students selected to release. Use clearAll: true to release all occupants.' });
    }
    const rollsToRelease = studentRolls.filter(Boolean);

    // Validate: ensure all selected students are actually in this room
    const validStudents = await Student.findAll({
      where: { 
        roll_number: rollsToRelease,
        booked_room_id: roomId
      },
      transaction
    });

    const validRolls = validStudents.map(s => s.roll_number);
    const invalidRolls = rollsToRelease.filter(r => !validRolls.includes(r));

    if (invalidRolls.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: `Some students are not assigned to this room: ${invalidRolls.join(', ')}` 
      });
    }

    if (validRolls.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'No valid students found to release.' });
    }

    // Execute the release for selected students
    await Student.update(
      { booked_room_id: null, booking_status: 'Pending' },
      { where: { roll_number: validRolls }, transaction }
    );

    await Booking.destroy({
      where: { student_roll: validRolls },
      transaction
    });

    await PDFHistory.update(
      { is_current: false },
      { where: { student_roll: validRolls, is_current: true }, transaction }
    );

    await SwapRequest.update(
      { status: 'Cancelled' },
      {
        where: {
          status: { [Op.in]: ['Pending', 'Consenting'] },
          [Op.or]: [
            { source_room_id: roomId },
            { target_room_id: roomId },
            { initiator_roll: validRolls },
            { target_student_roll: validRolls }
          ]
        },
        transaction
      }
    );

    const remainingCount = await Student.count({
      where: { booked_room_id: roomId },
      transaction
    });

    const newStatus = remainingCount === 0 ? 'Vacant' : (remainingCount < room.capacity ? 'Pending_Pairing' : 'Locked');

    await room.update({
      current_occupancy: remainingCount,
      status: newStatus,
      pairing_code: remainingCount === 0 ? null : room.pairing_code,
      code_expiry: remainingCount === 0 ? null : room.code_expiry
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: `Released ${validRolls.length} student(s) from Room ${room.room_number}`,
      releasedStudents: validRolls,
      roomStatus: newStatus,
      currentOccupancy: remainingCount,
      roomNowVacant: remainingCount === 0
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Release occupants error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to release occupants',
      details: error.message 
    });
  }
}

async function getFloorSummary(req, res) {
  try {
    const { blockId } = req.query;

    if (!blockId) {
      return res.status(400).json({ 
        success: false, 
        error: 'blockId query parameter is required' 
      });
    }

    const floors = await Floor.findAll({
      where: { block_id: parseInt(blockId, 10) },
      order: [['floor_number', 'ASC']]
    });

    const floorData = await Promise.all(
      floors.map(async (floor) => {
        const totalRooms = await Room.count({
          where: { floor_id: floor.floor_id }
        });
        const reservedRooms = await Room.count({
          where: { floor_id: floor.floor_id, is_reserved: true }
        });
        const lockedRooms = await Room.count({
          where: { floor_id: floor.floor_id, status: 'Locked' }
        });

        return {
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          is_reserved: floor.is_reserved,
          totalRooms,
          reservedRooms,
          lockedRooms,
          availableRooms: totalRooms - reservedRooms - lockedRooms
        };
      })
    );

    return res.json({
      success: true,
      floors: floorData,
      total: floorData.length
    });
  } catch (error) {
    console.error('Error in getFloorSummary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch floor summary',
      details: error.message
    });
  }
}

async function getBlockSummary(req, res) {
  try {
    const { hostelId } = req.query;

    if (!hostelId) {
      return res.status(400).json({
        success: false,
        error: 'hostelId query parameter is required'
      });
    }

    const blocks = await Block.findAll({
      where: { hostel_id: parseInt(hostelId, 10) },
      include: [{ model: Hostel, attributes: ['name'] }],
      order: [['name', 'ASC']]
    });

    const blockData = await Promise.all(
      blocks.map(async (block) => {
        const floors = await Floor.findAll({
          where: { block_id: block.block_id }
        });
        const floorIds = floors.map(f => f.floor_id);

        const totalRooms = await Room.count({
          where: { floor_id: floorIds }
        });
        const lockedRooms = await Room.count({
          where: { floor_id: floorIds, status: 'Locked' }
        });
        const reservedRooms = await Room.count({
          where: { floor_id: floorIds, is_reserved: true }
        });
        const vacantRooms = totalRooms - lockedRooms - reservedRooms;

        return {
          block_id: block.block_id,
          name: block.name,
          is_reserved: block.is_reserved,
          hostel_name: block.Hostel ? block.Hostel.name : 'Unknown',
          stats: {
            totalRooms,
            lockedRooms,
            reservedRooms,
            vacantRooms: Math.max(0, vacantRooms)
          }
        };
      })
    );

    return res.json({
      success: true,
      blocks: blockData,
      total: blockData.length
    });
  } catch (error) {
    console.error('Error in getBlockSummary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch block summary',
      details: error.message
    });
  }
}

async function toggleBlockReservation(req, res) {
  try {
    const { blockId, id } = req.params;
    const targetId = blockId || id;
    const { is_reserved } = req.body;

    const block = await Block.findByPk(targetId);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    const newStatus = is_reserved !== undefined ? is_reserved : !block.is_reserved;
    await block.update({ is_reserved: newStatus });
    return res.json({
      success: true,
      message: `Block ${block.name} ${newStatus ? 'reserved' : 'unreserved'}`,
      block
    });
  } catch (error) {
    console.error('Error toggling block reservation:', error);
    return res.status(500).json({ error: 'Failed to update block reservation' });
  }
}

async function getFloorById(req, res) {
  try {
    const { id } = req.params;
    const floor = await Floor.findByPk(id, {
      include: [{ model: Block, include: [Hostel] }]
    });
    if (!floor) {
      return res.status(404).json({ success: false, error: 'Floor not found' });
    }
    return res.json({ success: true, floor });
  } catch (error) {
    console.error('Error fetching floor:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch floor' });
  }
}

async function getRoomById(req, res) {
  try {
    const { id } = req.params;
    const room = await Room.findByPk(id, {
      include: [
        { model: Floor, include: [{ model: Block, include: [Hostel] }] },
        { model: Student, attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'booking_status'] }
      ]
    });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    return res.json({ success: true, room });
  } catch (error) {
    console.error('Error fetching room:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch room' });
  }
}

async function getRoomOccupants(req, res) {
  try {
    const { roomId } = req.params;
    const occupants = await Student.findAll({
      where: { booked_room_id: parseInt(roomId, 10) },
      attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'booking_status']
    });
    return res.json({ success: true, occupants });
  } catch (error) {
    console.error('Error fetching room occupants:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch occupants' });
  }
}

async function bulkReserveRooms(req, res) {
  try {
    const { roomIds, is_reserved } = req.body;
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, error: 'roomIds array is required' });
    }
    await Room.update(
      { is_reserved: !!is_reserved },
      { where: { room_id: roomIds } }
    );
    return res.json({ success: true, updated: roomIds.length });
  } catch (error) {
    console.error('Error in bulkReserveRooms:', error);
    return res.status(500).json({ success: false, error: 'Failed to bulk reserve rooms' });
  }
}

async function bulkDeleteRooms(req, res) {
  try {
    const { roomIds } = req.body;
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, error: 'roomIds array is required' });
    }
    // Reset students booked in these rooms before deleting to prevent orphaned references
    await Student.update(
      { booked_room_id: null, booking_status: 'Pending' },
      { where: { booked_room_id: roomIds } }
    );
    await Booking.destroy({ where: { room_id: roomIds } });
    await Room.destroy({ where: { room_id: roomIds } });
    return res.json({ success: true, deleted: roomIds.length });
  } catch (error) {
    console.error('Error in bulkDeleteRooms:', error);
    return res.status(500).json({ success: false, error: 'Failed to bulk delete rooms' });
  }
}

async function getHostelById(req, res) {
  try {
    const hostelId = req.params.hostelId || req.params.id;
    const hostel = await Hostel.findByPk(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, error: 'Hostel not found' });
    }
    return res.json({ success: true, hostel });
  } catch (error) {
    console.error('Error fetching hostel:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch hostel' });
  }
}

async function getBlockById(req, res) {
  try {
    const blockId = req.params.blockId || req.params.id;
    const block = await Block.findByPk(blockId, { include: [Hostel] });
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block not found' });
    }
    return res.json({ success: true, block });
  } catch (error) {
    console.error('Error fetching block:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch block' });
  }
}

module.exports = {
  uploadStudents,
  getHostels,
  getHostelById,
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
  createFloor,
  bulkCreateFloors,
  deleteFloor,
  toggleFloorReservation,
  getFloorSummary,
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
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  getHostelAllocationRules
};



