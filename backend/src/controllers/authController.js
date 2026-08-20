const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { Admin, Student, RefreshToken } = require('../models');
const { sha256 } = require('../utils/crypto');
const { getFingerprint } = require('../services/deviceFingerprint');

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || env.jwtSecret || 'default_jwt_access_secret';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || env.jwtSecret || 'default_jwt_refresh_secret';

// Helper to issue tokens & set HttpOnly cookies
async function issueSessionTokens(req, res, { userId, role, email, roll_number, name }) {
  const fingerprint = getFingerprint(req);
  const familyId = uuidv4();

  // Enforce single session if SESSION_SINGLE_DEVICE is enabled
  if (process.env.SESSION_SINGLE_DEVICE === 'true') {
    const whereClause = userId ? { user_id: userId, revoked_at: null } : { admin_email: email, revoked_at: null };
    await RefreshToken.update({ revoked_at: new Date() }, { where: whereClause });
  }

  const accessPayload = { id: userId, role: role || 'user', email, roll_number, name, type: role === 'student' ? 'student' : 'admin' };
  const accessToken = jwt.sign(accessPayload, getAccessSecret(), { expiresIn: '15m' });
  const refreshToken = uuidv4();
  const tokenHash = sha256(refreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user_id: userId || null,
    student_roll: roll_number || null,
    admin_email: email || null,
    token_hash: tokenHash,
    expires_at: expiresAt,
    device_fingerprint: fingerprint,
    family_id: familyId
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return { accessToken, refreshToken };
}

// Admin Login
async function adminLogin(req, res) {
  try {
    const { email, password, mfaCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    // ---------- MFA CHECK (TEMPORARILY COMMENTED OUT FOR DEMO) ----------
    // if (admin.mfa_enabled || process.env.MFA_ENABLED === 'true') {
    //   if (!admin.mfa_secret) {
    //     return res.status(403).json({ error: 'MFA not set up for this admin account.' });
    //   }
    //   if (!mfaCode) {
    //     return res.status(403).json({ error: 'MFA code required for admin account.', requireMfa: true });
    //   }
    //   const verified = speakeasy.totp.verify({
    //     secret: admin.mfa_secret,
    //     encoding: 'base32',
    //     token: String(mfaCode).trim()
    //   });
    //   if (!verified) {
    //     return res.status(401).json({ error: 'Invalid MFA code.' });
    //   }
    // }
    // ✅ MFA CHECK BYPASSED - Login allowed without MFA.

    const tokens = await issueSessionTokens(req, res, {
      userId: admin.id,
      role: admin.role || 'Admin',
      email: admin.email,
      name: admin.name
    });

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token: tokens.accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mfa_enabled: !!admin.mfa_enabled
      }
    });
  } catch (err) {
    console.error('Error in adminLogin:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

// General Auth Login Endpoint
async function login(req, res) {
  return adminLogin(req, res);
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

    const tokens = await issueSessionTokens(req, res, {
      roll_number: student.roll_number,
      role: 'student',
      email: student.email,
      name: student.full_name
    });

    return res.json({
      success: true,
      message: 'Student authentication successful.',
      token: tokens.accessToken,
      student
    });
  } catch (err) {
    console.error('Error in studentMicrosoftAuth:', err);
    return res.status(500).json({ error: 'Internal server error during student authentication.' });
  }
}

// Refresh Token Endpoint with Zombie Token Family Revocation
async function refresh(req, res) {
  try {
    const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const tokenHash = sha256(oldRefreshToken);
    const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash, revoked_at: null } });

    if (!stored) {
      // 🚨 RED TEAM DEFENSE: "Zombie Token" detection.
      // If token hash matches a revoked token, someone is attempting token reuse. Revoke entire family!
      const familyToken = await RefreshToken.findOne({ where: { token_hash: tokenHash } });
      if (familyToken && familyToken.family_id) {
        await RefreshToken.update({ revoked_at: new Date() }, { where: { family_id: familyToken.family_id } });
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
        return res.status(403).json({ error: 'Token reuse detected. Entire session family revoked.' });
      }
      return res.status(401).json({ error: 'Invalid or revoked refresh token.' });
    }

    if (new Date() > new Date(stored.expires_at)) {
      await stored.update({ revoked_at: new Date() });
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(401).json({ error: 'Refresh token expired. Please re-authenticate.' });
    }

    // Revoke current used token
    await stored.update({ revoked_at: new Date() });

    // Issue new tokens under same family
    const newRefreshToken = uuidv4();
    const newTokenHash = sha256(newRefreshToken);
    const fingerprint = getFingerprint(req);

    let userRole = 'user';
    let email = stored.admin_email;
    let rollNumber = stored.student_roll;
    let userId = stored.user_id;

    if (userId) {
      const admin = await Admin.findByPk(userId);
      if (admin) userRole = admin.role;
    }

    const accessPayload = { id: userId, role: userRole, email, roll_number: rollNumber };
    const newAccessToken = jwt.sign(accessPayload, getAccessSecret(), { expiresIn: '15m' });

    await RefreshToken.create({
      user_id: userId || null,
      student_roll: rollNumber || null,
      admin_email: email || null,
      token_hash: newTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      device_fingerprint: fingerprint,
      family_id: stored.family_id
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, message: 'Session refreshed successfully.', token: newAccessToken });
  } catch (err) {
    console.error('Error in refresh:', err);
    return res.status(500).json({ error: 'Failed to refresh token.' });
  }
}

// Logout Endpoint
async function logout(req, res) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      const tokenHash = sha256(token);
      await RefreshToken.update({ revoked_at: new Date() }, { where: { token_hash: tokenHash } });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error during logout.' });
  }
}

// MFA Setup Endpoint (Generates TOTP secret & QR code)
async function mfaSetup(req, res) {
  try {
    const adminId = req.admin?.id || req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required for MFA setup.' });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const secret = speakeasy.generateSecret({
      name: `IIT Hostel Booking (${admin.email})`,
      issuer: 'IIT Patna'
    });

    await admin.update({ mfa_secret: secret.base32 });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      message: 'MFA secret generated successfully.',
      secret: secret.base32,
      qrCode
    });
  } catch (err) {
    console.error('Error in mfaSetup:', err);
    return res.status(500).json({ error: 'Failed to setup MFA.' });
  }
}

// MFA Verify Endpoint (Verifies TOTP code and enables MFA)
async function mfaVerify(req, res) {
  try {
    const adminId = req.admin?.id || req.user?.id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'MFA verification code is required.' });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin || !admin.mfa_secret) {
      return res.status(400).json({ error: 'MFA is not configured for this account. Please run setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.mfa_secret,
      encoding: 'base32',
      token: String(code).trim()
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid MFA code.' });
    }

    await admin.update({ mfa_enabled: true });

    return res.json({ success: true, message: 'MFA verified and enabled successfully.' });
  } catch (err) {
    console.error('Error in mfaVerify:', err);
    return res.status(500).json({ error: 'Failed to verify MFA code.' });
  }
}

module.exports = {
  adminLogin,
  login,
  studentMicrosoftAuth,
  refresh,
  logout,
  mfaSetup,
  mfaVerify
};
