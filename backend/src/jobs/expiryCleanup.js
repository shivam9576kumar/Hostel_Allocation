const cron = require('node-cron');
const { Room, Booking, Student, sequelize } = require('../models');
const redisClient = require('../config/redis');
const { Op } = require('sequelize');

function initExpiryCronJob() {
  // Run every minute: '0 * * * * *' or '* * * * *'
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const expiredRooms = await Room.findAll({
        where: {
          status: 'Pending_Pairing',
          code_expiry: {
            [Op.lt]: now
          }
        }
      });

      if (expiredRooms.length === 0) {
        return;
      }

      console.log(`[Cron Expiry Cleanup] Found ${expiredRooms.length} expired room pairing code(s). Cleaning up...`);

      for (const room of expiredRooms) {
        let transaction;
        try {
          transaction = await sequelize.transaction();

          // 1. Revert room status
          await room.update({
            status: 'Vacant',
            pairing_code: null,
            code_expiry: null,
            current_occupancy: 0
          }, { transaction });

          // 2. Find all bookings associated with this room
          const roomBookings = await Booking.findAll({
            where: { room_id: room.room_id },
            transaction
          });
          const rollsInRoom = roomBookings.map(b => b.student_roll);

          if (rollsInRoom.length > 0) {
            // Reset students' booking_status & booked_room_id
            await Student.update({
              booking_status: 'Pending',
              booked_room_id: null
            }, {
              where: { roll_number: rollsInRoom },
              transaction
            });

            // Delete booking records
            await Booking.destroy({
              where: { room_id: room.room_id },
              transaction
            });
          }

          await transaction.commit();

          // Broadcast room status update via Socket.IO
          try {
            const app = require('../app');
            const broadcastRoomUpdate = app.get('broadcastRoomUpdate');
            if (broadcastRoomUpdate && room.floor_id) {
              broadcastRoomUpdate(room.floor_id, room.room_id, 'Vacant', 0);
            }
          } catch (bErr) {
            console.warn('[Cron Expiry Broadcast Warning]:', bErr.message);
          }

          // 3. Clear Redis key
          try {
            if (redisClient && typeof redisClient.del === 'function') {
              await redisClient.del(`room:code:${room.room_id}`);
            }
          } catch (rErr) {
            // Ignore redis errors in fallback
          }

          console.log(`[Cron Expiry Cleanup] Reverted room #${room.room_id} (${room.room_number}) to Vacant.`);
        } catch (err) {
          if (transaction && !transaction.finished) {
            try {
              await transaction.rollback();
            } catch (rbErr) {
              console.error('Cron Rollback Error:', rbErr.message);
            }
          }
          console.error(`[Cron Expiry Cleanup Error] Failed to cleanup room #${room.room_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Cron Expiry Cleanup Error] Unexpected error in cron job:', err.message);
    }
  });

  console.log('[Cron Expiry Cleanup] Expiry cron job initialized (runs every 60 seconds).');
}

module.exports = {
  initExpiryCronJob
};
