const { Sequelize } = require('sequelize');
const path = require('path');
const env = require('./env');

const dialect = process.env.DB_DIALECT || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? 'postgres' : 'sqlite');

let sequelize;

if (dialect === 'postgres') {
  sequelize = new Sequelize(
    env.db.name,
    env.db.user,
    env.db.password,
    {
      host: env.db.host,
      port: env.db.port,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 15,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: false,
        underscored: true
      }
    }
  );
} else {
  const dbPath = path.join(__dirname, '../../hostel_booking.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
    define: {
      timestamps: false,
      underscored: true
    }
  });
}

async function syncDatabaseSchema() {
  try {
    const dialect = sequelize.getDialect();
    await sequelize.sync(); // Ensures missing tables (e.g. pdf_history) are created

    if (dialect === 'sqlite') {
      const [results] = await sequelize.query("PRAGMA table_info(swap_requests);");
      const columns = results.map(r => r.name);
      if (!columns.includes('old_pdf_paths')) {
        await sequelize.query("ALTER TABLE swap_requests ADD COLUMN old_pdf_paths TEXT DEFAULT '{}';");
        console.log('[Database Schema Sync] Added column old_pdf_paths to swap_requests.');
      }
      if (!columns.includes('new_pdf_paths')) {
        await sequelize.query("ALTER TABLE swap_requests ADD COLUMN new_pdf_paths TEXT DEFAULT '{}';");
        console.log('[Database Schema Sync] Added column new_pdf_paths to swap_requests.');
      }
      if (!columns.includes('movers')) {
        await sequelize.query("ALTER TABLE swap_requests ADD COLUMN movers TEXT DEFAULT '{}';");
        console.log('[Database Schema Sync] Added column movers to swap_requests.');
      }
    } else if (dialect === 'postgres') {
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

