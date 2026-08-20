'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add mfa_secret column safely if it doesn't exist
    await queryInterface.addColumn('admins', 'mfa_secret', {
      type: Sequelize.STRING(255),
      allowNull: true,
    }).catch(() => {});

    // Add mfa_enabled column safely if it doesn't exist
    await queryInterface.addColumn('admins', 'mfa_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('admins', 'mfa_secret').catch(() => {});
    await queryInterface.removeColumn('admins', 'mfa_enabled').catch(() => {});
  },
};
