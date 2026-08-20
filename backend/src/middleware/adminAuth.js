const jwt = require('jsonwebtoken');
const env = require('../config/env');

const adminAuth = (req, res, next) => {
  let token = req.cookies?.accessToken || req.cookies?.adminToken;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
  }

  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || env.jwtSecret;
    const decoded = jwt.verify(token, accessSecret);
    if (!decoded || (decoded.type && decoded.type !== 'admin' && !['Admin', 'Super Admin', 'admin', 'super_admin'].includes(decoded.role))) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    req.admin = decoded;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please re-authenticate.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
};

module.exports = adminAuth;
