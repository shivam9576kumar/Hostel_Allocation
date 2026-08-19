// backend/src/queues/failedPdfQueue.js

const Queue = require('bull');
const env = require('../config/env');

const redisUrl = process.env.REDIS_URL || env.redisUrl;

const failedPdfQueue = new Queue('failed-pdf-generation', redisUrl, {
  redis: {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return 200;
    },
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = failedPdfQueue;
