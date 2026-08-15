const sequelize = require('../src/config/database');
const { Room, Student, Booking, Hostel, Block, Floor, AllocationRule } = require('../src/models');
const { bookRoom, pairByCode } = require('../src/controllers/bookingController');

async function runTests() {
  console.log('🚀 Starting Capacity 3 Room Pairing Integration Test Suite...\n');
  await sequelize.authenticate();

  let transaction = await sequelize.transaction();

  try {
    // 1. Create Test Hostel, Block, Floor, and 3-Capacity Room
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const hostel = await Hostel.create({
      name: 'Test Triple Hostel',
      allowed_gender: 'Female',
      allowed_programme: 'B.Tech',
      allowed_year: 2,
      start_time: startTime,
      end_time: endTime
    }, { transaction });

    const block = await Block.create({
      hostel_id: hostel.hostel_id,
      name: 'Block T',
      is_reserved: false
    }, { transaction });

    const floor = await Floor.create({
      block_id: block.block_id,
      floor_number: 1,
      is_reserved: false
    }, { transaction });

    const room3 = await Room.create({
      floor_id: floor.floor_id,
      room_number: '301',
      capacity: 3,
      current_occupancy: 0,
      status: 'Vacant',
      is_reserved: false
    }, { transaction });

    // Allocation Rule
    await AllocationRule.create({
      hostel_id: hostel.hostel_id,
      block_id: block.block_id,
      floor_start: 1,
      floor_end: 1,
      programme: 'B.Tech',
      allowed_year: 2
    }, { transaction });

    // 3 Test Students
    const s1 = await Student.create({
      roll_number: 'TRIPLE_01',
      full_name: 'Student One',
      email: 'triple01@test.iit.ac.in',
      gender: 'Female',
      programme: 'B.Tech',
      year: 2,
      booking_status: 'Pending'
    }, { transaction });

    const s2 = await Student.create({
      roll_number: 'TRIPLE_02',
      full_name: 'Student Two',
      email: 'triple02@test.iit.ac.in',
      gender: 'Female',
      programme: 'B.Tech',
      year: 2,
      booking_status: 'Pending'
    }, { transaction });

    const s3 = await Student.create({
      roll_number: 'TRIPLE_03',
      full_name: 'Student Three',
      email: 'triple03@test.iit.ac.in',
      gender: 'Female',
      programme: 'B.Tech',
      year: 2,
      booking_status: 'Pending'
    }, { transaction });

    await transaction.commit();
    console.log('✅ Test setup created successfully (Room 301, capacity = 3).');

    // 🧪 STEP 1: Student 1 books Room 301
    console.log('\n🧪 STEP 1: Student 1 (TRIPLE_01) books Room 301...');
    const req1 = { params: { roomId: room3.room_id }, student: s1 };
    const res1 = {
      statusCode: 200,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await bookRoom(req1, res1);

    console.log('Step 1 Response:', res1.jsonData.message);
    const pairingCode = res1.jsonData.pairingCode;
    console.log('Generated Pairing Code:', pairingCode);

    const roomAfterStep1 = await Room.findByPk(room3.room_id);
    console.log(`Room State: status = ${roomAfterStep1.status}, current_occupancy = ${roomAfterStep1.current_occupancy}/3`);
    if (roomAfterStep1.status !== 'Pending_Pairing' || roomAfterStep1.current_occupancy !== 1) {
      throw new Error(`Step 1 Failed: Expected status Pending_Pairing, occupancy 1. Got ${roomAfterStep1.status}, ${roomAfterStep1.current_occupancy}`);
    }
    console.log('✅ Step 1 Passed: Room is Pending_Pairing (1/3).');

    // 🧪 STEP 2: Student 2 enters pairing code
    console.log('\n🧪 STEP 2: Student 2 (TRIPLE_02) enters pairing code...');
    const req2 = { body: { code: pairingCode }, student: s2 };
    const res2 = {
      statusCode: 200,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await pairByCode(req2, res2);

    console.log('Step 2 Response:', res2.jsonData.message);
    const roomAfterStep2 = await Room.findByPk(room3.room_id);
    console.log(`Room State: status = ${roomAfterStep2.status}, current_occupancy = ${roomAfterStep2.current_occupancy}/3, pairing_code = ${roomAfterStep2.pairing_code}`);
    
    if (roomAfterStep2.status !== 'Pending_Pairing' || roomAfterStep2.current_occupancy !== 2 || !roomAfterStep2.pairing_code) {
      throw new Error(`Step 2 Failed: Expected room to remain Pending_Pairing at 2/3 with active code. Got ${roomAfterStep2.status}, ${roomAfterStep2.current_occupancy}`);
    }
    console.log('✅ Step 2 Passed: Room remains Pending_Pairing (2/3) and code stays active.');

    // 🧪 STEP 3: Student 3 enters same pairing code
    console.log('\n🧪 STEP 3: Student 3 (TRIPLE_03) enters pairing code...');
    const req3 = { body: { code: pairingCode }, student: s3 };
    const res3 = {
      statusCode: 200,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    await pairByCode(req3, res3);

    console.log('Step 3 Response:', res3.jsonData.message);
    const roomAfterStep3 = await Room.findByPk(room3.room_id);
    console.log(`Room State: status = ${roomAfterStep3.status}, current_occupancy = ${roomAfterStep3.current_occupancy}/3, pairing_code = ${roomAfterStep3.pairing_code}`);

    if (roomAfterStep3.status !== 'Locked' || roomAfterStep3.current_occupancy !== 3 || roomAfterStep3.pairing_code !== null) {
      throw new Error(`Step 3 Failed: Expected room status Locked at 3/3 with pairing_code null. Got ${roomAfterStep3.status}, ${roomAfterStep3.current_occupancy}`);
    }

    const studentsFinal = await Student.findAll({ where: { booked_room_id: room3.room_id } });
    const allLocked = studentsFinal.every(s => s.booking_status === 'Locked');
    if (studentsFinal.length !== 3 || !allLocked) {
      throw new Error(`Step 3 Failed: Expected 3 Locked students. Got ${studentsFinal.length} students.`);
    }

    console.log('✅ Step 3 Passed: Room is Locked (3/3), code cleared, all 3 students marked Locked.');

    // Cleanup Test Data
    console.log('\n🧹 Cleaning up test records...');
    const cleanTx = await sequelize.transaction();
    await Booking.destroy({ where: { room_id: room3.room_id }, transaction: cleanTx });
    await Student.destroy({ where: { roll_number: ['TRIPLE_01', 'TRIPLE_02', 'TRIPLE_03'] }, transaction: cleanTx });
    await Room.destroy({ where: { room_id: room3.room_id }, transaction: cleanTx });
    await AllocationRule.destroy({ where: { hostel_id: hostel.hostel_id }, transaction: cleanTx });
    await Floor.destroy({ where: { floor_id: floor.floor_id }, transaction: cleanTx });
    await Block.destroy({ where: { block_id: block.block_id }, transaction: cleanTx });
    await Hostel.destroy({ where: { hostel_id: hostel.hostel_id }, transaction: cleanTx });
    await cleanTx.commit();

    console.log('🎉 ALL CAPACITY 3 PAIRING TESTS PASSED PERFECTLY!');
    process.exit(0);

  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

runTests();
