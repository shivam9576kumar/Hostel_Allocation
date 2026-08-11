const { parseAndInsertStudents } = require('../utils/csvParser');
const { Hostel, Block, Floor, Room, Booking, Student, sequelize } = require('../models');
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
    const { gender, programme, year } = req.query;
    const where = {};

    if (gender && gender !== 'ALL') where.allowed_gender = gender;
    if (programme && programme !== 'ALL') where.allowed_programme = programme;
    if (year && year !== 'ALL') where.allowed_year = parseInt(year, 10);

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
    const { name, allowed_gender, allowed_programme, allowed_year, start_time, end_time } = req.body;
    if (!name || !allowed_gender || !allowed_programme || !allowed_year || !start_time || !end_time) {
      return res.status(400).json({ error: 'All hostel details, eligibility, and time window parameters are required.' });
    }

    const hostel = await Hostel.create({
      name,
      allowed_gender,
      allowed_programme,
      allowed_year: parseInt(allowed_year, 10),
      start_time: new Date(start_time),
      end_time: new Date(end_time)
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
    const { name, allowed_gender, allowed_programme, allowed_year, start_time, end_time } = req.body;

    const hostel = await Hostel.findByPk(id);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    await hostel.update({
      name: name || hostel.name,
      allowed_gender: allowed_gender || hostel.allowed_gender,
      allowed_programme: allowed_programme || hostel.allowed_programme,
      allowed_year: allowed_year !== undefined ? parseInt(allowed_year, 10) : hostel.allowed_year,
      start_time: start_time ? new Date(start_time) : hostel.start_time,
      end_time: end_time ? new Date(end_time) : hostel.end_time
    });

    return res.json({ message: 'Hostel updated successfully.', hostel });
  } catch (err) {
    console.error('Error in updateHostel:', err);
    return res.status(500).json({ error: 'Failed to update hostel.' });
  }
}

// 5. Delete Hostel (Cascade Delete Blocks, Floors, Rooms, Bookings)
async function deleteHostel(req, res) {
  try {
    const { id } = req.params;
    const hostel = await Hostel.findByPk(id);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    await hostel.destroy();
    return res.json({ message: `Hostel #${id} and all its hierarchy were deleted successfully.` });
  } catch (err) {
    console.error('Error in deleteHostel:', err);
    return res.status(500).json({ error: 'Failed to delete hostel.' });
  }
}

// 6. Clear Hostel Data (Delete all blocks, floors, rooms, and bookings – keep hostel & student profiles)
async function clearHostelData(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const hostel = await Hostel.findByPk(id, { transaction });
    if (!hostel) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Hostel not found.' });
    }

    // Find all blocks belonging to hostel
    const blocks = await Block.findAll({ where: { hostel_id: id }, transaction });
    const blockIds = blocks.map(b => b.block_id);

    if (blockIds.length > 0) {
      const floors = await Floor.findAll({ where: { block_id: { [Op.in]: blockIds } }, transaction });
      const floorIds = floors.map(f => f.floor_id);

      if (floorIds.length > 0) {
        const rooms = await Room.findAll({ where: { floor_id: { [Op.in]: floorIds } }, transaction });
        const roomIds = rooms.map(r => r.room_id);

        if (roomIds.length > 0) {
          // Reset booking status on affected students
          const bookings = await Booking.findAll({ where: { room_id: { [Op.in]: roomIds } }, transaction });
          const studentRolls = bookings.map(b => b.student_roll);

          if (studentRolls.length > 0) {
            await Student.update({
              booking_status: 'Pending',
              booked_room_id: null
            }, {
              where: { roll_number: { [Op.in]: studentRolls } },
              transaction
            });
          }

          // Delete bookings
          await Booking.destroy({ where: { room_id: { [Op.in]: roomIds } }, transaction });
          // Delete rooms
          await Room.destroy({ where: { floor_id: { [Op.in]: floorIds } }, transaction });
        }
        // Delete floors
        await Floor.destroy({ where: { block_id: { [Op.in]: blockIds } }, transaction });
      }
      // Delete blocks
      await Block.destroy({ where: { hostel_id: id }, transaction });
    }

    await transaction.commit();
    return res.json({ message: `All blocks, floors, rooms, and bookings for Hostel #${id} cleared successfully.` });
  } catch (err) {
    await transaction.rollback();
    console.error('Error in clearHostelData:', err);
    return res.status(500).json({ error: 'Failed to clear hostel data.' });
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

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { roll_number: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
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
  deleteFloor,
  toggleFloorReservation,
  getRooms,
  createRoom,
  deleteRoom,
  toggleRoomReservation,
  getStudents
};
