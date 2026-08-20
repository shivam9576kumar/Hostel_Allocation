const rateLimit = require('express-rate-limit');

// Student rate limiter (using roll number)
const studentRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000, 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || 1000, 10),

  keyGenerator: (req) => {
    if (req.student?.roll_number || req.user?.roll_number) {
      return `student:${req.student?.roll_number || req.user?.roll_number}`;
    }
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },

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

// Layer 1 Defense: Prevents brute-forcing 1M 6-digit pairing codes
const pairCodeLimiter = rateLimit({
  windowMs: parseInt(process.env.PAIRING_WINDOW_MS || 600000, 10), // 10 mins
  max: parseInt(process.env.PAIRING_MAX_ATTEMPTS || 10, 10),       // 10 attempts
  keyGenerator: (req) => {
    const roomId = req.params?.roomId || req.body?.roomId || 'global';
    const identifier = req.student?.roll_number || req.user?.roll_number || req.ip;
    return `bruteforce:code:${roomId}:${identifier}`;
  },
  validate: false,
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Too many pairing attempts for this room. Please wait 10 minutes.'
    });
  }
});

module.exports = { studentRateLimiter, adminRateLimiter, pairCodeLimiter };
