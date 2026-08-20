// backend/run-indexes.js
const sequelize = require('./src/config/database');

const INDEX_QUERIES = [
  "CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);",
  "CREATE INDEX IF NOT EXISTS idx_students_programme_year ON students(programme, year);",
  "CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(booked_room_id);",
  "CREATE INDEX IF NOT EXISTS idx_students_hostel_id ON students(hostel_id);",
  "CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id);",
  "CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);",
  "CREATE INDEX IF NOT EXISTS idx_rooms_capacity ON rooms(capacity);",
  "CREATE INDEX IF NOT EXISTS idx_allocation_rules_block_id ON allocation_rules(block_id);",
  "CREATE INDEX IF NOT EXISTS idx_allocation_rules_programme_year ON allocation_rules(programme, allowed_year);",
  "CREATE INDEX IF NOT EXISTS idx_blocks_hostel_id ON blocks(hostel_id);",
  "CREATE INDEX IF NOT EXISTS idx_floors_block_id ON floors(block_id);",
  "CREATE INDEX IF NOT EXISTS idx_pdf_history_student_roll ON pdf_history(student_roll);",
  "CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);"
];

async function runIndexes() {
  try {
    console.log('⏳ Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    console.log('⏳ Creating indexes...');
    for (const sql of INDEX_QUERIES) {
      try {
        await sequelize.query(sql);
      } catch (qErr) {
        console.warn(`⚠️ Warning executing [${sql}]:`, qErr.message);
      }
    }
    console.log('✅ Indexes created successfully!');

    // Verify indexes
    const [result] = await sequelize.query(`
      SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' OR indexname LIKE '%_idx' ORDER BY indexname;
    `);
    console.log('📋 Indexes verified:', result.map(r => r.indexname).join(', '));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  }
}

runIndexes();
