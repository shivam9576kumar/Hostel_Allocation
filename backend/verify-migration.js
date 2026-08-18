// verify-migration.js
const { sequelize, Student, Hostel, Block, Floor, Room, Booking, AllocationRule, SwapRequest, PDFHistory, Admin } = require('./src/models');

async function verify() {
  try {
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
    console.log('📊 Data counts in PostgreSQL:');
    console.table(counts);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}
verify();
