const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Student } = require('../models');

const studentAuth = async (req, res, next) => {
  let token = req.cookies?.accessToken || req.cookies?.studentToken;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No session found.' });
  }

  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || env.jwtSecret;
    const decoded = jwt.verify(token, accessSecret);
    if (!decoded || (decoded.type && decoded.type !== 'student' && decoded.role !== 'student')) {
      return res.status(403).json({ error: 'Forbidden: Student access required.' });
    }

    const student = await Student.findOne({ where: { email: decoded.email } });
    if (!student) {
      return res.status(403).json({ error: 'Unauthorized: Not in Database' });
    }

    req.student = student;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please re-authenticate.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired student token.' });
  }
};

const authenticate = studentAuth;
const authorize = (...roles) => (req, res, next) => {
  const role = req.user?.role || req.admin?.role || 'student';
  if (!roles.includes(role)) {
    return res.status(403).json({ error: `Forbidden. Required role: ${roles.join(' or ')}.` });
  }
  next();
};

module.exports = studentAuth;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;
