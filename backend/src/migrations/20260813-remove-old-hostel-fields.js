'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('hostels', 'allowed_programme');
    } catch (e) {
      console.log('allowed_programme column already removed');
    }
    try {
      await queryInterface.removeColumn('hostels', 'allowed_year');
    } catch (e) {
      console.log('allowed_year column already removed');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('hostels', 'allowed_programme', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
    await queryInterface.addColumn('hostels', 'allowed_year', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
