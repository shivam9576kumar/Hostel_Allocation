const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const redis = require('../config/redis');

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    await sequelize.authenticate();
    health.services.database = 'connected';
  } catch (err) {
    health.status = 'degraded';
    health.services.database = 'disconnected';
    health.database_error = err.message;
  }

  try {
    if (typeof redis.ping === 'function') {
      await redis.ping();
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'memory_fallback';
    }
  } catch (err) {
    health.status = 'degraded';
    health.services.redis = 'disconnected';
    health.redis_error = err.message;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
