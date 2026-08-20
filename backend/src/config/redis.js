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

  async setEx(key, seconds, value) {
    return this.set(key, value, 'EX', seconds);
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

  async ping() {
    return 'PONG';
  }

  async eval(script, numkeys, key, arg1, arg2) {
    if (key && key.startsWith('room:lock:')) {
      if (!this.store.has(key)) {
        this.store.set(key, arg1 || 'locked');
        if (arg2) {
          if (this.ttls.has(key)) clearTimeout(this.ttls.get(key));
          const timer = setTimeout(() => {
            this.store.delete(key);
            this.ttls.delete(key);
          }, parseInt(arg2, 10) * 1000);
          this.ttls.set(key, timer);
        }
        return 1;
      }
      return 0;
    }
    return 1;
  }

  async script(action, content) {
    return 'sha_dummy_hash';
  }

  async evalSha(sha, numkeys, key, arg1, arg2) {
    return this.eval('', numkeys, key, arg1, arg2);
  }

  async call(...args) {
    const cmd = (args[0] || '').toLowerCase();
    if (cmd === 'setnx') {
      const key = args[1];
      const val = args[2];
      if (!this.store.has(key)) {
        this.store.set(key, val);
        return 1;
      }
      return 0;
    }
    return 'OK';
  }
}

let redisClient;

const redisUrl = process.env.REDIS_URL || env.redisUrl || 'redis://localhost:6379';

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) {
        console.log('❌ [Redis] Max retries reached. Falling back to memory store.');
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    commandTimeout: 5000,
  });

  redisClient.connect().then(() => {
    console.log('✅ [Redis] Connected to Redis server successfully.');
  }).catch((err) => {
    console.warn('⚠️ [Redis] Connection warning, switching to fallback store:', err.message);
    redisClient = new MemoryRedisFallback();
  });

  redisClient.on('connect', () => console.log('✅ [Redis] Connected to Redis server successfully.'));
  redisClient.on('ready', () => console.log('✅ [Redis] Client is ready and operational.'));
  redisClient.on('error', (err) => {
    if (!(redisClient instanceof MemoryRedisFallback)) {
      console.warn('❌ [Redis] Error:', err.message);
    }
  });
  redisClient.on('close', () => console.log('⚠️ [Redis] Connection closed.'));

} catch (err) {
  console.warn('⚠️ [Redis] Using fallback memory store:', err.message);
  redisClient = new MemoryRedisFallback();
}

// Add setEx compatibility helper for ioredis
if (!redisClient.setEx) {
  redisClient.setEx = function(key, seconds, value) {
    return this.set(key, value, 'EX', seconds);
  };
}

async function setSwapActive(isActive) {
  await redisClient.set('swap:active', isActive ? 'true' : 'false');
  return isActive;
}

async function isSwapActive() {
  const val = await redisClient.get('swap:active');
  return val === 'true';
}

redisClient.setSwapActive = setSwapActive;
redisClient.isSwapActive = isSwapActive;

module.exports = redisClient;
module.exports.setSwapActive = setSwapActive;
module.exports.isSwapActive = isSwapActive;
