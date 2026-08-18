const sequelize = require('./src/config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully with Sequelize!');
    console.log('✅ Database:', sequelize.config.database);
    console.log('✅ User:', sequelize.config.username);
    console.log('✅ Host:', sequelize.config.host);
    console.log('✅ Port:', sequelize.config.port);
    await sequelize.close();
    console.log('✅ Connection closed.');
  } catch (error) {
    console.error('❌ Sequelize connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
