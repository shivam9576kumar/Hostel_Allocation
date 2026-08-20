const rateLimit = require('express-rate-limit');

/**
 * Rate limiter using Student Roll Number (from JWT) as the key.
 * This prevents campus Wi-Fi (shared IP) from blocking all students.
 */
const studentRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000, 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || 1000, 10),

  // KEY CHANGE: Use roll_number instead of IP
  keyGenerator: (req) => {
    // If student is logged in, use roll_number
    if (req.student?.roll_number || req.user?.roll_number) {
      return `student:${req.student?.roll_number || req.user?.roll_number}`;
    }
    // Fallback to IP for unauthenticated routes (e.g., login)
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },

  // Disable strict IP format validation to allow custom roll_number/email keys safely
  validate: false,

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait a moment and try again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },

  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    return (
      req.path === '/health' ||
      req.path === '/api/health' ||
      req.path === '/api/students/login' ||
      req.path === '/api/admin/login' ||
      req.path === '/api/students/register'
    );
  },
});

// Admin rate limiter (stricter)
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,

  keyGenerator: (req) => {
    if (req.admin?.email || req.user?.email) {
      return `admin:${req.admin?.email || req.user?.email}`;
    }
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },

  validate: false,

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many admin requests. Please wait.',
    });
  },
});

module.exports = { studentRateLimiter, adminRateLimiter };
