module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuditLogs', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      user_roll: { type: Sequelize.STRING, allowNull: true },
      user_email: { type: Sequelize.STRING, allowNull: true },
      action: { type: Sequelize.STRING(50), allowNull: false },
      target_type: { type: Sequelize.STRING(50), allowNull: true },
      target_id: { type: Sequelize.STRING, allowNull: true },
      diff: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // 🔒 SECURITY: Create a trigger to prevent ANY updates/deletes on the audit log in PostgreSQL
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION prevent_audit_update() RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are prohibited.';
        END;
        $$ LANGUAGE plpgsql;
      `);

      await queryInterface.sequelize.query(`
        CREATE TRIGGER protect_audit_logs
        BEFORE UPDATE OR DELETE ON "AuditLogs"
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();
      `);
    }

    await queryInterface.addIndex('AuditLogs', ['user_id', 'action']);
    await queryInterface.addIndex('AuditLogs', ['created_at']);
  },
  down: async (queryInterface) => {
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS protect_audit_logs ON "AuditLogs";`);
    }
    await queryInterface.dropTable('AuditLogs');
  }
};
