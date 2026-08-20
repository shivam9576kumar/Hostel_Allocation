console.log('🚀 APP.JS IS EXECUTING!');

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
const { studentRateLimiter, adminRateLimiter } = require('./middleware/rateLimiter');

// Import Health Routes
const healthRoutes = require('./routes/health');
console.log('✅ healthRoutes imported:', typeof healthRoutes, healthRoutes);

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const swapRoutes = require('./routes/swapRoutes');

const compression = require('compression');

const app = express();

// Enable trust proxy
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production' ? 1 : 0);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 Incoming request: ${req.method} ${req.url}`);
  next();
});

// Fix for "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Hostel Booking Backend API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      adminLogin: '/api/admin/login',
      studentLogin: '/api/students/login',
      docs: 'https://github.com/shivam9576kumar/Hostel_Allocation'
    }
  });
});

// 1. CORS Middleware (Must be FIRST before any rate limit or routes so error responses include CORS headers)
app.use(cors({
  origin: true, // Dynamically mirror request origin for localhost / local IP testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Enable HTTP response compression (reduces payload by 60-80%)
app.use(compression());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= HARDCODED HEALTH CHECK (FOR DIAGNOSTICS) =============
console.log('✅ Registering /ping route');
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Server is reachable' });
});

console.log('✅ Registering /health route');
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hardcoded health check works!' });
});

console.log('✅ Registering healthRoutes');
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Apply rate limiters
app.use('/api/students', studentRateLimiter);
app.use('/api/student', studentRateLimiter);
app.use('/api/booking', studentRateLimiter);
app.use('/api/swap', studentRateLimiter);
app.use('/api/admin', adminRateLimiter);

// Bull-Board Queue Monitoring Dashboard Setup
try {
  const { createBullBoard } = require('@bull-board/api');
  const { BullAdapter } = require('@bull-board/api/bullAdapter');
  const { ExpressAdapter } = require('@bull-board/express');
  const pdfQueue = require('./queues/pdfQueue');
  const failedPdfQueue = require('./queues/failedPdfQueue');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(pdfQueue), new BullAdapter(failedPdfQueue)],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
} catch (err) {
  console.warn('[Bull-Board] Skipped dashboard initialization due to Redis version limitation:', err.message);
}

// Automatically start PDF Worker in server process to consume queued jobs immediately
try {
  require('./workers/pdfWorker');
  console.log('🚀 [App] PDF Worker listener initialized in backend server.');
} catch (workerErr) {
  console.warn('[App] PDF Worker initialization warning:', workerErr.message);
}

// Route Registrations
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', swapRoutes);

console.log('📋 Registered Routes:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      console.log(Object.keys(layer.route.methods).join(',').toUpperCase(), layer.route.path);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      layer.handle.stack.forEach((subLayer) => {
        if (subLayer.route) {
          console.log('  ->', Object.keys(subLayer.route.methods).join(',').toUpperCase(), subLayer.route.path);
        }
      });
    }
  });
}

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

    // 3. Auto-Seed completed (Sample hostels auto-creation removed)
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

    const PORT = env.port || 5000;
    const HOST = process.env.HOST || '0.0.0.0';
    console.log(`🚀 Attempting to listen on ${HOST}:${PORT}`);
    app.listen(PORT, HOST, () => {
      console.log(`[Server] IIT Hostel Booking API running on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('[Server Error] Failed to start server:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
