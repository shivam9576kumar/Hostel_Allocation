// verify-step6-swap-flag.js
// Verification of swap:active flag in Upstash Redis

const jwt = require('jsonwebtoken');
const http = require('http');
const redisClient = require('./src/config/redis');
const { setSwapActive, isSwapActive } = require('./src/config/redis');
const env = require('./src/config/env');

function makeRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', err => reject(err));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function testSwapActiveFlag() {
  console.log('🧪 Starting Verification of swap:active Flag in Upstash Redis...\n');

  try {
    // Generate valid admin token
    const adminToken = jwt.sign({ username: 'baboo.boss', role: 'Super Admin', type: 'admin' }, env.jwtSecret);
    const studentToken = jwt.sign({ roll_number: '2026CS101', email: '2026cs101@iit.ac.in', type: 'student' }, env.jwtSecret);

    // 1. Toggle to true via Admin API
    console.log('1. Toggling Swap Activity to true via Admin API (POST /api/admin/swap/toggle)...');
    const resTrue = await makeRequest('/api/admin/swap/toggle', 'POST', { isActive: true }, adminToken);
    console.log(`   - API Response Status: ${resTrue.status}`);
    console.log(`   - API Body:`, resTrue.body);

    if (resTrue.status !== 200 || resTrue.body.swapActive !== true) {
      throw new Error(`Toggle to true failed! Expected status 200 & swapActive true, got status ${resTrue.status}`);
    }

    // 2. Inspect Redis Key swap:active
    const redisValTrue = await redisClient.get('swap:active');
    console.log(`   - Upstash Redis Key "swap:active" Value: "${redisValTrue}" (Expected: "true")`);

    if (redisValTrue !== 'true') {
      throw new Error(`Upstash Redis value mismatch! Expected "true", got "${redisValTrue}"`);
    }

    // 3. Toggle to false via Admin API
    console.log('\n2. Toggling Swap Activity to false via Admin API (POST /api/admin/swap/toggle)...');
    const resFalse = await makeRequest('/api/admin/swap/toggle', 'POST', { isActive: false }, adminToken);
    console.log(`   - API Response Status: ${resFalse.status}`);
    console.log(`   - API Body:`, resFalse.body);

    if (resFalse.status !== 200 || resFalse.body.swapActive !== false) {
      throw new Error(`Toggle to false failed! Expected status 200 & swapActive false, got status ${resFalse.status}`);
    }

    // 4. Inspect Redis Key swap:active
    const redisValFalse = await redisClient.get('swap:active');
    console.log(`   - Upstash Redis Key "swap:active" Value: "${redisValFalse}" (Expected: "false")`);

    if (redisValFalse !== 'false') {
      throw new Error(`Upstash Redis value mismatch! Expected "false", got "${redisValFalse}"`);
    }

    // 5. Test Student API
    console.log('\n3. Testing Student API (GET /api/student/swap/active)...');
    const studentRes = await makeRequest('/api/student/swap/active', 'GET', null, studentToken);
    console.log(`   - Student API Status: ${studentRes.status}`);
    console.log(`   - Student API Body:`, studentRes.body);

    console.log('\n🎉 ALL STEP 6 SWAP ACTIVE FLAG CHECKS PASSED SUCCESSFULLY WITH ZERO ERRORS!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

testSwapActiveFlag();
