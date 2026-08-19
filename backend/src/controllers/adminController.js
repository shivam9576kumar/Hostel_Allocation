const { parseAndInsertStudents } = require('../utils/csvParser');
const { parseRollNumber, generateEmail } = require('../utils/rollNumberParser');
const { Hostel, Block, Floor, Room, Booking, Student, ProgramCode, SwapRequest, PDFHistory, AllocationRule, sequelize } = require('../models');
const { Op } = require('sequelize');

// 1. Upload Students Roster
async function uploadStudents(req, res) {
  try {
    if (req.file) {
      const filePath = req.file.path;
      const result = await parseAndInsertStudents(filePath);
      return res.json({
        success: true,
        message: 'Student upload process completed.',
        result
      });
    }

    if (req.body.students && Array.isArray(req.body.students)) {
      const students = req.body.students;
      const results = {
        added: 0,
        skipped: 0,
        errors: [],
      };

      for (const studentData of students) {
        try {
          if (!studentData.roll_number || !studentData.full_name || !studentData.programme || studentData.year === undefined) {
            results.errors.push({
              roll_number: studentData.roll_number || 'unknown',
              error: 'Missing required student fields',
            });
            results.skipped++;
            continue;
          }

          let admissionYear, programCode, department;
          try {
            const parsed = parseRollNumber(studentData.roll_number);
            admissionYear = parsed.admissionYear;
            programCode = parsed.programCode;
            department = parsed.department;
          } catch (e) {
            admissionYear = studentData.admission_year || null;
            programCode = studentData.program_code || null;
            department = studentData.department || null;
          }

          const program = programCode ? await ProgramCode.findOne({ where: { code: programCode } }) : null;
          const validProgramCode = program ? program.code : null;
          const hostel_stay_end_year = (admissionYear && program) ? (admissionYear + program.hostel_stay) : null;
          const email = studentData.email || generateEmail(studentData.full_name, studentData.roll_number);

          const [student, created] = await Student.upsert({
            roll_number: studentData.roll_number,
            full_name: studentData.full_name,
            email,
            gender: studentData.gender || 'Male',
            programme: studentData.programme,
            year: parseInt(studentData.year, 10),
            admission_year: admissionYear,
            program_code: validProgramCode,
            department,
            hostel_stay_end_year,
            status: 'active',
            booking_status: 'Pending',
            booked_room_id: null,
          });

          if (created) {
            results.added++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push({
            roll_number: studentData.roll_number || 'unknown',
            error: error.message,
          });
          results.skipped++;
        }
      }

      return res.json({
        success: true,
        message: `Upload complete: ${results.added} added, ${results.skipped} skipped.`,
        results,
      });
    }

    return res.status(400).json({ error: 'No CSV file or student array provided.' });
  } catch (err) {
    console.error('Error in uploadStudents:', err);
    return res.status(500).json({ error: `Upload processing failed: ${err.message}` });
  }
}

// 2. List Hostels
async function getHostels(req, res) {
  try {
    const hostels = await Hostel.findAll({
      include: [
        {
          model: Block,
          attributes: ['block_id']
        }
      ],
      order: [['hostel_id', 'ASC']]
    });

    const result = await Promise.all(hostels.map(async (h) => {
      const blockIds = h.Blocks ? h.Blocks.map(b => b.block_id) : [];
      
      const rulesCount = await AllocationRule.count({
        where: {
          [Op.or]: [
            { hostel_id: h.hostel_id },
            { block_id: blockIds.length > 0 ? blockIds : [-1] }
          ]
        }
      });

      return {
        hostel_id: h.hostel_id,
        id: h.hostel_id,
        name: h.name,
        blockCount: h.Blocks ? h.Blocks.length : 0,
        blocksCount: h.Blocks ? h.Blocks.length : 0,
        rulesCount: rulesCount,
        rules_count: rulesCount
      };
    }));

    return res.json({ success: true, hostels: result });
  } catch (err) {
    console.error('Error in getHostels:', err);
    return res.status(500).json({ error: 'Failed to fetch hostels.', details: err.message });
  }
}

// 2b. Get Hostel Summary Stats
async function getHostelSummary(req, res) {
  try {
    const { hostelId } = req.params;

    const hostel = await Hostel.findByPk(hostelId);
    if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

    // Get all blocks, floors, rooms, and students
    const blocks = await Block.findAll({
      where: { hostel_id: hostelId },
      include: [{
        model: Floor,
        include: [{
          model: Room,
          attributes: ['room_id', 'current_occupancy', 'capacity']
        }]
      }]
    });

    let totalFloors = 0;
    let totalRooms = 0;
    let totalStudents = 0;
    const blockSummary = blocks.map(block => {
      const floors = block.Floors || [];
      totalFloors += floors.length;
      const rooms = floors.flatMap(f => f.Rooms || []);
      totalRooms += rooms.length;
      const studentsInBlock = rooms.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
      totalStudents += studentsInBlock;
      return {
        block_id: block.block_id,
        name: block.name,
        floorCount: floors.length,
        roomCount: rooms.length,
        studentCount: studentsInBlock
      };
    });

    return res.json({
      success: true,
      summary: {
        hostel: {
          hostel_id: hostel.hostel_id,
          name: hostel.name
        },
        totalBlocks: blocks.length,
        totalFloors,
        totalRooms,
        totalStudents,
        blockSummary
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Get Block Summary Stats
async function getBlockSummary(req, res) {
  try {
    const targetBlockId = req.params.blockId || req.query.blockId;
    const hostelId = req.query.hostelId;

    if (targetBlockId) {
      const block = await Block.findByPk(targetBlockId, { include: [{ model: Hostel }] });
      if (!block) return res.status(404).json({ error: 'Block not found' });

      const floors = await Floor.findAll({
        where: { block_id: targetBlockId },
        include: [{ model: Room }]
      });

      let totalRooms = 0;
      let totalStudents = 0;
      const floorSummary = floors.map(floor => {
        const rooms = floor.Rooms || [];
        totalRooms += rooms.length;
        const students = rooms.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
        totalStudents += students;
        return {
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          roomCount: rooms.length,
          studentCount: students
        };
      });

      return res.json({
        success: true,
        summary: {
          block: { block_id: block.block_id, name: block.name, hostel_name: block.Hostel?.name || 'Unknown' },
          totalFloors: floors.length,
          totalRooms,
          totalStudents,
          floorSummary
        }
      });
    }

    if (hostelId) {
      const blocks = await Block.findAll({
        where: { hostel_id: hostelId },
        include: [{
          model: Floor,
          include: [Room]
        }],
        order: [['name', 'ASC']]
      });

      const result = blocks.map(b => {
        const floors = b.Floors || [];
        const rooms = floors.flatMap(f => f.Rooms || []);
        const totalRooms = rooms.length;
        const lockedRooms = rooms.filter(r => r.status === 'Locked').length;
        const reservedRooms = rooms.filter(r => r.is_reserved).length;
        const vacantRooms = rooms.filter(r => r.status === 'Vacant' && !r.is_reserved).length;

        return {
          block_id: b.block_id,
          name: b.name,
          hostel_id: b.hostel_id,
          is_reserved: b.is_reserved,
          stats: {
            totalRooms,
            lockedRooms,
            reservedRooms,
            vacantRooms
          }
        };
      });

      return res.json({ blocks: result });
    }

    return res.status(400).json({ error: 'blockId parameter or hostelId query parameter is required' });
  } catch (err) {
    console.error('Error in getBlockSummary:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Get Floor Summary Stats
async function getFloorSummary(req, res) {
  try {
    const targetFloorId = req.params.floorId || req.query.floorId;
    const blockId = req.query.blockId;

    if (targetFloorId) {
      const floor = await Floor.findByPk(targetFloorId, { include: [{ model: Block, include: [Hostel] }] });
      if (!floor) return res.status(404).json({ error: 'Floor not found' });

      const rooms = await Room.findAll({
        where: { floor_id: targetFloorId },
        attributes: ['room_id', 'room_number', 'status', 'current_occupancy', 'capacity']
      });

      let totalStudents = 0;
      let vacant = 0;
      let pending = 0;
      let locked = 0;

      rooms.forEach(room => {
        totalStudents += (room.current_occupancy || 0);
        if (room.status === 'Vacant') vacant++;
        else if (room.status === 'Pending_Pairing') pending++;
        else if (room.status === 'Locked') locked++;
      });

      return res.json({
        success: true,
        summary: {
          floor: {
            floor_id: floor.floor_id,
            floor_number: floor.floor_number,
            block_name: floor.Block?.name || 'Unknown',
            hostel_name: floor.Block?.Hostel?.name || 'Unknown'
          },
          totalRooms: rooms.length,
          totalStudents,
          vacant,
          pending,
          locked,
          rooms
        }
      });
    }

    if (blockId) {
      const floors = await Floor.findAll({
        where: { block_id: blockId },
        include: [Room],
        order: [['floor_number', 'ASC']]
      });

      const result = floors.map(f => {
        const rooms = f.Rooms || [];
        return {
          floor_id: f.floor_id,
          floor_number: f.floor_number,
          block_id: f.block_id,
          is_reserved: f.is_reserved,
          totalRooms: rooms.length,
          reservedRooms: rooms.filter(r => r.is_reserved).length,
          lockedRooms: rooms.filter(r => r.status === 'Locked').length,
          vacantRooms: rooms.filter(r => r.status === 'Vacant' && !r.is_reserved).length
        };
      });

      return res.json({ floors: result });
    }

    return res.status(400).json({ error: 'floorId parameter or blockId query parameter is required' });
  } catch (err) {
    console.error('Error in getFloorSummary:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Get Room Occupants
async function getRoomOccupants(req, res) {
  try {
    const { roomId } = req.params;
    const room = await Room.findByPk(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const occupants = await Student.findAll({
      where: { booked_room_id: roomId },
      attributes: ['roll_number', 'full_name', 'programme', 'year', 'gender']
    });

    return res.json({
      success: true,
      occupants
    });
  } catch (err) {
    console.error('Error in getRoomOccupants:', err);
    return res.status(500).json({ error: err.message });
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
  const id = req.params.id || req.params.hostelId;
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

    // 4. Unlink allocation rules before deleting hostel/blocks
    const blocks = await Block.findAll({
      attributes: ['block_id'],
      where: { hostel_id: id },
      transaction
    });
    const blockIds = blocks.map(b => b.block_id);
    await AllocationRule.update(
      { block_id: null, hostel_id: null },
      { where: { [Op.or]: [{ hostel_id: id }, { block_id: blockIds.length > 0 ? blockIds : [-1] }] }, transaction }
    );

    // 5. Delete the hostel (cascades to blocks → floors → rooms → bookings)
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
  const id = req.params.id || req.params.hostelId;
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

    // 8. Unlink allocation_rules before deleting blocks so rules are preserved
    const blocks = await Block.findAll({
      attributes: ['block_id'],
      where: { hostel_id: id },
      transaction
    });
    const blockIds = blocks.map(b => b.block_id);
    if (blockIds.length > 0) {
      await AllocationRule.update(
        { block_id: null },
        { where: { block_id: blockIds }, transaction }
      );
      console.log(`🛡️ Preserved allocation rules for hostel #${id} (set block_id = null)`);
    }

    // 9. Delete all blocks in this hostel
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

    // 4. Unlink allocation_rules before deleting block so rules are preserved
    await AllocationRule.update(
      { block_id: null },
      { where: { block_id: id }, transaction }
    );

    // 5. Delete the block (cascades to floors → rooms)
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
    const { search, gender, programme, year, status, department } = req.query;
    const where = {};

    if (gender && gender !== 'ALL') where.gender = gender;
    if (programme && programme !== 'ALL') where.programme = programme;
    if (year && year !== 'ALL') where.year = parseInt(year, 10);
    if (status && status !== 'ALL') where.booking_status = status;
    if (department && department !== 'ALL') where.department = department;

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
      attributes: [
        'roll_number',
        'full_name',
        'email',
        'gender',
        'programme',
        'year',
        'department',
        'admission_year',
        'program_code',
        'hostel_stay_end_year',
        'status',
        'booking_status',
        'booked_room_id',
        'created_at',
        'graduated_at'
      ],
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          attributes: ['room_id', 'room_number'],
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        },
        {
          model: ProgramCode,
          attributes: ['name', 'duration', 'hostel_stay']
        }
      ],
      order: [['roll_number', 'ASC']],
      limit: 1000
    });

    return res.json({ success: true, students });
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
    const { status, gender, programme, year, search, department } = req.query;

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
    if (department && department !== 'ALL') {
      where.department = department;
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

    const departmentBreakdown = await Student.findAll({
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('roll_number')), 'count']
      ],
      where,
      group: ['department'],
      order: [['department', 'ASC']],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        total: parseInt(totalCount, 10) || 0,
        programmeBreakdown: programmeBreakdown.map(p => ({ ...p, count: parseInt(p.count, 10) || 0 })),
        genderBreakdown: genderBreakdown.map(g => ({ ...g, count: parseInt(g.count, 10) || 0 })),
        statusBreakdown: statusBreakdown.map(s => ({ ...s, count: parseInt(s.count, 10) || 0 })),
        departmentBreakdown: departmentBreakdown.map(d => ({ ...d, count: parseInt(d.count, 10) || 0 }))
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
    const { hostelId, programme, year, blockId, block_id } = req.query;
    const where = {};

    if (hostelId && hostelId !== 'ALL') {
      where.hostel_id = parseInt(hostelId, 10);
    }
    if (programme && programme !== 'ALL') {
      where.programme = programme;
    }
    if (year && year !== 'ALL') {
      if (year === 'NULL') {
        where.allowed_year = null;
      } else {
        where.allowed_year = parseInt(year, 10);
      }
    }

    const targetBlockId = blockId || block_id;
    if (targetBlockId && targetBlockId !== 'ALL') {
      where.block_id = parseInt(targetBlockId, 10);
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
    console.error('❌ Error fetching allocation rules:', error);
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

    // Validate floor range against actual block floors
    const floors = await Floor.findAll({
      where: { block_id: targetBlockId },
      attributes: ['floor_number'],
      order: [['floor_number', 'ASC']]
    });

    if (floors.length === 0) {
      return res.status(400).json({ error: 'This block has no floors. Please add floors first.' });
    }

    const floorNumbers = floors.map(f => f.floor_number);
    const minFloor = Math.min(...floorNumbers);
    const maxFloor = Math.max(...floorNumbers);

    if (start < minFloor) {
      return res.status(400).json({ 
        error: `Block floors start at ${minFloor}. Please enter a floor range within ${minFloor} to ${maxFloor}.` 
      });
    }

    if (end > maxFloor) {
      return res.status(400).json({ 
        error: `Block has only ${floors.length} floor(s) (${minFloor} to ${maxFloor}). Please enter a valid floor range within this block.` 
      });
    }

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
      gender: gender || (block && block.gender) || 'Male',
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

    const floors = await Floor.findAll({
      where: { block_id: rule.block_id },
      attributes: ['floor_number'],
      order: [['floor_number', 'ASC']]
    });

    if (floors.length === 0) {
      return res.status(400).json({ error: 'This block has no floors. Please add floors first.' });
    }

    const floorNumbers = floors.map(f => f.floor_number);
    const minFloor = Math.min(...floorNumbers);
    const maxFloor = Math.max(...floorNumbers);

    if (rule.floor_start < minFloor) {
      return res.status(400).json({ 
        error: `Block floors start at ${minFloor}. Please enter a floor range within ${minFloor} to ${maxFloor}.` 
      });
    }

    if (rule.floor_end > maxFloor) {
      return res.status(400).json({ 
        error: `Block has only ${floors.length} floor(s) (${minFloor} to ${maxFloor}). Please enter a valid floor range within this block.` 
      });
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

  if (!roomId || roomId === 'undefined' || roomId === 'null') {
    return res.status(400).json({ success: false, error: 'Invalid or missing Room ID.' });
  }

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

    const targetRoomId = room.room_id;

    // 2. Determine which students to release
    if (clearAll === true) {
      // ClearAll takes priority: find any occupants and release them, then reset room to Vacant
      const occupants = await Student.findAll({
        where: { booked_room_id: targetRoomId },
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
                { source_room_id: targetRoomId },
                { target_room_id: targetRoomId },
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
        booked_room_id: targetRoomId
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
            { source_room_id: targetRoomId },
            { target_room_id: targetRoomId },
            { initiator_roll: validRolls },
            { target_student_roll: validRolls }
          ]
        },
        transaction
      }
    );

    const remainingCount = await Student.count({
      where: { booked_room_id: targetRoomId },
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
    const targetFloorId = req.params.floorId || req.query.floorId;
    const { blockId } = req.query;

    if (targetFloorId) {
      const floor = await Floor.findByPk(targetFloorId, { include: [{ model: Block, include: [Hostel] }] });
      if (!floor) return res.status(404).json({ error: 'Floor not found' });

      const rooms = await Room.findAll({
        where: { floor_id: targetFloorId },
        attributes: ['room_id', 'room_number', 'status', 'current_occupancy', 'capacity']
      });

      let totalStudents = 0;
      let vacant = 0;
      let pending = 0;
      let locked = 0;

      rooms.forEach(room => {
        totalStudents += (room.current_occupancy || 0);
        if (room.status === 'Vacant') vacant++;
        else if (room.status === 'Pending_Pairing') pending++;
        else if (room.status === 'Locked') locked++;
      });

      return res.json({
        success: true,
        summary: {
          floor: {
            floor_id: floor.floor_id,
            floor_number: floor.floor_number,
            block_name: floor.Block?.name || 'Unknown',
            hostel_name: floor.Block?.Hostel?.name || 'Unknown'
          },
          totalRooms: rooms.length,
          totalStudents,
          vacant,
          pending,
          locked,
          rooms
        }
      });
    }

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
    const targetBlockId = req.params.blockId || req.query.blockId;
    const { hostelId } = req.query;

    if (targetBlockId) {
      const block = await Block.findByPk(targetBlockId, { include: [{ model: Hostel }] });
      if (!block) return res.status(404).json({ error: 'Block not found' });

      const floors = await Floor.findAll({
        where: { block_id: targetBlockId },
        include: [{ model: Room }]
      });

      let totalRooms = 0;
      let totalStudents = 0;
      const floorSummary = floors.map(floor => {
        const rooms = floor.Rooms || [];
        totalRooms += rooms.length;
        const students = rooms.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
        totalStudents += students;
        return {
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          roomCount: rooms.length,
          studentCount: students
        };
      });

      return res.json({
        success: true,
        summary: {
          block: { block_id: block.block_id, name: block.name, hostel_name: block.Hostel?.name || 'Unknown' },
          totalFloors: floors.length,
          totalRooms,
          totalStudents,
          floorSummary
        }
      });
    }

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
    if (!id || id === 'null' || id === 'undefined' || isNaN(parseInt(id, 10))) {
      return res.status(400).json({ success: false, error: 'Invalid room ID provided.' });
    }
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
    if (!roomId || roomId === 'null' || roomId === 'undefined' || isNaN(parseInt(roomId, 10))) {
      return res.status(400).json({ success: false, error: 'Invalid room ID provided.' });
    }
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

// DLQ Admin Handlers: Get Failed PDF Jobs
async function getFailedPdfJobs(req, res) {
  try {
    const failedPdfQueue = require('../queues/failedPdfQueue');
    const jobs = await failedPdfQueue.getJobs(['failed', 'completed', 'waiting', 'active']);
    const formattedJobs = jobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      timestamp: j.timestamp
    }));
    return res.json({ success: true, jobs: formattedJobs });
  } catch (err) {
    console.error('Error fetching failed PDF jobs:', err);
    return res.status(500).json({ error: err.message });
  }
}

// DLQ Admin Handlers: Retry Failed PDF Job
async function retryFailedPdfJob(req, res) {
  try {
    const pdfQueue = require('../queues/pdfQueue');
    const failedPdfQueue = require('../queues/failedPdfQueue');
    const { jobId } = req.params;

    const job = await failedPdfQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Failed job with ID ${jobId} not found.` });
    }

    // Extract payload and re-add to main pdfQueue
    const originalData = job.data.data || job.data;
    await pdfQueue.add('generate', originalData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    // Remove from DLQ
    await job.remove();

    return res.json({ success: true, message: `Job ${jobId} retried successfully and pushed back to active pdf-generation queue.` });
  } catch (err) {
    console.error('Error retrying failed PDF job:', err);
    return res.status(500).json({ error: err.message });
  }
}

// 11. Get student profile with full details
async function getStudentProfile(req, res) {
  try {
    const { rollNumber } = req.params;
    const student = await Student.findByPk(rollNumber, {
      include: [
        { model: ProgramCode, attributes: ['name', 'duration', 'hostel_stay'] },
        {
          model: Room,
          as: 'BookedRoom',
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }]
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json({ success: true, student });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 12. Get student history (rooms, roommates, swaps, PDFs)
async function getStudentHistory(req, res) {
  try {
    const { rollNumber } = req.params;

    const student = await Student.findByPk(rollNumber);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get roommates (all students in the same room, excluding self)
    let roommates = [];
    if (student.booked_room_id) {
      roommates = await Student.findAll({
        where: {
          booked_room_id: student.booked_room_id,
          roll_number: { [Op.ne]: rollNumber },
        },
        attributes: ['roll_number', 'full_name', 'email', 'programme', 'year', 'gender', 'department'],
        order: [['roll_number', 'ASC']],
      });
    }

    const bookings = await Booking.findAll({
      where: { student_roll: rollNumber },
      include: [
        {
          model: Room,
          include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }],
        },
        {
          model: Student,
          as: 'PairedStudent',
          attributes: ['roll_number', 'full_name'],
        },
      ],
      order: [['booking_date', 'ASC']],
    });

    const swaps = await SwapRequest.findAll({
      where: {
        [Op.or]: [
          { initiator_roll: rollNumber },
          { target_student_roll: rollNumber },
        ],
      },
      include: [
        { model: Student, as: 'Initiator', attributes: ['roll_number', 'full_name'] },
        { model: Student, as: 'TargetStudent', attributes: ['roll_number', 'full_name'] },
        { model: Room, as: 'SourceRoom' },
        { model: Room, as: 'TargetRoom' },
      ],
      order: [['created_at', 'DESC']],
    });

    const pdfs = await PDFHistory.findAll({
      where: { student_roll: rollNumber },
      order: [['version', 'DESC']],
    });

    return res.json({
      success: true,
      history: {
        roommates,
        bookings,
        swaps,
        pdfs,
      },
    });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 13. Batch remove students by programme + year
async function batchRemoveStudents(req, res) {
  try {
    const programme = req.body?.programme || req.query?.programme;
    const rawYear = req.body?.year !== undefined ? req.body.year : req.query?.year;
    if (!programme || rawYear === undefined) {
      return res.status(400).json({ error: 'programme and year are required' });
    }
    const year = parseInt(rawYear, 10);

    const students = await Student.findAll({
      where: {
        programme,
        year,
        status: 'active',
      },
    });

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found in this batch' });
    }

    const roomIds = students.map(s => s.booked_room_id).filter(id => id !== null);

    const deletedCount = await Student.destroy({
      where: {
        roll_number: students.map(s => s.roll_number),
      },
    });

    if (roomIds.length > 0) {
      await Room.update(
        { current_occupancy: 0, status: 'Vacant' },
        { where: { room_id: roomIds } }
      );
      await Booking.destroy({ where: { room_id: roomIds } });
    }

    return res.json({
      success: true,
      message: `Removed ${deletedCount} students from ${programme} Year ${year}`,
      deletedCount,
      freedRooms: roomIds.length,
    });
  } catch (error) {
    console.error('Batch removal error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 14. Archive a student (soft delete)
async function archiveStudent(req, res) {
  try {
    const { rollNumber } = req.params;
    const student = await Student.findByPk(rollNumber);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.booked_room_id) {
      await Room.update(
        { current_occupancy: 0, status: 'Vacant' },
        { where: { room_id: student.booked_room_id } }
      );
      await Booking.destroy({ where: { student_roll: rollNumber } });
    }

    await student.update({
      status: 'archived',
      graduated_at: new Date(),
      booked_room_id: null,
      booking_status: 'Pending',
    });

    return res.json({
      success: true,
      message: `Student ${rollNumber} archived successfully.`,
      student,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 15. Export students roster to CSV
async function exportStudents(req, res) {
  try {
    const { search, gender, programme, year, status, department, admissionYear } = req.query;
    const where = {};

    if (gender && gender !== 'ALL') where.gender = gender;
    if (programme && programme !== 'ALL') where.programme = programme;
    if (year && year !== 'ALL') where.year = parseInt(year, 10);
    if (status && status !== 'ALL') where.booking_status = status;
    if (department && department !== 'ALL') where.department = department;
    if (admissionYear && admissionYear !== 'ALL') where.admission_year = parseInt(admissionYear, 10);

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
        { model: Room, as: 'BookedRoom', attributes: ['room_number'] }
      ],
      order: [['roll_number', 'ASC']],
    });

    const headers = ['Roll Number', 'Full Name', 'Email', 'Gender', 'Programme', 'Year', 'Department', 'Admission Year', 'Hostel Stay End Year', 'Status', 'Room Number'];
    const rows = students.map(s => [
      `"${s.roll_number || ''}"`,
      `"${s.full_name || ''}"`,
      `"${s.email || ''}"`,
      `"${s.gender || ''}"`,
      `"${s.programme || ''}"`,
      s.year || '',
      `"${s.department || ''}"`,
      s.admission_year || '',
      s.hostel_stay_end_year || '',
      `"${s.status || ''}"`,
      `"${s.BookedRoom?.room_number || 'Unassigned'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_roster.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export students error:', err);
    return res.status(500).json({ error: 'Failed to export students' });
  }
}

// 16. Unarchive a student (restore from soft delete)
async function unarchiveStudent(req, res) {
  try {
    const { rollNumber } = req.params;

    const student = await Student.findByPk(rollNumber);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.status !== 'archived') {
      return res.status(400).json({ error: 'Student is not archived' });
    }

    await student.update({
      status: 'active',
      graduated_at: null,
    });

    return res.json({
      success: true,
      message: `Student ${rollNumber} restored successfully.`,
      student,
    });
  } catch (error) {
    console.error('Unarchive error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 17. Get available rooms for student assignment
async function getAvailableRooms(req, res) {
  try {
    const { rollNumber } = req.params;

    const student = await Student.findByPk(rollNumber, {
      include: [{ model: ProgramCode }],
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch all hostels matching nested blocks, floors, rooms
    const hostels = await Hostel.findAll({
      include: [
        {
          model: Block,
          where: { is_reserved: false },
          required: true,
          include: [
            {
              model: Floor,
              where: { is_reserved: false },
              required: true,
              include: [
                {
                  model: Room,
                  where: {
                    is_reserved: false,
                    status: { [Op.in]: ['Vacant', 'Pending_Pairing'] },
                  },
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['name', 'ASC'],
        [{ model: Block }, 'name', 'ASC'],
        [{ model: Block }, { model: Floor }, 'floor_number', 'ASC'],
        [{ model: Block }, { model: Floor }, { model: Room }, 'room_number', 'ASC'],
      ],
    });

    // Fetch all allocation rules
    const rules = await AllocationRule.findAll();

    // Filter hostels, blocks, floors, rooms by allocation rules & capacity
    const filteredHostels = hostels.map(hostel => {
      const hostelPlain = hostel.get({ plain: true });

      const eligibleBlocks = hostelPlain.Blocks.map(block => {
        const blockRules = rules.filter(r => r.hostel_id === hostel.hostel_id && r.block_id === block.block_id);

        const eligibleFloors = block.Floors.map(floor => {
          // Check floor-level allocation rules
          if (blockRules.length > 0) {
            const matchingRule = blockRules.find(r =>
              r.floor_start <= floor.floor_number &&
              r.floor_end >= floor.floor_number &&
              r.programme === student.programme &&
              (r.allowed_year === null || r.allowed_year === student.year) &&
              (r.gender === null || r.gender === student.gender)
            );
            const conflictingRule = blockRules.find(r =>
              r.floor_start <= floor.floor_number &&
              r.floor_end >= floor.floor_number &&
              (r.programme !== student.programme || (r.allowed_year !== null && r.allowed_year !== student.year) || (r.gender !== null && r.gender !== student.gender))
            );
            // If there's a conflicting rule and no matching rule, exclude this floor
            if (conflictingRule && !matchingRule) {
              return null;
            }
          }

          // Filter available rooms with capacity remaining
          const availableRooms = floor.Rooms.filter(r => r.current_occupancy < r.capacity);
          if (availableRooms.length === 0) return null;

          return { ...floor, Rooms: availableRooms };
        }).filter(Boolean);

        if (eligibleFloors.length === 0) return null;
        return { ...block, Floors: eligibleFloors };
      }).filter(Boolean);

      if (eligibleBlocks.length === 0) return null;
      return { ...hostelPlain, Blocks: eligibleBlocks };
    }).filter(Boolean);

    return res.json({ success: true, hostels: filteredHostels });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 18. Assign student to a room
async function assignRoom(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { rollNumber } = req.params;
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    // 1. Get student
    const student = await Student.findByPk(rollNumber, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2. Check if student already has a room (reassignment handling)
    if (student.booked_room_id) {
      const oldRoom = await Room.findByPk(student.booked_room_id, { transaction });
      if (oldRoom) {
        oldRoom.current_occupancy = Math.max(0, oldRoom.current_occupancy - 1);
        if (oldRoom.current_occupancy === 0) {
          oldRoom.status = 'Vacant';
        } else {
          oldRoom.status = 'Pending_Pairing';
        }
        await oldRoom.save({ transaction });

        // Reset any remaining students in old room if it was previously locked
        await Student.update(
          { booking_status: 'Pending' },
          { where: { booked_room_id: oldRoom.room_id }, transaction }
        );

        // Delete old booking
        await Booking.destroy({
          where: { student_roll: rollNumber },
          transaction,
        });
      }
    }

    // 3. Get room
    const room = await Room.findByPk(roomId, {
      include: [{ model: Floor, include: [{ model: Block, include: [Hostel] }] }],
      transaction,
    });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Target room not found' });
    }

    // 4. Check if room is full
    if (room.current_occupancy >= room.capacity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Room is already full' });
    }

    // 5. Assign student to room
    await student.update({
      booked_room_id: room.room_id,
      booking_status: 'Pending', // Will become Locked when room is full
    }, { transaction });

    // 6. Update room occupancy
    room.current_occupancy += 1;
    const isFull = room.current_occupancy >= room.capacity;
    room.status = isFull ? 'Locked' : 'Pending_Pairing';
    await room.save({ transaction });

    // 7. Create booking record
    await Booking.create({
      room_id: room.room_id,
      student_roll: rollNumber,
      booking_date: new Date(),
      is_primary: true,
      paired_with: null,
    }, { transaction });

    // 8. If room is full, lock all students in the room
    if (isFull) {
      await Student.update(
        { booking_status: 'Locked' },
        { where: { booked_room_id: room.room_id }, transaction }
      );
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: `Student assigned to Room ${room.room_number}`,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        status: room.status,
        current_occupancy: room.current_occupancy,
        capacity: room.capacity,
        isFull,
      },
      isFull,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Assign room error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 14. Get eligible students for a room
async function getEligibleStudentsForRoom(req, res) {
  try {
    const { roomId } = req.params;

    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: Floor,
          include: [
            {
              model: Block,
              include: [Hostel],
            },
          ],
        },
      ],
    });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const hostel = room.Floor.Block.Hostel;
    const block = room.Floor.Block;

    // Get allocation rules for this block & floor
    const rules = await AllocationRule.findAll({
      where: {
        hostel_id: hostel.hostel_id,
        block_id: block.block_id,
        floor_start: { [Op.lte]: room.Floor.floor_number },
        floor_end: { [Op.gte]: room.Floor.floor_number },
      },
    });

    let whereClause = {
      booking_status: 'Pending',
      booked_room_id: null,
      status: 'active',
    };

    if (rules && rules.length > 0) {
      const ruleConditions = rules.map(rule => {
        const cond = { programme: rule.programme };
        if (rule.gender) cond.gender = rule.gender;
        if (rule.allowed_year !== null && rule.allowed_year !== undefined) {
          cond.year = rule.allowed_year;
        }
        return cond;
      });
      whereClause[Op.or] = ruleConditions;
    }

    const eligibleStudents = await Student.findAll({
      where: whereClause,
      attributes: ['roll_number', 'full_name', 'email', 'gender', 'programme', 'year', 'department'],
      order: [['full_name', 'ASC']],
    });

    return res.json({ success: true, eligibleStudents });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    return res.status(500).json({ error: error.message });
  }
}

// 15. Assign student to room (admin override)
async function assignStudentToRoom(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { roomId } = req.params;
    const { rollNumber } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ error: 'rollNumber is required' });
    }

    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: Floor,
          include: [
            {
              model: Block,
              include: [Hostel],
            },
          ],
        },
      ],
      transaction,
    });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.current_occupancy >= room.capacity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Room is already full' });
    }

    const student = await Student.findByPk(rollNumber, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.booked_room_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Student is already assigned to a room' });
    }

    const hostel = room.Floor.Block.Hostel;

    if (hostel.allowed_gender && hostel.allowed_gender !== student.gender) {
      await transaction.rollback();
      return res.status(400).json({ error: `Gender mismatch with hostel (Hostel is for ${hostel.allowed_gender}s)` });
    }

    // Assign student
    await student.update({
      booked_room_id: room.room_id,
      booking_status: 'Pending',
    }, { transaction });

    // Create booking record
    await Booking.create({
      student_roll: student.roll_number,
      room_id: room.room_id,
      booking_date: new Date(),
      status: 'confirmed',
    }, { transaction });

    room.current_occupancy += 1;
    const isFull = room.current_occupancy >= room.capacity;
    room.status = isFull ? 'Locked' : 'Pending_Pairing';
    await room.save({ transaction });

    if (isFull) {
      await Student.update(
        { booking_status: 'Locked' },
        { where: { booked_room_id: room.room_id }, transaction }
      );
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: `Student ${student.full_name} (${rollNumber}) assigned to Room ${room.room_number}`,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        status: room.status,
        current_occupancy: room.current_occupancy,
        capacity: room.capacity,
        isFull,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Assign student error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Search for a student by roll number or email and check eligibility for a room
 * GET /api/admin/rooms/:roomId/search-student?query=2024CE00534
 */
async function searchEligibleStudent(req, res) {
  try {
    const { roomId } = req.params;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ eligible: false, message: 'Please enter at least 2 characters.' });
    }

    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: Floor,
          include: [
            {
              model: Block,
              include: [Hostel],
            },
          ],
        },
      ],
    });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if room is full
    if (room.current_occupancy >= room.capacity) {
      return res.json({ eligible: false, message: 'Room is already full.' });
    }

    const searchQuery = query.trim();

    // Find the student by roll number or email
    const student = await Student.findOne({
      where: {
        [Op.or]: [
          { roll_number: { [Op.iLike]: searchQuery } },
          { email: { [Op.iLike]: searchQuery } },
        ],
      },
      include: [
        {
          model: Room,
          as: 'BookedRoom',
          attributes: ['room_number'],
        },
      ],
    });

    if (!student) {
      return res.json({ eligible: false, message: `No student found matching "${searchQuery}".` });
    }

    // Check if student is already assigned
    if (student.booked_room_id) {
      return res.json({
        eligible: false,
        message: `Student ${student.full_name} (${student.roll_number}) is already assigned to Room ${student.BookedRoom?.room_number || student.booked_room_id}.`,
      });
    }

    if (student.booking_status !== 'Pending') {
      return res.json({
        eligible: false,
        message: `Student is not available for assignment (status: ${student.booking_status}).`,
      });
    }

    if (student.status === 'archived') {
      return res.json({
        eligible: false,
        message: `Student ${student.full_name} is archived. Unarchive them first.`,
      });
    }

    // Check eligibility (gender, programme, year, allocation rules)
    const hostel = room.Floor.Block.Hostel;
    const block = room.Floor.Block;

    if (hostel.allowed_gender && hostel.allowed_gender !== student.gender) {
      return res.json({
        eligible: false,
        message: `Gender mismatch (${student.full_name} is ${student.gender}, but Hostel "${hostel.name}" is for ${hostel.allowed_gender}s).`,
      });
    }

    const rule = await AllocationRule.findOne({
      where: {
        hostel_id: hostel.hostel_id,
        block_id: block.block_id,
        programme: student.programme,
        [Op.or]: [
          { allowed_year: student.year },
          { allowed_year: null },
        ],
        floor_start: { [Op.lte]: room.Floor.floor_number },
        floor_end: { [Op.gte]: room.Floor.floor_number },
      },
    });

    if (!rule) {
      return res.json({
        eligible: false,
        message: `Student ${student.full_name} is not eligible for this room (No allocation rule allows ${student.programme} Year ${student.year} on Floor ${room.Floor.floor_number}).`,
      });
    }

    return res.json({
      eligible: true,
      student: {
        roll_number: student.roll_number,
        full_name: student.full_name,
        email: student.email,
        gender: student.gender,
        programme: student.programme,
        year: student.year,
        department: student.department,
      },
    });
  } catch (error) {
    console.error('Search student error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Delete a student permanently (hard delete)
 * DELETE /api/admin/students/:rollNumber
 */
async function deleteStudent(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { rollNumber } = req.params;

    // 1. Find the student
    const student = await Student.findByPk(rollNumber, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2. If the student has a room, free it
    if (student.booked_room_id) {
      const room = await Room.findByPk(student.booked_room_id, { transaction });
      if (room) {
        room.current_occupancy = Math.max(0, room.current_occupancy - 1);
        if (room.current_occupancy === 0) {
          room.status = 'Vacant';
        } else {
          room.status = 'Pending_Pairing';
        }
        await room.save({ transaction });
      }
    }

    // 3. Delete bookings
    await Booking.destroy({
      where: { student_roll: rollNumber },
      transaction,
    });

    // 4. Delete PDF history
    await PDFHistory.destroy({
      where: { student_roll: rollNumber },
      transaction,
    });

    // 5. Delete swap requests where the student is involved (as initiator or target)
    await SwapRequest.destroy({
      where: {
        [Op.or]: [
          { initiator_roll: rollNumber },
          { target_student_roll: rollNumber },
        ],
      },
      transaction,
    });

    // 6. Finally, delete the student
    await student.destroy({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: `Student ${rollNumber} deleted successfully.`,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete student error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
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
};



