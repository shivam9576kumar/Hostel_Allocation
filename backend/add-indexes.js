// add-indexes.js
// Migration script to add high-performance database indexes to PostgreSQL

const sequelize = require('./src/config/database');

const indexesToAdd = [
  // 1. Room Table Indexes
  { table: 'rooms', columns: ['status'], name: 'rooms_status_idx' },
  { table: 'rooms', columns: ['floor_id'], name: 'rooms_floor_id_idx' },
  { table: 'rooms', columns: ['is_reserved'], name: 'rooms_is_reserved_idx' },
  { table: 'rooms', columns: ['pairing_code'], name: 'rooms_pairing_code_idx' },
  { table: 'rooms', columns: ['status', 'is_reserved'], name: 'rooms_status_reserved_idx' },

  // 2. Student Table Indexes
  { table: 'students', columns: ['booked_room_id'], name: 'students_booked_room_id_idx' },
  { table: 'students', columns: ['booking_status'], name: 'students_booking_status_idx' },
  { table: 'students', columns: ['roll_number'], name: 'students_roll_number_idx' },
  { table: 'students', columns: ['gender', 'programme', 'year'], name: 'students_gender_prog_year_idx' },

  // 3. Booking Table Indexes
  { table: 'bookings', columns: ['room_id'], name: 'bookings_room_id_idx' },
  { table: 'bookings', columns: ['student_roll'], name: 'bookings_student_roll_idx' },
  { table: 'bookings', columns: ['is_primary'], name: 'bookings_is_primary_idx' },

  // 4. Allocation Rules Table Indexes
  { table: 'allocation_rules', columns: ['block_id'], name: 'allocation_rules_block_id_idx' },
  { table: 'allocation_rules', columns: ['hostel_id'], name: 'allocation_rules_hostel_id_idx' },
  { table: 'allocation_rules', columns: ['programme', 'allowed_year'], name: 'allocation_rules_prog_year_idx' },

  // 5. Floors Table Indexes
  { table: 'floors', columns: ['block_id'], name: 'floors_block_id_idx' },

  // 6. Swap Requests Table Indexes
  { table: 'swap_requests', columns: ['status'], name: 'swap_requests_status_idx' },
  { table: 'swap_requests', columns: ['source_room_id'], name: 'swap_requests_source_idx' },
  { table: 'swap_requests', columns: ['target_room_id'], name: 'swap_requests_target_idx' },

  // 7. PDF History Table Indexes
  { table: 'pdf_history', columns: ['student_roll'], name: 'pdf_history_student_roll_idx' },
  { table: 'pdf_history', columns: ['is_current'], name: 'pdf_history_is_current_idx' },

  // 8. Blocks Table Indexes
  { table: 'blocks', columns: ['hostel_id'], name: 'blocks_hostel_id_idx' },
];

async function applyIndexes() {
  const queryInterface = sequelize.getQueryInterface();
  console.log('📊 Adding PostgreSQL database indexes for performance...\n');

  let successCount = 0;
  for (const idx of indexesToAdd) {
    try {
      await queryInterface.addIndex(idx.table, idx.columns, { name: idx.name });
      console.log(`✅ Added index "${idx.name}" on table "${idx.table}" (${idx.columns.join(', ')});`);
      successCount++;
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`ℹ️ Index "${idx.name}" already exists on table "${idx.table}".`);
        successCount++;
      } else {
        console.error(`❌ Failed to add index "${idx.name}":`, err.message);
      }
    }
  }

  console.log(`\n🎉 Applied ${successCount} database indexes successfully!`);

  // Verify indexes in PostgreSQL pg_indexes view
  console.log('\n🔍 Verifying created indexes in PostgreSQL (pg_indexes)...');
  const [results] = await sequelize.query(`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE '%_idx'
    ORDER BY tablename, indexname;
  `);

  console.table(results);
  await sequelize.close();
}

applyIndexes().catch(err => {
  console.error('❌ Error applying indexes:', err);
  process.exit(1);
});
