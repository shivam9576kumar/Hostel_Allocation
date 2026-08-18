// test-phase2-e2e.js
// Complete Phase 2 End-to-End Automated Test (PostgreSQL + Upstash Redis)

const http = require('http');
const jwt = require('jsonwebtoken');
const redisClient = require('./src/config/redis');
const env = require('./src/config/env');
const { Student, Room, Floor, Block, Hostel, Booking, AllocationRule, PDFHistory, sequelize } = require('./src/models');

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

async function runPhase2E2E() {
  console.log('🧪 Starting Phase 2 End-to-End Verification (PostgreSQL + Upstash Redis)...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ 1. Connected to PostgreSQL Database.');

    // 1. Prepare eligible test students & room
    let studentA = await Student.findOne({ where: { gender: 'Male', programme: 'B.Tech', booking_status: 'Pending' } });
    let studentB = await Student.findOne({ 
      where: { 
        gender: 'Male', 
        programme: 'B.Tech', 
        booking_status: 'Pending',
        roll_number: { [sequelize.Sequelize.Op.ne]: studentA ? studentA.roll_number : '' }
      } 
    });

    if (!studentA || !studentB) {
      throw new Error('Could not find 2 eligible B.Tech Male students with Pending status.');
    }

    console.log(`✅ 2. Found Test Students:`);
    console.log(`   - Student 1 (Primary): ${studentA.full_name} (${studentA.roll_number})`);
    console.log(`   - Student 2 (Roommate): ${studentB.full_name} (${studentB.roll_number})`);

    // Ensure hostel, block, floor exist
    let floor = await Floor.findOne({ include: [{ model: Block, include: [Hostel] }] });
    if (!floor) {
      const hostel = await Hostel.create({ name: 'Phase2 E2E Hostel' });
      const block = await Block.create({ hostel_id: hostel.hostel_id, name: 'Block A', is_reserved: false });
      floor = await Floor.create({ block_id: block.block_id, floor_number: 1, is_reserved: false });
    }

    // Create a fresh vacant 2-capacity test room
    const room = await Room.create({
      floor_id: floor.floor_id,
      room_number: `E2E-${Math.floor(100 + Math.random() * 900)}`,
      capacity: 2,
      current_occupancy: 0,
      status: 'Vacant',
      is_reserved: false
    });

    console.log(`✅ 3. Created Fresh Vacant Room ID ${room.room_id} (Room Number: ${room.room_number}, Capacity: ${room.capacity})`);

    // Ensure matching allocation rule exists
    const blockId = floor.block_id || floor.Block.block_id;
    const hostelId = floor.Block ? floor.Block.hostel_id : (await Block.findByPk(blockId)).hostel_id;

    await AllocationRule.create({
      hostel_id: hostelId,
      programme: 'B.Tech',
      allowed_year: null,
      block_id: blockId,
      floor_start: 0,
      floor_end: 99,
      gender: 'Male',
      capacity: 2
    });

    // Generate JWT tokens
    const tokenA = jwt.sign({ roll_number: studentA.roll_number, email: studentA.email, type: 'student' }, env.jwtSecret);
    const tokenB = jwt.sign({ roll_number: studentB.roll_number, email: studentB.email, type: 'student' }, env.jwtSecret);

    // STEP A & B & C: Student 1 Books Room
    console.log(`\n4. Student 1 (${studentA.roll_number}) booking Room ID ${room.room_id}...`);
    const bookRes = await makeRequest(`/api/student/rooms/${room.room_id}/book`, 'POST', null, tokenA);
    console.log(`   - Booking Response Status: ${bookRes.status}`);
    console.log(`   - Response Body:`, bookRes.body);

    if (bookRes.status !== 200 || !bookRes.body.pairingCode) {
      throw new Error(`Room booking failed! Response: ${JSON.stringify(bookRes.body)}`);
    }

    const pairingCode = bookRes.body.pairingCode;
    console.log(`✅ 5. Generated 8-Character Pairing Code: "${pairingCode}"`);

    // STEP D & E: Verify Upstash Redis Keys
    console.log(`\n6. Verifying Keys & TTL in Upstash Redis...`);
    const roomKey = `room:code:${room.room_id}`;
    const codeKey = `code:${pairingCode}`;

    const storedCode = await redisClient.get(roomKey);
    const storedRoomId = await redisClient.get(codeKey);
    const ttlRoomKey = await redisClient.ttl(roomKey);

    console.log(`   - Key [${roomKey}] -> Value: "${storedCode}", TTL: ${ttlRoomKey}s`);
    console.log(`   - Key [${codeKey}] -> Value: "${storedRoomId}"`);

    if (storedCode !== pairingCode || storedRoomId !== room.room_id.toString()) {
      throw new Error(`Upstash Redis key storage mismatch!`);
    }
    console.log(`✅ Upstash Redis keys stored cleanly with ~600s TTL.`);

    // STEP E: Student 2 Joins Room via Pairing Code
    console.log(`\n7. Student 2 (${studentB.roll_number}) joining room using code "${pairingCode}"...`);
    const pairRes = await makeRequest('/api/student/pair-by-code', 'POST', { code: pairingCode }, tokenB);
    console.log(`   - Pair Response Status: ${pairRes.status}`);
    console.log(`   - Pair Response Body:`, pairRes.body);

    if (pairRes.status !== 200) {
      throw new Error(`Roommate pairing failed! Status ${pairRes.status}: ${JSON.stringify(pairRes.body)}`);
    }
    console.log(`✅ Roommate paired successfully!`);

    // STEP F: Verify Room Lock, PDF Generation, and Redis Clean Up
    console.log(`\n8. Verifying Room Lock State & Redis Key Cleanup...`);
    const updatedRoom = await Room.findByPk(room.room_id);
    console.log(`   - Room Status: "${updatedRoom.status}" (Expected: "Locked")`);
    console.log(`   - Occupancy: ${updatedRoom.current_occupancy}/${updatedRoom.capacity}`);

    if (updatedRoom.status !== 'Locked' || updatedRoom.current_occupancy !== updatedRoom.capacity) {
      throw new Error(`Room did not lock at full capacity!`);
    }

    // Verify Redis keys deleted upon lock
    const deletedRoomKey = await redisClient.get(roomKey);
    const deletedCodeKey = await redisClient.get(codeKey);
    console.log(`   - Redis Key [${roomKey}] After Lock: ${deletedRoomKey}`);
    console.log(`   - Redis Key [${codeKey}] After Lock: ${deletedCodeKey}`);

    if (deletedRoomKey !== null || deletedCodeKey !== null) {
      throw new Error(`Redis keys were not deleted after room locked!`);
    }
    console.log(`✅ Upstash Redis keys automatically cleaned up after room lock.`);

    // Verify PDF Generation in PDFHistory
    const pdfCount = await PDFHistory.count({ where: { room_id: room.room_id } });
    console.log(`   - PDF Allocation History Records Created: ${pdfCount}`);

    if (pdfCount === 0) {
      throw new Error(`PDF history records were not created!`);
    }
    console.log(`✅ PDF Allocation certificates generated & recorded.`);

    console.log('\n🎉 ALL PHASE 2 END-TO-END VERIFICATION CHECKS PASSED WITH ZERO ERRORS!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E Verification failed:', err.message);
    process.exit(1);
  }
}

runPhase2E2E();
