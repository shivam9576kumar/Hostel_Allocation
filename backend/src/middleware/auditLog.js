const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

const logAction = async (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody = null;
  res.json = function (body) { responseBody = body; return originalJson.call(this, body); };
  res.send = function (body) { responseBody = body; return originalSend.call(this, body); };

  res.on('finish', async () => {
    const methodsToLog = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToLog.includes(req.method) && res.statusCode < 400) return;

    if (req.path === '/health' || req.path === '/metrics' || req.path === '/ping') return;

    try {
      // Omit sensitive password fields from request diff log
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.newPassword) safeBody.newPassword = '[REDACTED]';

      const auditEntry = {
        user_id: req.user?.id || req.admin?.id || null,
        user_roll: req.user?.roll_number || req.student?.roll_number || null,
        user_email: req.user?.email || req.admin?.email || null,
        action: `${req.method} ${req.path}`,
        target_type: req.params?.target_type || req.path.split('/')[2] || 'api',
        target_id: req.params?.id || req.body?.id || null,
        diff: { query: req.query, body: safeBody, status: res.statusCode },
        ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown',
        created_at: new Date(),
      };

      await AuditLog.create(auditEntry).catch(err => logger.error('Failed to write audit log:', err.message));
    } catch (err) {
      logger.error('Audit log write failure:', err.message);
    }
  });

  next();
};

module.exports = { logAction };
