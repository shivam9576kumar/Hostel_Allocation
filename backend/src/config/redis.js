const Redis = require('ioredis');
const env = require('./env');

class MemoryRedisFallback {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    console.log('[Redis Config] Operating in robust in-memory fallback mode for local testing.');
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      if (this.ttls.has(key)) clearTimeout(this.ttls.get(key));
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.ttls.delete(key);
      }, duration * 1000);
      this.ttls.set(key, timer);
    }
    return 'OK';
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async del(key) {
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
      this.ttls.delete(key);
    }
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async ttl(key) {
    if (!this.store.has(key)) return -2;
    return 600;
  }
}

let redisClient;

try {
  redisClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) {
        return null; // Stop retrying and trigger error / fallback
      }
      return 200;
    },
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    console.log('[Redis Config] Connected to Redis server successfully.');
  }).catch((err) => {
    console.warn('[Redis Config] Could not connect to Redis server. Switching to fallback memory store.', err.message);
    redisClient = new MemoryRedisFallback();
  });

  redisClient.on('error', (err) => {
    if (!(redisClient instanceof MemoryRedisFallback)) {
      console.warn('[Redis Error] Redis connection warning:', err.message);
    }
  });

} catch (err) {
  console.warn('[Redis Config] Using fallback memory store.');
  redisClient = new MemoryRedisFallback();
}

async function setSwapActive(isActive) {
  await redisClient.set('swap:active', isActive ? 'true' : 'false');
  return isActive;
}

async function isSwapActive() {
  const val = await redisClient.get('swap:active');
  return val === 'true';
}

module.exports = redisClient;
module.exports.setSwapActive = setSwapActive;
module.exports.isSwapActive = isSwapActive;

