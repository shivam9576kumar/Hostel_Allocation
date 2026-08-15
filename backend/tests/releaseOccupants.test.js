const assert = require('assert');
const {
  sequelize,
  Hostel,
  Block,
  Floor,
  Room,
  Student,
  Booking,
  PDFHistory
} = require('../src/models');
const { releaseOccupants } = require('../src/controllers/adminController');
const { initDatabaseConnection } = require('../src/config/database');

async function runTests() {
  console.log('🚀 Starting Admin "Manage Occupants" / Release Occupants Test Suite...\n');
  await initDatabaseConnection();

  const now = new Date();
  const testHostel = await Hostel.create({
    name: 'Admin Release Test Hostel',
    allowed_gender: 'Male',
    start_time: new Date(now.getTime() - 86400000),
    end_time: new Date(now.getTime() + 86400000)
  });

  const testBlock = await Block.create({
    hostel_id: testHostel.hostel_id,
    name: 'Block R',
    is_reserved: false
  });

  const testFloor = await Floor.create({
    block_id: testBlock.block_id,
    floor_number: 5,
    is_reserved: false
  });

  // Create a 3-seater room (Room 501) with 3 occupants
  const room501 = await Room.create({
    floor_id: testFloor.floor_id,
    room_number: '501',
    capacity: 3,
    current_occupancy: 3,
    status: 'Locked'
  });

  const createTestStudent = async (roll, name, roomId) => {
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

    await PDFHistory.create({
      student_roll: roll,
      room_id: roomId,
      pdf_path: `dummy/path/${roll}.pdf`,
      version: 1,
      is_current: true
    });

    return s;
  };

  const s1 = await createTestStudent('REL_TEST_01', 'Student One', room501.room_id);
  const s2 = await createTestStudent('REL_TEST_02', 'Student Two', room501.room_id);
  const s3 = await createTestStudent('REL_TEST_03', 'Student Three', room501.room_id);

  const mockReqRes = (params = {}, body = {}) => {
    const req = { params, body };
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
    // TEST 1: Release 1 Student (Student One)
    // -------------------------------------------------------------
    console.log('🧪 TEST 1: Testing release of 1 student (Student One)...');
    const { req: req1, res: res1 } = mockReqRes(
      { roomId: room501.room_id },
      { studentRolls: ['REL_TEST_01'], clearAll: false }
    );
    await releaseOccupants(req1, res1);

    assert.strictEqual(res1.statusCode, 200, 'Release should return 200');
    assert.strictEqual(res1.jsonData.currentOccupancy, 2, 'Occupancy should now be 2');

    // Verify Student 1 is reset
    const updatedS1 = await Student.findByPk('REL_TEST_01');
    assert.strictEqual(updatedS1.booking_status, 'Pending', 'Released student status should be Pending');
    assert.strictEqual(updatedS1.booked_room_id, null, 'Released student booked_room_id should be null');

    // Verify Booking is deleted
    const b1 = await Booking.findOne({ where: { student_roll: 'REL_TEST_01' } });
    assert.strictEqual(b1, null, 'Booking record for released student should be deleted');

    // Verify PDF is invalidated
    const pdf1 = await PDFHistory.findOne({ where: { student_roll: 'REL_TEST_01' } });
    assert.strictEqual(pdf1.is_current, false, 'Old PDF is_current should be false');

    // Verify Room state
    const updatedRoom501 = await Room.findByPk(room501.room_id);
    assert.strictEqual(updatedRoom501.current_occupancy, 2, 'Room current_occupancy should be 2');
    console.log('✅ TEST 1 Passed: Single student released, bookings removed, PDF invalidated, room occupancy updated.');

    // -------------------------------------------------------------
    // TEST 2: Clear Entire Room (Release remaining 2 students)
    // -------------------------------------------------------------
    console.log('\n🧪 TEST 2: Testing "Clear Entire Room" (clearAll = true)...');
    const { req: req2, res: res2 } = mockReqRes(
      { roomId: room501.room_id },
      { studentRolls: [], clearAll: true }
    );
    await releaseOccupants(req2, res2);

    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.jsonData.currentOccupancy, 0, 'Room occupancy should be 0');
    assert.strictEqual(res2.jsonData.roomStatus, 'Vacant', 'Room status should be Vacant');

    // Verify students 2 and 3 are reset
    const updatedS2 = await Student.findByPk('REL_TEST_02');
    const updatedS3 = await Student.findByPk('REL_TEST_03');
    assert.strictEqual(updatedS2.booking_status, 'Pending');
    assert.strictEqual(updatedS2.booked_room_id, null);
    assert.strictEqual(updatedS3.booking_status, 'Pending');
    assert.strictEqual(updatedS3.booked_room_id, null);

    // Verify room is Vacant
    const finalRoom501 = await Room.findByPk(room501.room_id);
    assert.strictEqual(finalRoom501.current_occupancy, 0);
    assert.strictEqual(finalRoom501.status, 'Vacant');
    console.log('✅ TEST 2 Passed: Room completely cleared, all occupants reset, room marked Vacant.');

    console.log('\n🎉 ALL RELEASE OCCUPANTS TESTS PASSED! (2/2)');

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test records...');
    const testRolls = ['REL_TEST_01', 'REL_TEST_02', 'REL_TEST_03'];
    await PDFHistory.destroy({ where: { student_roll: testRolls } });
    await Booking.destroy({ where: { student_roll: testRolls } });
    await Student.destroy({ where: { roll_number: testRolls } });
    await Room.destroy({ where: { room_id: room501.room_id } });
    await Floor.destroy({ where: { floor_id: testFloor.floor_id } });
    await Block.destroy({ where: { block_id: testBlock.block_id } });
    await Hostel.destroy({ where: { hostel_id: testHostel.hostel_id } });
    console.log('✅ Cleanup completed.');
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
