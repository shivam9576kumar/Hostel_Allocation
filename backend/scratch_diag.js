
const { sequelize, Hostel, Block, Floor, Room, AllocationRule } = require('./src/models');

async function main() {
  await sequelize.authenticate();

  console.log('=== 1. CHECK BACKEND HEALTH ===');
  try {
    const res = await fetch('http://localhost:5000/health');
    const data = await res.json();
    console.log('STATUS:', res.status, data);
  } catch(e) {
    console.log('Health error:', e.message);
  }

  const sampleFloor = await Floor.findOne({ include: [Block] });
  const floorId = sampleFloor ? sampleFloor.floor_id : 1;

  console.log('\n=== 2. CHECK ROOMS API DIRECTLY (Floor ID: ' + floorId + ') ===');
  try {
    const res = await fetch('http://localhost:5000/api/student/floors/' + floorId + '/rooms');
    const data = await res.json();
    console.log('Rooms API Output:', JSON.stringify(data, null, 2));
  } catch(e) {
    console.log('Rooms API Error:', e.message);
  }

  console.log('\n=== 3. CHECK ROOMS IN DATABASE (Floor ID: ' + floorId + ') ===');
  const rooms = await Room.findAll({
    where: { floor_id: floorId },
    attributes: ['room_id', 'room_number', 'status', 'capacity', 'current_occupancy', 'is_reserved'],
    raw: true
  });
  console.table(rooms);

  console.log('\n=== 4. CHECK HOSTELS & ALLOCATION RULES ===');
  console.log('HOSTELS:');
  console.table(await Hostel.findAll({ raw: true }));
  console.log('RULES:');
  console.table(await AllocationRule.findAll({ raw: true }));

  console.log('\n=== 5. CHECK ROOMS MATCHING CAPACITY RULE ===');
  console.table(await Room.findAll({
    where: { is_reserved: false },
    attributes: ['room_id', 'room_number', 'capacity', 'status', 'floor_id'],
    limit: 10,
    raw: true
  }));

  process.exit(0);
}

main().catch(console.error);
