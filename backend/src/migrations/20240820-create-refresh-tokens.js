module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      student_roll: { type: Sequelize.STRING, allowNull: true },
      admin_email: { type: Sequelize.STRING, allowNull: true },
      token_hash: { type: Sequelize.STRING, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE },
      device_fingerprint: { type: Sequelize.STRING, allowNull: false },
      family_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id', 'revoked_at']);
    await queryInterface.addIndex('refresh_tokens', ['token_hash']);
  },
  down: async (queryInterface) => await queryInterface.dropTable('refresh_tokens'),
};
