const ipWhitelist = (req, res, next) => {
  // Only apply to admin routes
  if (!req.path.startsWith('/api/admin')) return next();

  const allowedIPs = process.env.ADMIN_WHITELIST_IPS ? process.env.ADMIN_WHITELIST_IPS.split(',').map(ip => ip.trim()) : [];
  const clientIP = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;

  if (allowedIPs.length === 0) {
    // If no IPs are specified, allow request
    return next();
  }

  if (!clientIP || !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Admin access denied from this IP address.' });
  }

  next();
};

module.exports = { ipWhitelist };
