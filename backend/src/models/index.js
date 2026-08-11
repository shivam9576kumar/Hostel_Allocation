const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'Admin'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'admins'
});

const Student = sequelize.define('Student', {
  roll_number: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  programme: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  booking_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Pending'
  },
  booked_room_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'students'
});

const Hostel = sequelize.define('Hostel', {
  hostel_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  allowed_gender: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  allowed_programme: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  allowed_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hostels'
});

const Block = sequelize.define('Block', {
  block_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  is_reserved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'blocks'
});

const Floor = sequelize.define('Floor', {
  floor_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  block_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  floor_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_reserved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'floors'
});

const Room = sequelize.define('Room', {
  room_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  floor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  room_number: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 2
  },
  current_occupancy: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_reserved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Vacant'
  },
  pairing_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  code_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'rooms'
});

const Booking = sequelize.define('Booking', {
  booking_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  student_roll: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  booking_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paired_with: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'bookings'
});

// Define Associations
Hostel.hasMany(Block, { foreignKey: 'hostel_id', onDelete: 'CASCADE' });
Block.belongsTo(Hostel, { foreignKey: 'hostel_id' });

Block.hasMany(Floor, { foreignKey: 'block_id', onDelete: 'CASCADE' });
Floor.belongsTo(Block, { foreignKey: 'block_id' });

Floor.hasMany(Room, { foreignKey: 'floor_id', onDelete: 'CASCADE' });
Room.belongsTo(Floor, { foreignKey: 'floor_id' });

Room.hasMany(Booking, { foreignKey: 'room_id', onDelete: 'CASCADE' });
Booking.belongsTo(Room, { foreignKey: 'room_id' });

Student.hasMany(Booking, { foreignKey: 'student_roll', sourceKey: 'roll_number', onDelete: 'CASCADE' });
Booking.belongsTo(Student, { foreignKey: 'student_roll', targetKey: 'roll_number' });

Student.belongsTo(Room, { foreignKey: 'booked_room_id', as: 'BookedRoom' });
Room.hasMany(Student, { foreignKey: 'booked_room_id' });

Booking.belongsTo(Student, { foreignKey: 'paired_with', targetKey: 'roll_number', as: 'PairedStudent' });

module.exports = {
  sequelize,
  Admin,
  Student,
  Hostel,
  Block,
  Floor,
  Room,
  Booking
};
