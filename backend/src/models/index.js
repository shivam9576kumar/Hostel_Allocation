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
  tableName: 'admins',
  timestamps: false,
  underscored: true
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
  department: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  admission_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  program_code: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  hostel_stay_end_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  graduated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'students',
  timestamps: false,
  underscored: true
});

const ProgramCode = sequelize.define('ProgramCode', {
  code: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  hostel_stay: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'program_codes',
  timestamps: false,
  underscored: true
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
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hostels',
  timestamps: false,
  underscored: true
});

const GlobalSetting = sequelize.define('GlobalSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  booking_start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  booking_end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'global_settings',
  timestamps: false,
  underscored: true
});

const AllocationRule = sequelize.define('AllocationRule', {
  rule_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  programme: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  allowed_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  block_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  floor_start: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  floor_end: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 999
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'Female'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'allocation_rules',
  timestamps: false,
  underscored: true
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
  tableName: 'blocks',
  timestamps: false,
  underscored: true
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
  tableName: 'floors',
  timestamps: false,
  underscored: true
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
  tableName: 'rooms',
  timestamps: false,
  underscored: true
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
  tableName: 'bookings',
  timestamps: false,
  underscored: true
});

const SwapRequest = sequelize.define('SwapRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  initiator_roll: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  source_room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  target_room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  target_student_roll: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  swap_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'full'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Pending'
  },
  consents: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const raw = this.getDataValue('consents');
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      return raw || {};
    },
    set(value) {
      if (typeof value === 'object' && value !== null) {
        this.setDataValue('consents', JSON.stringify(value));
      } else {
        this.setDataValue('consents', value);
      }
    }
  },
  movers: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const raw = this.getDataValue('movers');
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      return raw || {};
    },
    set(value) {
      if (typeof value === 'object' && value !== null) {
        this.setDataValue('movers', JSON.stringify(value));
      } else {
        this.setDataValue('movers', value);
      }
    }
  },
  old_pdf_paths: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  new_pdf_paths: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'swap_requests',
  timestamps: false,
  underscored: true
});

const PDFHistory = sequelize.define('PDFHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_roll: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pdf_path: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  is_swap: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  generated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'pdf_history',
  timestamps: false,
  underscored: true
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

// SwapRequest Associations
SwapRequest.belongsTo(Student, { foreignKey: 'initiator_roll', targetKey: 'roll_number', as: 'Initiator' });
SwapRequest.belongsTo(Student, { foreignKey: 'target_student_roll', targetKey: 'roll_number', as: 'TargetStudent' });
SwapRequest.belongsTo(Room, { 
  foreignKey: 'source_room_id', 
  as: 'SourceRoom',
  onDelete: 'CASCADE'
});
SwapRequest.belongsTo(Room, { 
  foreignKey: 'target_room_id', 
  as: 'TargetRoom',
  onDelete: 'CASCADE'
});

// AllocationRule Associations
Hostel.hasMany(AllocationRule, { foreignKey: 'hostel_id', onDelete: 'SET NULL' });
AllocationRule.belongsTo(Hostel, { foreignKey: 'hostel_id', onDelete: 'SET NULL' });

Block.hasMany(AllocationRule, { foreignKey: 'block_id', onDelete: 'SET NULL' });
AllocationRule.belongsTo(Block, { foreignKey: 'block_id', onDelete: 'SET NULL' });

Student.belongsTo(ProgramCode, { foreignKey: 'program_code', targetKey: 'code' });
ProgramCode.hasMany(Student, { foreignKey: 'program_code', sourceKey: 'code' });

module.exports = {
  sequelize,
  Admin,
  Student,
  ProgramCode,
  Hostel,
  Block,
  Floor,
  Room,
  Booking,
  SwapRequest,
  PDFHistory,
  AllocationRule,
  GlobalSetting
};
