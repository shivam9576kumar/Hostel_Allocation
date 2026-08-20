const crypto = require('crypto');

const csrfProtection = (req, res, next) => {
  // ✅ ULTIMATE SKIP CONDITION: Skip CSRF for ALL auth routes (any path containing /login, /auth, /microsoft, /callback)
  const url = req.url;
  const path = req.path;

  // 🔥 SKIP CONDITION
  const skipPaths = [
    '/api/admin/login',
    '/api/students/login',
    '/api/student/microsoft',
    '/api/student/callback',
    '/api/auth/microsoft',
    '/api/auth/callback',
  ];

  const shouldSkip = skipPaths.includes(path) ||
                     path.includes('/login') ||
                     path.includes('/auth') ||
                     path.includes('/microsoft') ||
                     path.includes('/callback') ||
                     path.startsWith('/api/student/') ||
                     path.startsWith('/api/auth/');

  if (shouldSkip) {
    console.log(`🔓 CSRF bypassed for: ${req.method} ${path}`);
    return next();
  }

  // For GET/HEAD/OPTIONS, set cookie (if not exists)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.cookies?.csrfToken) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('csrfToken', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }
    return next();
  }

  // For API requests with Authorization header (e.g. JWT in Bearer token mode), skip strict browser CSRF
  if (req.headers.authorization && !req.cookies?.csrfToken) {
    return next();
  }

  // For state-changing methods (POST/PUT/DELETE), validate the token
  const clientToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || req.headers['x-xsrf-token'];
  const serverToken = req.cookies?.csrfToken;

  if (serverToken && clientToken) {
    try {
      const serverBuf = Buffer.from(serverToken);
      const clientBuf = Buffer.from(clientToken);
      if (serverBuf.length === clientBuf.length && crypto.timingSafeEqual(serverBuf, clientBuf)) {
        const newToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', newToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        console.log(`✅ CSRF passed: ${req.method} ${path}`);
        return next();
      }
    } catch (e) {
      // Fall through to 403
    }
  }

  console.log(`❌ CSRF failed: ${req.method} ${path} - Token: ${clientToken ? 'present' : 'missing'}`);
  return res.status(403).json({ error: 'CSRF token validation failed.' });
};

module.exports = { csrfProtection };
