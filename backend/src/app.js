const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('./config/env');
const { sequelize, Admin, Student, Hostel, Block, Floor, Room } = require('./models');
const { initDatabaseConnection } = require('./config/database');
const { initExpiryCronJob } = require('./jobs/expiryCleanup');
const { initSwapExpiryJob } = require('./jobs/swapExpiry');
const { parseAndInsertStudents } = require('./utils/csvParser');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const swapRoutes = require('./routes/swapRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Route
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Route Registrations
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', swapRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Auto-seed admins, students, and default active hostels
async function autoSeedIfEmpty() {
  try {
    await sequelize.sync();

    // 1. Check Admins
    const adminCount = await Admin.count();
    if (adminCount === 0) {
      console.log('[Auto-Seed] Seeding default admin accounts...');
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      await Admin.bulkCreate([
        { name: 'Baboo Boss', email: 'baboo.boss@admin.iit.ac.in', password_hash: passwordHash, role: 'Super Admin' },
        { name: 'Shubham', email: 'shubham@admin.iit.ac.in', password_hash: passwordHash, role: 'Admin' },
        { name: 'Ayesha Khan', email: 'ayesha.khan@admin.iit.ac.in', password_hash: passwordHash, role: 'Admin' }
      ]);
      console.log('[Auto-Seed] Seeded 3 admin accounts with password Admin@123');
    }

    // 2. Check Students
    const studentCount = await Student.count();
    if (studentCount === 0) {
      const csvPath = path.join(__dirname, '../../students_500.csv');
      console.log(`[Auto-Seed] Ingesting 500 student records from ${csvPath}...`);
      const result = await parseAndInsertStudents(csvPath);
      console.log(`[Auto-Seed] Ingested ${result.insertedCount} student records successfully.`);
    }

    // 3. Check Hostels & Seed Sample Active Hierarchy for Instant Testing
    const hostelCount = await Hostel.count();
    if (hostelCount === 0) {
      console.log('[Auto-Seed] Seeding initial active hostel hierarchy...');
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 Days

      // Hostel 1: Male, B.Tech, Year 3
      const kumaon = await Hostel.create({
        name: 'Kumaon Hostel',
        allowed_gender: 'Male',
        allowed_programme: 'B.Tech',
        allowed_year: 3,
        start_time: startTime,
        end_time: endTime
      });

      const blockA = await Block.create({ hostel_id: kumaon.hostel_id, name: 'Block A', is_reserved: false });
      const floor1 = await Floor.create({ block_id: blockA.block_id, floor_number: 1, is_reserved: false });

      await Room.bulkCreate([
        { floor_id: floor1.floor_id, room_number: '101', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floor1.floor_id, room_number: '102', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floor1.floor_id, room_number: '103', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floor1.floor_id, room_number: '104', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floor1.floor_id, room_number: '105', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floor1.floor_id, room_number: '106', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false }
      ]);

      // Hostel 2: Female, M.Tech, Year 2
      const nilgiri = await Hostel.create({
        name: 'Nilgiri Hostel',
        allowed_gender: 'Female',
        allowed_programme: 'M.Tech',
        allowed_year: 2,
        start_time: startTime,
        end_time: endTime
      });

      const blockN = await Block.create({ hostel_id: nilgiri.hostel_id, name: 'Block A', is_reserved: false });
      const floorN = await Floor.create({ block_id: blockN.block_id, floor_number: 1, is_reserved: false });

      await Room.bulkCreate([
        { floor_id: floorN.floor_id, room_number: '201', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floorN.floor_id, room_number: '202', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floorN.floor_id, room_number: '203', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false },
        { floor_id: floorN.floor_id, room_number: '204', capacity: 2, current_occupancy: 0, status: 'Vacant', is_reserved: false }
      ]);

      console.log('[Auto-Seed] Seeded sample Kumaon Hostel & Nilgiri Hostel with blocks, floors, and rooms!');
    }
  } catch (err) {
    console.error('[Auto-Seed Error]:', err.message);
  }
}

// Start Server & Connect Database
async function startServer() {
  try {
    await initDatabaseConnection();
    await autoSeedIfEmpty();

    // Initialize Background Cron Jobs
    initExpiryCronJob();
    initSwapExpiryJob();

    const PORT = env.port;
    app.listen(PORT, () => {
      console.log(`[Server] IIT Hostel Booking API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server Error] Failed to start server:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
// Server reloaded successfully

