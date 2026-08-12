const { isSwapActive } = require('../config/redis');

async function checkSwapActive(req, res, next) {
  try {
    const active = await isSwapActive();
    if (!active) {
      return res.status(403).json({ error: 'Room swap activity is currently inactive.' });
    }
    next();
  } catch (err) {
    console.error('Error checking swap activity status:', err);
    return res.status(500).json({ error: 'Failed to verify room swap activity status.' });
  }
}

module.exports = checkSwapActive;
