const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_POOL_MAX = 50,
  DB_POOL_MIN = 10,
  DB_POOL_IDLE = 20000,
  DB_POOL_ACQUIRE = 60000,
} = process.env;

const connectionString = DATABASE_URL || `postgresql://${DB_USER || 'hostel_user'}:${DB_PASSWORD || 'Hostel@123'}@${DB_HOST || 'localhost'}:${DB_PORT || 5432}/${DB_NAME || 'hostel_booking'}`;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  define: {
    timestamps: false,
    underscored: true
  },
  pool: {
    max: parseInt(DB_POOL_MAX, 10),
    min: parseInt(DB_POOL_MIN, 10),
    idle: parseInt(DB_POOL_IDLE, 10),
    acquire: parseInt(DB_POOL_ACQUIRE, 10),
  },
  dialectOptions: {
    connectTimeout: 60000,
    statement_timeout: 30000, // Kill slow queries after 30 seconds
    keepalive: true,
    ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  hooks: {
    beforeQuery: (options) => {
      if (options.type === 'SELECT' && options.replacements === undefined && options.sql) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('⚠️ Raw SQL query detected without replacements. Ensure parameters are properly bound.');
        }
      }
    }
  },
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionAcquireTimeoutError/,
    ],
  },
});

async function initDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('[Database] Database connection established successfully.');
  } catch (err) {
    console.error('[Database Error] Failed to connect to database:', err.message);
    throw err;
  }
  return sequelize;
}

sequelize.initDatabaseConnection = initDatabaseConnection;

module.exports = sequelize;
module.exports.initDatabaseConnection = initDatabaseConnection;
