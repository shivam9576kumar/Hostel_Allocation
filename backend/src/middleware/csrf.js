const crypto = require('crypto');

const csrfProtection = (req, res, next) => {
  // 🔴 SKIP CSRF FOR ALL AUTHENTICATION ROUTES (Login, OAuth, Callbacks)
  const authPaths = ['/api/admin/login', '/api/students/login', '/api/student/microsoft', '/api/student/callback'];
  if (authPaths.includes(req.path) || req.path.startsWith('/api/student/') || req.path.endsWith('/login')) {
    return next();
  }

  // For GET/HEAD/OPTIONS, skip CSRF checks (they are safe)
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
  const clientToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
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
        return next();
      }
    } catch (e) {
      // Fall through to 403
    }
  }

  return res.status(403).json({ error: 'CSRF token validation failed.' });
};

module.exports = { csrfProtection };
