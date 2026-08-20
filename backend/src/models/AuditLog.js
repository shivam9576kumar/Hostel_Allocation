const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_roll: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  target_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  diff: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'AuditLogs',
  timestamps: false
});

module.exports = AuditLog;
