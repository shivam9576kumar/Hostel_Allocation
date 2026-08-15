const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  sequelize,
  Hostel,
  Block,
  Floor,
  Room,
  Student,
  Booking,
  SwapRequest,
  PDFHistory
} = require('../src/models');
const { Op } = require('sequelize');
const {
  getEligibleRooms,
  createRequest,
  giveConsent
} = require('../src/controllers/swapController');
const { initDatabaseConnection } = require('../src/config/database');

async function runTests() {
  console.log('🚀 Starting Variable Room Capacity & Multi-Type Swap Test Suite...\n');
  await initDatabaseConnection();

  // Setup Clean Test Environment in a transaction or dedicated test records
  const now = new Date();
  const testHostel = await Hostel.create({
    name: 'Test Himalaya Hostel',
    allowed_gender: 'Male',
    start_time: new Date(now.getTime() - 86400000),
    end_time: new Date(now.getTime() + 86400000)
  });

  const testBlock = await Block.create({
    hostel_id: testHostel.hostel_id,
    name: 'Block T',
    is_reserved: false
  });

  const testFloor = await Floor.create({
    block_id: testBlock.block_id,
    floor_number: 1,
    is_reserved: false
  });

  // Create two 3-seater rooms (Room 301 and Room 302)
  const room301 = await Room.create({
    floor_id: testFloor.floor_id,
    room_number: '301',
    capacity: 3,
    current_occupancy: 3,
    status: 'Occupied'
  });

  const room302 = await Room.create({
    floor_id: testFloor.floor_id,
    room_number: '302',
    capacity: 3,
    current_occupancy: 3,
    status: 'Occupied'
  });

  // Create two 2-seater rooms (Room 201 and Room 202)
  const room201 = await Room.create({
    floor_id: testFloor.floor_id,
    room_number: '201',
    capacity: 2,
    current_occupancy: 2,
    status: 'Occupied'
  });

  const room202 = await Room.create({
    floor_id: testFloor.floor_id,
    room_number: '202',
    capacity: 2,
    current_occupancy: 2,
    status: 'Occupied'
  });

  // Create 6 students for 3-seater rooms (A1, A2, A3 in 301; B1, B2, B3 in 302)
  const createStudent = async (roll, name, roomId) => {
    let s = await Student.findByPk(roll);
    if (s) {
      await s.update({ booked_room_id: roomId, booking_status: 'Locked' });
    } else {
      s = await Student.create({
        roll_number: roll,
        full_name: name,
        email: `${roll.toLowerCase()}@test.edu`,
        gender: 'Male',
        programme: 'B.Tech',
        year: 2026,
        booking_status: 'Locked',
        booked_room_id: roomId
      });
    }
    await Booking.create({
      room_id: roomId,
      student_roll: roll,
      is_primary: true
    });
    return s;
  };

  const sA1 = await createStudent('TEST_A1', 'Alice A1', room301.room_id);
  const sA2 = await createStudent('TEST_A2', 'Alex A2', room301.room_id);
  const sA3 = await createStudent('TEST_A3', 'Arthur A3', room301.room_id);

  const sB1 = await createStudent('TEST_B1', 'Bob B1', room302.room_id);
  const sB2 = await createStudent('TEST_B2', 'Ben B2', room302.room_id);
  const sB3 = await createStudent('TEST_B3', 'Brian B3', room302.room_id);

  // Create 4 students for 2-seater rooms (C1, C2 in 201; D1, D2 in 202)
  const sC1 = await createStudent('TEST_C1', 'Charlie C1', room201.room_id);
  const sC2 = await createStudent('TEST_C2', 'Chris C2', room201.room_id);

  const sD1 = await createStudent('TEST_D1', 'David D1', room202.room_id);
  const sD2 = await createStudent('TEST_D2', 'Dan D2', room202.room_id);

  // Helper mock request and response
  const mockReqRes = (student, body = {}, params = {}, query = {}) => {
    const req = { student, body, params, query };
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    return { req, res };
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Capacity Matching & Eligibility Filter
    // -------------------------------------------------------------
    console.log('🧪 TEST 1: Testing getEligibleRooms for 3-seater vs 2-seater...');
    const { req: req1, res: res1 } = mockReqRes(sA1);
    await getEligibleRooms(req1, res1);

    assert.strictEqual(res1.statusCode, 200, 'getEligibleRooms should return 200');
    assert(res1.jsonData.sourceRoom, 'Response should include sourceRoom info');
    assert.strictEqual(res1.jsonData.sourceRoom.capacity, 3, 'Source room capacity should be 3');
    assert.strictEqual(res1.jsonData.sourceRoom.occupants.length, 3, 'Source room should have 3 occupants');

    const eligibleFor301 = res1.jsonData.eligibleRooms;
    assert(eligibleFor301.some(r => r.room_id === room302.room_id), 'Room 302 (3-seater) should be eligible for Room 301');
    assert(!eligibleFor301.some(r => r.room_id === room201.room_id), 'Room 201 (2-seater) must NOT be eligible for Room 301 (capacity mismatch)');
    console.log('✅ TEST 1 Passed: Capacity matching and full-occupancy filters verified.');

    // -------------------------------------------------------------
    // TEST 2: Double Swap Rejection on 2-Seater Rooms
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 2: Testing Double Swap rejection on 2-seater room...');
    const { req: req2, res: res2 } = mockReqRes(sC1, {
      target_room_id: room202.room_id,
      swap_type: 'double',
      movers: { source_movers: ['TEST_C1', 'TEST_C2'], target_movers: ['TEST_D1', 'TEST_D2'] }
    });
    await createRequest(req2, res2);

    assert.strictEqual(res2.statusCode, 400, 'Double swap on 2-seater room must return 400');
    console.log('✅ TEST 2 Passed: Double swap on 2-seater correctly rejected.');

    // -------------------------------------------------------------
    // TEST 3: Double Swap (2↔2) on 3-Seater Rooms: Creation & Mover Consents
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 3: Testing Double Swap (2↔2) on 3-seater rooms...');
    // A1 initiates double swap: A1 + A2 (leaving A3 in 301) swap with B1 + B2 (leaving B3 in 302)
    const { req: req3, res: res3 } = mockReqRes(sA1, {
      target_room_id: room302.room_id,
      swap_type: 'double',
      movers: {
        source_movers: ['TEST_A1', 'TEST_A2'],
        target_movers: ['TEST_B1', 'TEST_B2']
      }
    });
    await createRequest(req3, res3);

    assert.strictEqual(res3.statusCode, 201, 'Double swap creation should succeed with 201');
    const swapReq = res3.jsonData.swapRequest;
    assert.strictEqual(swapReq.swap_type, 'double');

    const consents = typeof swapReq.consents === 'string' ? JSON.parse(swapReq.consents) : swapReq.consents;
    const consentKeys = Object.keys(consents);

    // Verify ONLY the 4 movers are in consents (A1, A2, B1, B2)
    assert.strictEqual(consentKeys.length, 4, 'Exactly 4 movers must be in consents');
    assert(consentKeys.includes('TEST_A1'), 'A1 should be in consents');
    assert(consentKeys.includes('TEST_A2'), 'A2 should be in consents');
    assert(consentKeys.includes('TEST_B1'), 'B1 should be in consents');
    assert(consentKeys.includes('TEST_B2'), 'B2 should be in consents');
    assert(!consentKeys.includes('TEST_A3'), 'Stayer A3 must NOT be in consents');
    assert(!consentKeys.includes('TEST_B3'), 'Stayer B3 must NOT be in consents');
    assert.strictEqual(consents['TEST_A1'], true, 'Initiator A1 should be auto-consented');
    assert.strictEqual(consents['TEST_A2'], false, 'A2 should be false');
    assert.strictEqual(consents['TEST_B1'], false, 'B1 should be false');
    assert.strictEqual(consents['TEST_B2'], false, 'B2 should be false');
    console.log('✅ TEST 3 Passed: Double swap created with exactly 4 mover consents (stayers excluded).');

    // -------------------------------------------------------------
    // TEST 4: Stayer Consent Rejection & Mover Consent Execution
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 4: Testing Stayer consent rejection and execution upon all mover consents...');
    // Stayer A3 tries to submit consent -> should be rejected with 403
    const { req: reqStayer, res: resStayer } = mockReqRes(sA3, { consent: true }, { id: swapReq.id });
    await giveConsent(reqStayer, resStayer);
    assert.strictEqual(resStayer.statusCode, 403, 'Stayer consent attempt should be rejected with 403');
    console.log('  - Stayer consent properly blocked (403).');

    // Movers give consent: A2, B1, B2
    const { req: reqA2, res: resA2 } = mockReqRes(sA2, { consent: true }, { id: swapReq.id });
    await giveConsent(reqA2, resA2);
    assert.strictEqual(resA2.statusCode, 200);

    const { req: reqB1, res: resB1 } = mockReqRes(sB1, { consent: true }, { id: swapReq.id });
    await giveConsent(reqB1, resB1);
    assert.strictEqual(resB1.statusCode, 200);

    // Final mover B2 gives consent -> Triggers automatic execution
    const { req: reqB2, res: resB2 } = mockReqRes(sB2, { consent: true }, { id: swapReq.id });
    await giveConsent(reqB2, resB2);
    assert.strictEqual(resB2.statusCode, 200);
    assert.strictEqual(resB2.jsonData.swapRequest.status, 'Executed', 'Status should be Executed');
    console.log('✅ TEST 4 Passed: All 4 movers consented and swap automatically executed.');

    // -------------------------------------------------------------
    // TEST 5: Verify Post-Swap Room Locations & PDF Generation for ALL 6 Occupants
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 5: Verifying room assignments and PDF histories for all 6 occupants...');
    const updatedA1 = await Student.findByPk('TEST_A1');
    const updatedA2 = await Student.findByPk('TEST_A2');
    const updatedA3 = await Student.findByPk('TEST_A3');
    const updatedB1 = await Student.findByPk('TEST_B1');
    const updatedB2 = await Student.findByPk('TEST_B2');
    const updatedB3 = await Student.findByPk('TEST_B3');

    // A1 and A2 moved to Room 302
    assert.strictEqual(updatedA1.booked_room_id, room302.room_id, 'A1 should now be in Room 302');
    assert.strictEqual(updatedA2.booked_room_id, room302.room_id, 'A2 should now be in Room 302');

    // B1 and B2 moved to Room 301
    assert.strictEqual(updatedB1.booked_room_id, room301.room_id, 'B1 should now be in Room 301');
    assert.strictEqual(updatedB2.booked_room_id, room301.room_id, 'B2 should now be in Room 301');

    // Stayers remain in original rooms: A3 in 301, B3 in 302
    assert.strictEqual(updatedA3.booked_room_id, room301.room_id, 'Stayer A3 should remain in Room 301');
    assert.strictEqual(updatedB3.booked_room_id, room302.room_id, 'Stayer B3 should remain in Room 302');

    // Check PDF history for ALL 6 occupants (both movers and stayers)
    const all6Rolls = ['TEST_A1', 'TEST_A2', 'TEST_A3', 'TEST_B1', 'TEST_B2', 'TEST_B3'];
    for (const roll of all6Rolls) {
      const pdf = await PDFHistory.findOne({
        where: { student_roll: roll, is_current: true }
      });
      assert(pdf, `Current PDF should exist for student ${roll}`);
      assert.strictEqual(pdf.is_swap, true, `PDF for ${roll} should be marked is_swap = true`);
      assert(fs.existsSync(pdf.pdf_path), `PDF file for ${roll} must exist on disk at ${pdf.pdf_path}`);
    }

    console.log('✅ TEST 5 Passed: All 6 occupants successfully verified with correct rooms and updated PDFs on disk.');

    // -------------------------------------------------------------
    // TEST 6: Single Swap (1↔1) on 2-Seater Rooms
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 6: Testing Single Swap (1↔1) on 2-seater rooms...');
    const { req: reqSingle, res: resSingle } = mockReqRes(sC1, {
      target_room_id: room202.room_id,
      swap_type: 'single',
      target_student_roll: 'TEST_D1'
    });
    await createRequest(reqSingle, resSingle);

    assert.strictEqual(resSingle.statusCode, 201);
    const singleSwapReq = resSingle.jsonData.swapRequest;

    const singleConsents = typeof singleSwapReq.consents === 'string' ? JSON.parse(singleSwapReq.consents) : singleSwapReq.consents;
    assert.strictEqual(Object.keys(singleConsents).length, 2, 'Single swap must have exactly 2 consents');
    assert(singleConsents['TEST_C1'] === true, 'C1 auto consented');
    assert(singleConsents['TEST_D1'] === false, 'D1 pending');

    // D1 consents
    const { req: reqD1, res: resD1 } = mockReqRes(sD1, { consent: true }, { id: singleSwapReq.id });
    await giveConsent(reqD1, resD1);
    assert.strictEqual(resD1.jsonData.swapRequest.status, 'Executed');

    // Check all 4 students in 201 and 202 got updated PDFs
    const all4Rolls = ['TEST_C1', 'TEST_C2', 'TEST_D1', 'TEST_D2'];
    for (const roll of all4Rolls) {
      const pdf = await PDFHistory.findOne({ where: { student_roll: roll, is_current: true } });
      assert(pdf, `PDF must exist for 2-seater occupant ${roll}`);
      assert(fs.existsSync(pdf.pdf_path), `PDF on disk for ${roll}`);
    }
    // -------------------------------------------------------------
    // TEST 7: Full Swap (3↔3) on 3-Seater Rooms
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 7: Testing Full Swap (3↔3) on 3-seater rooms...');
    // Currently in 301: B1, B2, A3. In 302: A1, A2, B3.
    // B1 initiates full swap with Room 302
    const { req: reqFull, res: resFull } = mockReqRes(sB1, {
      target_room_id: room302.room_id,
      swap_type: 'full'
    });
    await createRequest(reqFull, resFull);

    assert.strictEqual(resFull.statusCode, 201);
    const fullSwapReq = resFull.jsonData.swapRequest;
    const fullConsents = typeof fullSwapReq.consents === 'string' ? JSON.parse(fullSwapReq.consents) : fullSwapReq.consents;
    assert.strictEqual(Object.keys(fullConsents).length, 6, 'Full swap on 3-seater must require all 6 consents');
    assert.strictEqual(fullConsents['TEST_B1'], true, 'Initiator B1 auto consented');

    // Give remaining 5 consents
    for (const roll of ['TEST_B2', 'TEST_A3', 'TEST_A1', 'TEST_A2', 'TEST_B3']) {
      const studentObj = await Student.findByPk(roll);
      const { req: reqCons, res: resCons } = mockReqRes(studentObj, { consent: true }, { id: fullSwapReq.id });
      await giveConsent(reqCons, resCons);
    }

    const completedFullSwap = await SwapRequest.findByPk(fullSwapReq.id);
    assert.strictEqual(completedFullSwap.status, 'Executed', 'Full swap should be executed');
    console.log('✅ TEST 7 Passed: Full swap (3↔3) on 3-seater rooms executed with 6 consents and verified.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (7/7)');

  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test records...');
    const testRolls = [
      'TEST_A1', 'TEST_A2', 'TEST_A3', 'TEST_B1', 'TEST_B2', 'TEST_B3',
      'TEST_C1', 'TEST_C2', 'TEST_D1', 'TEST_D2'
    ];
    await PDFHistory.destroy({ where: { student_roll: testRolls } });
    await Booking.destroy({ where: { student_roll: testRolls } });
    await SwapRequest.destroy({
      where: {
        [Op.or]: [
          { initiator_roll: testRolls },
          { source_room_id: [room301.room_id, room302.room_id, room201.room_id, room202.room_id] },
          { target_room_id: [room301.room_id, room302.room_id, room201.room_id, room202.room_id] }
        ]
      }
    });
    await Student.destroy({ where: { roll_number: testRolls } });
    await Room.destroy({ where: { room_id: [room301.room_id, room302.room_id, room201.room_id, room202.room_id] } });
    await Floor.destroy({ where: { floor_id: testFloor.floor_id } });
    await Block.destroy({ where: { block_id: testBlock.block_id } });
    await Hostel.destroy({ where: { hostel_id: testHostel.hostel_id } });
    console.log('✅ Cleanup completed.');
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
