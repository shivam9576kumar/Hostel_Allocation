const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    student_roll: {
      type: DataTypes.STRING,
      allowNull: true
    },
    admin_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    token_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    device_fingerprint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    family_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'revoked_at'] },
      { fields: ['token_hash'] }
    ]
  });

  return RefreshToken;
};
