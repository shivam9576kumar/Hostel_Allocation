// backend/src/queues/failedPdfQueue.js

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const env = require('../config/env');

const redisUrl = process.env.REDIS_URL || env.redisUrl;

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const failedPdfQueue = new Queue('failed-pdf-generation', {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for manual inspection
  },
});

module.exports = failedPdfQueue;
module.exports.connection = connection;
