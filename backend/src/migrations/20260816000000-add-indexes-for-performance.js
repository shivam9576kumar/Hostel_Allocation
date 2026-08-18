'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('📊 Adding database indexes for performance...');

    // 1. Room Table Indexes
    await queryInterface.addIndex('rooms', ['status'], { name: 'rooms_status_idx' });
    await queryInterface.addIndex('rooms', ['floor_id'], { name: 'rooms_floor_id_idx' });
    await queryInterface.addIndex('rooms', ['is_reserved'], { name: 'rooms_is_reserved_idx' });
    await queryInterface.addIndex('rooms', ['pairing_code'], { name: 'rooms_pairing_code_idx' });
    await queryInterface.addIndex('rooms', ['status', 'is_reserved'], { name: 'rooms_status_reserved_idx' });

    // 2. Student Table Indexes
    await queryInterface.addIndex('students', ['booked_room_id'], { name: 'students_booked_room_id_idx' });
    await queryInterface.addIndex('students', ['booking_status'], { name: 'students_booking_status_idx' });
    await queryInterface.addIndex('students', ['roll_number'], { name: 'students_roll_number_idx' });
    await queryInterface.addIndex('students', ['gender', 'programme', 'year'], { name: 'students_gender_prog_year_idx' });

    // 3. Booking Table Indexes
    await queryInterface.addIndex('bookings', ['room_id'], { name: 'bookings_room_id_idx' });
    await queryInterface.addIndex('bookings', ['student_roll'], { name: 'bookings_student_roll_idx' });
    await queryInterface.addIndex('bookings', ['is_primary'], { name: 'bookings_is_primary_idx' });

    // 4. Allocation Rules Table Indexes
    await queryInterface.addIndex('allocation_rules', ['block_id'], { name: 'allocation_rules_block_id_idx' });
    await queryInterface.addIndex('allocation_rules', ['hostel_id'], { name: 'allocation_rules_hostel_id_idx' });
    await queryInterface.addIndex('allocation_rules', ['programme', 'allowed_year'], { name: 'allocation_rules_prog_year_idx' });

    // 5. Floors Table Indexes
    await queryInterface.addIndex('floors', ['block_id'], { name: 'floors_block_id_idx' });

    // 6. Swap Requests Table Indexes
    await queryInterface.addIndex('swap_requests', ['status'], { name: 'swap_requests_status_idx' });
    await queryInterface.addIndex('swap_requests', ['source_room_id'], { name: 'swap_requests_source_idx' });
    await queryInterface.addIndex('swap_requests', ['target_room_id'], { name: 'swap_requests_target_idx' });

    // 7. PDF History Table Indexes
    await queryInterface.addIndex('pdf_history', ['student_roll'], { name: 'pdf_history_student_roll_idx' });
    await queryInterface.addIndex('pdf_history', ['is_current'], { name: 'pdf_history_is_current_idx' });

    // 8. Blocks Table Indexes
    await queryInterface.addIndex('blocks', ['hostel_id'], { name: 'blocks_hostel_id_idx' });

    console.log('✅ All 22 indexes added successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing indexes...');

    await queryInterface.removeIndex('rooms', 'rooms_status_idx');
    await queryInterface.removeIndex('rooms', 'rooms_floor_id_idx');
    await queryInterface.removeIndex('rooms', 'rooms_is_reserved_idx');
    await queryInterface.removeIndex('rooms', 'rooms_pairing_code_idx');
    await queryInterface.removeIndex('rooms', 'rooms_status_reserved_idx');

    await queryInterface.removeIndex('students', 'students_booked_room_id_idx');
    await queryInterface.removeIndex('students', 'students_booking_status_idx');
    await queryInterface.removeIndex('students', 'students_roll_number_idx');
    await queryInterface.removeIndex('students', 'students_gender_prog_year_idx');

    await queryInterface.removeIndex('bookings', 'bookings_room_id_idx');
    await queryInterface.removeIndex('bookings', 'bookings_student_roll_idx');
    await queryInterface.removeIndex('bookings', 'bookings_is_primary_idx');

    await queryInterface.removeIndex('allocation_rules', 'allocation_rules_block_id_idx');
    await queryInterface.removeIndex('allocation_rules', 'allocation_rules_hostel_id_idx');
    await queryInterface.removeIndex('allocation_rules', 'allocation_rules_prog_year_idx');

    await queryInterface.removeIndex('floors', 'floors_block_id_idx');

    await queryInterface.removeIndex('swap_requests', 'swap_requests_status_idx');
    await queryInterface.removeIndex('swap_requests', 'swap_requests_source_idx');
    await queryInterface.removeIndex('swap_requests', 'swap_requests_target_idx');

    await queryInterface.removeIndex('pdf_history', 'pdf_history_student_roll_idx');
    await queryInterface.removeIndex('pdf_history', 'pdf_history_is_current_idx');

    await queryInterface.removeIndex('blocks', 'blocks_hostel_id_idx');

    console.log('✅ Indexes removed successfully!');
  }
};
