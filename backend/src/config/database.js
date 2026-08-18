const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://hostel_user:Hostel@123@localhost:5432/hostel_booking';

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,              // Maximum number of connections
    min: 0,               // Minimum number of connections
    acquire: 30000,       // Maximum time (ms) to wait for a connection
    idle: 10000,          // Time (ms) before a connection is released
  },
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
  },
  define: {
    timestamps: false,
    underscored: true
  }
});

async function syncDatabaseSchema() {
  try {
    const dialect = sequelize.getDialect();
    await sequelize.sync();

    if (dialect === 'postgres') {
      await sequelize.query("ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS old_pdf_paths JSONB DEFAULT '{}';");
      await sequelize.query("ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS new_pdf_paths JSONB DEFAULT '{}';");
      await sequelize.query("ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS movers JSONB DEFAULT '{}';");
      console.log('[Database Schema Sync] Verified postgres swap_requests columns.');
    }
  } catch (err) {
    console.warn('[Database Schema Sync Warning]:', err.message);
  }
}

async function initDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Database connection (${sequelize.getDialect()}) established successfully.`);
    await syncDatabaseSchema();
  } catch (err) {
    console.error('[Database Error] Failed to connect to database:', err.message);
    throw err;
  }
  return sequelize;
}

module.exports = sequelize;
module.exports.initDatabaseConnection = initDatabaseConnection;
module.exports.syncDatabaseSchema = syncDatabaseSchema;
