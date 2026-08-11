const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Admin, Student } = require('../models');

// Admin Login
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, name: admin.name, email: admin.email, role: admin.role, type: 'admin' },
      env.jwtSecret,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Admin login successful.',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Error in adminLogin:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

// Student OAuth Callback / Verification
async function studentMicrosoftAuth(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required from OAuth payload.' });
    }

    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(403).json({ error: 'Unauthorized: Not in Database' });
    }

    const token = jwt.sign(
      {
        roll_number: student.roll_number,
        email: student.email,
        full_name: student.full_name,
        type: 'student'
      },
      env.jwtSecret,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Student authentication successful.',
      token,
      student
    });
  } catch (err) {
    console.error('Error in studentMicrosoftAuth:', err);
    return res.status(500).json({ error: 'Internal server error during student authentication.' });
  }
}

module.exports = {
  adminLogin,
  studentMicrosoftAuth
};
