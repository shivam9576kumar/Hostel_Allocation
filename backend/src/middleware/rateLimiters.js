const rateLimit = require('express-rate-limit');

// 1. PUBLIC / HEALTH (Strictest)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyGenerator: (req) => req.ip || 'unknown',
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. STUDENT READ (Viewing Rooms, Dashboard)
const studentReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests/min
  keyGenerator: (req) => req.student?.roll_number || req.user?.roll_number || req.ip || 'unknown',
  validate: false,
  skip: (req) => req.path === '/health' || req.path === '/ping',
});

// 3. STUDENT WRITE (Booking, Swaps, Pairing) -> Prevent Automation
const studentWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 state-changing actions per minute
  keyGenerator: (req) => req.student?.roll_number || req.user?.roll_number || req.ip || 'unknown',
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. ADMIN (Strictest for sensitive actions)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 actions per minute
  keyGenerator: (req) => req.admin?.email || req.user?.email || req.ip || 'unknown',
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. PAIRING CODE BRUTE-FORCE (Layer 1 reinforcement)
const pairingBruteForceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 attempts
  keyGenerator: (req) => {
    const roomId = req.body?.roomId || req.params?.roomId || 'global';
    return `bruteforce:${roomId}:${req.student?.roll_number || req.ip || 'unknown'}`;
  },
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  publicLimiter,
  studentReadLimiter,
  studentWriteLimiter,
  adminLimiter,
  pairingBruteForceLimiter,
};
