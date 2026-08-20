const { sha256 } = require('../utils/crypto');

function getFingerprint(req) {
  const userAgent = req.headers['user-agent'] || 'unknown_agent';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown_ip';
  return sha256(`${userAgent}|${ip}`);
}

module.exports = { getFingerprint };
