module.exports = {
  up: async (queryInterface) => {
    // Enable the pgcrypto extension
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      console.log('✅ PGCrypto extension enabled on database.');
    } catch (err) {
      console.warn('⚠️ PGCrypto extension warning (non-PostgreSQL dialect or permissions):', err.message);
    }
  },
  down: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pgcrypto;');
    } catch (err) {
      console.warn('⚠️ PGCrypto extension drop warning:', err.message);
    }
  }
};
