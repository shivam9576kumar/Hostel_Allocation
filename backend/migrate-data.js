// migrate-data.js
// Migration script from SQLite to PostgreSQL

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sqlitePath = path.join(__dirname, 'hostel_booking.sqlite');
console.log('🔄 Connecting to SQLite source database at:', sqlitePath);

// 1. Source Connection (SQLite)
const sqliteSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: sqlitePath,
  logging: false,
});

// 2. Import Models connected to default target (PostgreSQL)
const models = require('./src/models');
const { 
  sequelize: pgSequelize,
  Admin, Student, Hostel, Block, Floor, Room, 
  Booking, AllocationRule, PDFHistory, SwapRequest, GlobalSetting 
} = models;

// Helper function to query SQLite raw table rows
async function fetchSQLiteData(tableName) {
  try {
    const [results] = await sqliteSequelize.query(`SELECT * FROM ${tableName};`);
    return results;
  } catch (err) {
    if (err.message.includes('no such table')) {
      console.log(`   ⚠️ Table ${tableName} does not exist in SQLite database. Skipping.`);
      return [];
    }
    throw err;
  }
}

// Clean and parse row objects for PostgreSQL
function sanitizeRow(tableName, row) {
  const clean = { ...row };

  // Convert boolean 0/1 integers from SQLite to JS booleans for PostgreSQL
  ['is_reserved', 'is_primary', 'is_swap', 'is_current'].forEach(boolCol => {
    if (clean[boolCol] !== undefined && clean[boolCol] !== null) {
      clean[boolCol] = Boolean(clean[boolCol]);
    }
  });

  // Handle JSON columns in swap_requests
  if (tableName === 'swap_requests') {
    ['consents', 'movers', 'old_pdf_paths', 'new_pdf_paths'].forEach(jsonCol => {
      if (typeof clean[jsonCol] === 'string') {
        try {
          clean[jsonCol] = JSON.parse(clean[jsonCol]);
        } catch (e) {
          clean[jsonCol] = {};
        }
      }
    });
  }

  return clean;
}

async function migrate() {
  try {
    console.log('🔄 Starting data migration from SQLite to PostgreSQL...');

    await sqliteSequelize.authenticate();
    console.log('✅ Connected to SQLite source database.');

    await pgSequelize.authenticate();
    console.log('✅ Connected to PostgreSQL target database.');

    // Step A: Ensure all PostgreSQL tables exist with sync
    console.log('🛠️ Synchronizing PostgreSQL schema...');
    await pgSequelize.sync({ force: true });
    console.log('✅ PostgreSQL tables created / reset.');

    const tableMapping = [
      { name: 'admins', model: Admin },
      { name: 'hostels', model: Hostel },
      { name: 'blocks', model: Block },
      { name: 'floors', model: Floor },
      { name: 'rooms', model: Room },
      { name: 'allocation_rules', model: AllocationRule },
      { name: 'students', model: Student },
      { name: 'bookings', model: Booking },
      { name: 'pdf_history', model: PDFHistory },
      { name: 'swap_requests', model: SwapRequest },
      { name: 'global_settings', model: GlobalSetting },
    ];

    for (const { name: tableName, model } of tableMapping) {
      console.log(`📦 Migrating table: ${tableName}...`);
      const rawRows = await fetchSQLiteData(tableName);
      if (rawRows.length === 0) {
        console.log(`   ℹ️ No records found in ${tableName}.`);
        continue;
      }

      const sanitizedRows = rawRows.map(row => sanitizeRow(tableName, row));

      await model.bulkCreate(sanitizedRows, {
        ignoreDuplicates: true,
        validate: false
      });

      console.log(`   ✅ Successfully migrated ${sanitizedRows.length} records into ${tableName}.`);

      // Reset auto-increment sequence in PostgreSQL if primary key is integer
      try {
        const pkAttr = Object.keys(model.primaryKeys)[0];
        if (pkAttr && model.rawAttributes[pkAttr].type.key === 'INTEGER') {
          const maxRes = await pgSequelize.query(`SELECT MAX("${pkAttr}") as max_id FROM "${tableName}";`);
          const maxId = maxRes[0][0].max_id;
          if (maxId) {
            const seqName = `${tableName}_${pkAttr}_seq`;
            await pgSequelize.query(`SELECT setval('${seqName}', ${maxId});`).catch(() => {});
          }
        }
      } catch (seqErr) {
        // Ignore sequence reset if non-serial
      }
    }

    console.log('\n🎉 ALL DATA MIGRATED SUCCESSFULLY FROM SQLITE TO POSTGRESQL!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqliteSequelize.close();
    await pgSequelize.close();
  }
}

migrate();
