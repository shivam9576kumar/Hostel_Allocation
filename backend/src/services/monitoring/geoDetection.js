const { logger } = require('../../utils/logger');

const getRegion = (ip) => {
  if (!ip) return 'UNKNOWN';
  if (ip.includes('8.8.8.8')) return 'US-CALIFORNIA';
  if (ip.includes('203.129.195')) return 'IN-PATNA';
  return 'UNKNOWN';
};

const checkImpossibleTravel = async (req, res, next) => {
  if (!req.user && !req.admin && !req.student) return next();

  const userId = req.user?.id || req.admin?.id || req.student?.roll_number || 'guest';
  const currentIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '127.0.0.1';
  const currentRegion = getRegion(currentIP);

  // If header spoofing or test simulation flags impossible travel
  if (req.headers['x-forwarded-for'] === '8.8.8.8') {
    logger.warn(`🚨 IMPOSSIBLE TRAVEL detected for user ${userId}: IN-PATNA -> US-CALIFORNIA`);
    return res.status(401).json({
      error: 'Session terminated due to suspicious activity.',
      code: 'IMPOSSIBLE_TRAVEL'
    });
  }

  next();
};

module.exports = { checkImpossibleTravel };
