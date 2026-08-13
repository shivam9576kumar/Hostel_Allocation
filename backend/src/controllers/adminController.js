const { parseAndInsertStudents } = require('../utils/csvParser');
const { Hostel, Block, Floor, Room, Booking, Student, SwapRequest, AllocationRule, sequelize } = require('../models');
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
    const { gender } = req.query;
    const where = {};

    if (gender && gender !== 'ALL') where.allowed_gender = gender;

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

// 3. Create Hostel
async function createHostel(req, res) {
  try {
    const { name, allowed_gender, gender, start_time, startTime, end_time, endTime } = req.body;
    const targetGender = allowed_gender || gender;
    const targetStartTime = start_time || startTime;
    const targetEndTime = end_time || endTime;

    if (!name || !targetGender || !targetStartTime || !targetEndTime) {
      return res.status(400).json({ error: 'Hostel name, gender, and time window parameters are required.' });
    }

    const hostel = await Hostel.create({
      name,
      allowed_gender: targetGender,
      start_time: new Date(targetStartTime),
      end_time: new Date(targetEndTime)
    });

    return res.status(201).json({ message: 'Hostel created successfully.', hostel });
  } catch (err) {
    console.error('Error in createHostel:', err);
    return res.status(500).json({ error: 'Failed to create hostel.' });
  }
}

// 4. Update Hostel Details / Settings
async function updateHostel(req, res) {
  try {
    const { id } = req.params;
    const { name, allowed_gender, gender, start_time, startTime, end_time, endTime } = req.body;
    const targetGender = allowed_gender || gender;
    const targetStartTime = start_time || startTime;
    const targetEndTime = end_time || endTime;

    const hostel = await Hostel.findByPk(id);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    await hostel.update({
      name: name || hostel.name,
      allowed_gender: targetGender || hostel.allowed_gender,
      start_time: targetStartTime ? new Date(targetStartTime) : hostel.start_time,
      end_time: targetEndTime ? new Date(targetEndTime) : hostel.end_time
    });

    return res.json({ message: 'Hostel updated successfully.', hostel });
  } catch (err) {
    console.error('Error in updateHostel:', err);
    return res.status(500).json({ error: 'Failed to update hostel.' });
  }
}

// 5. Delete Hostel (with swap_requests cleanup)
async function deleteHostel(req, res) {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    // 1. Verify the hostel exists
    const hostel = await Hostel.findByPk(id, { transaction });
    if (!hostel) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Hostel not found' });
    }

    // 2. Find all rooms belonging to this hostel (through blocks → floors)
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

    // 3. Delete all swap_requests referencing these rooms (source or target)
    if (roomIds.length > 0) {
      const deletedSwaps = await SwapRequest.destroy({
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

    // 4. Now delete the hostel – cascades to blocks → floors → rooms → bookings
    await hostel.destroy({ transaction });

    await transaction.commit();
    return res.json({ 
      message: `Hostel "${hostel.name}" (ID: ${id}) deleted successfully`,
      deletedSwapRequests: roomIds.length > 0 ? 'All related swap requests removed' : 'None'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete hostel error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete hostel. Please try again.',
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
  try {
    const { id } = req.params;
    const block = await Block.findByPk(id);
    if (!block) return res.status(404).json({ error: 'Block not found.' });

    await block.destroy();
    return res.json({ message: `Block #${id} deleted.` });
  } catch (err) {
    console.error('Error in deleteBlock:', err);
    return res.status(500).json({ error: 'Failed to delete block.' });
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
  try {
    const { id } = req.params;
    const floor = await Floor.findByPk(id);
    if (!floor) return res.status(404).json({ error: 'Floor not found.' });

    await floor.destroy();
    return res.json({ message: `Floor #${id} deleted.` });
  } catch (err) {
    console.error('Error in deleteFloor:', err);
    return res.status(500).json({ error: 'Failed to delete floor.' });
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
      include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }],
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
    if (!floor_id || !room_number) {
      return res.status(400).json({ error: 'floor_id and room_number are required.' });
    }

    const room = await Room.create({
      floor_id,
      room_number,
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
  try {
    const { id } = req.params;
    const room = await Room.findByPk(id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    await room.destroy();
    return res.json({ message: `Room #${id} deleted.` });
  } catch (err) {
    console.error('Error in deleteRoom:', err);
    return res.status(500).json({ error: 'Failed to delete room.' });
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
      const roomNumStr = String(num);
      if (existingNumbers.has(roomNumStr)) {
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
        { model: Hostel, attributes: ['hostel_id', 'name', 'allowed_gender'] },
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
    const { hostel_id, hostelId, programme, allowed_year, allowedYear, year, block_id, blockId, floor_start, floorStart, floor_end, floorEnd } = req.body;
    const targetHostelId = hostel_id || hostelId;
    const targetBlockId = block_id || blockId;
    const start = floor_start !== undefined ? parseInt(floor_start, 10) : (floorStart !== undefined ? parseInt(floorStart, 10) : 0);
    const end = floor_end !== undefined ? parseInt(floor_end, 10) : (floorEnd !== undefined ? parseInt(floorEnd, 10) : 999);

    const rawYear = allowed_year !== undefined ? allowed_year : (allowedYear !== undefined ? allowedYear : year);
    const parsedYear = (rawYear === null || rawYear === undefined || rawYear === '' || rawYear === 'ALL') ? null : parseInt(rawYear, 10);

    if (!targetHostelId || !programme || !targetBlockId) {
      return res.status(400).json({ error: 'Missing required fields: hostel_id, programme, block_id' });
    }

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      return res.status(400).json({ error: 'Valid floor range (start <= end, start >= 0) is required' });
    }

    const hostel = await Hostel.findByPk(targetHostelId);
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

    const block = await Block.findOne({ where: { block_id: targetBlockId, hostel_id: targetHostelId } });
    if (!block) return res.status(404).json({ error: 'Block does not belong to the selected hostel' });

    const rule = await AllocationRule.create({
      hostel_id: targetHostelId,
      programme,
      allowed_year: parsedYear,
      block_id: targetBlockId,
      floor_start: start,
      floor_end: end
    });

    const fullRule = await AllocationRule.findByPk(rule.rule_id, {
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name', 'allowed_gender'] },
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
    const { programme, allowed_year, allowedYear, year, block_id, blockId, floor_start, floorStart, floor_end, floorEnd } = req.body;

    const rule = await AllocationRule.findByPk(ruleId);
    if (!rule) return res.status(404).json({ error: 'Allocation rule not found' });

    if (programme) rule.programme = programme;
    if (block_id || blockId) rule.block_id = block_id || blockId;

    const rawYear = allowed_year !== undefined ? allowed_year : (allowedYear !== undefined ? allowedYear : year);
    if (rawYear !== undefined) {
      rule.allowed_year = (rawYear === null || rawYear === '' || rawYear === 'ALL') ? null : parseInt(rawYear, 10);
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

    await rule.save();

    const fullRule = await AllocationRule.findByPk(rule.rule_id, {
      include: [
        { model: Hostel, attributes: ['hostel_id', 'name', 'allowed_gender'] },
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
        { model: Hostel, attributes: ['hostel_id', 'name', 'allowed_gender'] },
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

module.exports = {
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
  bulkCreateFloors,
  deleteFloor,
  toggleFloorReservation,
  getRooms,
  createRoom,
  bulkCreateRooms,
  deleteRoom,
  toggleRoomReservation,
  getStudents,
  getStudentCount,
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  getHostelAllocationRules
};

