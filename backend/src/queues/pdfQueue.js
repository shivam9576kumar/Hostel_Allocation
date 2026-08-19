// backend/src/queues/pdfQueue.js

const Queue = require('bull');
const env = require('../config/env');

const redisUrl = process.env.REDIS_URL || env.redisUrl;

// ============================================================
// 1. Connect to Upstash / Local Redis using classic Bull (Redis 3.x compatible)
// ============================================================
const pdfQueue = new Queue('pdf-generation', redisUrl, {
  redis: {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return 200;
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 60000,
  },
});

module.exports = pdfQueue;
