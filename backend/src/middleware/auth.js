const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Student } = require('../models');

const studentAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (!decoded || decoded.type !== 'student') {
      return res.status(403).json({ error: 'Forbidden: Student access required.' });
    }

    const student = await Student.findOne({ where: { email: decoded.email } });
    if (!student) {
      return res.status(403).json({ error: 'Unauthorized: Not in Database' });
    }

    req.student = student;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired student token.' });
  }
};

module.exports = studentAuth;
