'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('allocation_rules', 'allowed_year', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      console.log('allowed_year column already exists in allocation_rules');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('allocation_rules', 'allowed_year');
  }
};
