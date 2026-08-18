// backend/src/queues/pdfQueue.js

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const env = require('../config/env');

const redisUrl = process.env.REDIS_URL || env.redisUrl;

// ============================================================
// 1. Connect to Upstash / Local Redis
// ============================================================
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,  // BullMQ requires this setting
  enableReadyCheck: false,
});

// ============================================================
// 2. Define the PDF Generation Queue
// ============================================================
const pdfQueue = new Queue('pdf-generation', {
  connection,
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 3,                     // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',           // Exponential backoff (2s, 4s, 8s...)
      delay: 2000,
    },
    removeOnComplete: true,          // Remove job from Redis after success
    removeOnFail: false,             // Keep failed jobs for debugging
    timeout: 60000,                  // 60 seconds timeout per job
  },
});

// ============================================================
// 3. Export the queue and connection
// ============================================================
module.exports = pdfQueue;
module.exports.connection = connection;
