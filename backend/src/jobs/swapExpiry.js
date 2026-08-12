const cron = require('node-cron');
const { SwapRequest } = require('../models');
const { Op } = require('sequelize');

function initSwapExpiryJob() {
  // Run every hour to expire stale pending swap requests
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const [updatedCount] = await SwapRequest.update(
        { status: 'Expired' },
        {
          where: {
            status: { [Op.in]: ['Pending', 'Consenting'] },
            expires_at: { [Op.lt]: now }
          }
        }
      );
      if (updatedCount > 0) {
        console.log(`[Swap Expiry Job] Auto-expired ${updatedCount} stale swap request(s).`);
      }
    } catch (err) {
      console.error('[Swap Expiry Job Error]:', err.message);
    }
  });

  console.log('[Swap Expiry Job] Initialized (runs hourly).');
}

module.exports = { initSwapExpiryJob };
