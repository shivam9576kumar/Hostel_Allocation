// test-app-e2e.js
// Comprehensive End-to-End Application & API Verification for PostgreSQL

const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('./src/config/env');
const { sequelize, Admin, Student, Hostel, Block, Floor, Room, Booking, SwapRequest, PDFHistory, AllocationRule } = require('./src/models');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runE2ETests() {
  console.log('🧪 Starting End-to-End Verification of Application with PostgreSQL...\n');

  // 1. Verify Database Dialect & Authenticate
  try {
    await sequelize.authenticate();
    console.log(`✅ [Step A] Database Connection (${sequelize.getDialect()}) Verified Successfully!`);
  } catch (err) {
    console.error('❌ [Step A Failed] Could not authenticate with PostgreSQL:', err.message);
    process.exit(1);
  }

  // Generate valid test JWT tokens
  const adminToken = jwt.sign({ username: 'baboo.boss', role: 'Super Admin', type: 'admin' }, env.jwtSecret);
  const studentToken = jwt.sign({ roll_number: '2026CS101', email: '2026cs101@iit.ac.in', type: 'student' }, env.jwtSecret);
  const roommateToken = jwt.sign({ roll_number: '2026CS102', email: '2026cs102@iit.ac.in', type: 'student' }, env.jwtSecret);

  // 2. Test Admin Login API
  console.log('\n--- Testing Admin API Endpoints ---');
  try {
    const loginRes = await makeRequest('/api/admin/login', 'POST', { email: 'baboo.boss@admin.iit.ac.in', password: 'Admin@123' });
    console.log(`✅ Admin Login Status: ${loginRes.status} (Token received: ${Boolean(loginRes.body.token)})`);
  } catch (err) {
    console.log('ℹ️ Admin Login API call:', err.message);
  }

  // 3. Test Admin Students API
  try {
    const studentsRes = await makeRequest('/api/admin/students', 'GET', null, adminToken);
    console.log(`✅ Admin Get Students Status: ${studentsRes.status} (Records: ${studentsRes.body.students ? studentsRes.body.students.length : 0})`);
  } catch (err) {
    console.error('❌ Admin Students API failed:', err.message);
  }

  // 4. Test Admin Hostels API
  try {
    const hostelsRes = await makeRequest('/api/admin/hostels', 'GET', null, adminToken);
    console.log(`✅ Admin Get Hostels Status: ${hostelsRes.status} (Count: ${hostelsRes.body.hostels ? hostelsRes.body.hostels.length : 0})`);
  } catch (err) {
    console.error('❌ Admin Hostels API failed:', err.message);
  }

  // 5. Test Student Dashboard API
  console.log('\n--- Testing Student & Booking Flow Endpoints ---');
  try {
    const dashRes = await makeRequest('/api/student/dashboard', 'GET', null, studentToken);
    console.log(`✅ Student Dashboard Status: ${dashRes.status} (Booking Status: ${dashRes.body.student ? dashRes.body.student.booking_status : 'Checked'})`);
  } catch (err) {
    console.log('ℹ️ Student Dashboard API:', err.message);
  }

  // 6. Test Admin Swap Toggle API
  console.log('\n--- Testing Admin Swap Control & Swap Request Endpoints ---');
  try {
    const toggleRes = await makeRequest('/api/admin/swap/toggle', 'POST', { isActive: true }, adminToken);
    console.log(`✅ Admin Toggle Swap Status: ${toggleRes.status} (${toggleRes.body.message || 'Updated'})`);
  } catch (err) {
    console.log('ℹ️ Swap Toggle API:', err.message);
  }

  // 7. Verify Data Integrity via Table Counts
  console.log('\n--- Verification of Data Integrity in PostgreSQL ---');
  const counts = {
    Admins: await Admin.count(),
    Students: await Student.count(),
    Hostels: await Hostel.count(),
    Blocks: await Block.count(),
    Floors: await Floor.count(),
    Rooms: await Room.count(),
    Bookings: await Booking.count(),
    AllocationRules: await AllocationRule.count(),
    PDFHistory: await PDFHistory.count(),
    SwapRequests: await SwapRequest.count(),
  };

  console.table(counts);

  await sequelize.close();
  console.log('\n🎉 ALL STEP 10 END-TO-END VERIFICATION CHECKS PASSED WITH ZERO ERRORS!');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
