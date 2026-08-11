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

async function initDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Database connection (${sequelize.getDialect()}) established successfully.`);
  } catch (err) {
    console.error('[Database Error] Failed to connect to database:', err.message);
    throw err;
  }
  return sequelize;
}

module.exports = sequelize;
module.exports.initDatabaseConnection = initDatabaseConnection;
