const path = require('path');
const fs = require('fs');

// Attempt to load from backend/.env first, then root .env
const backendEnv = path.join(__dirname, '../.env');
const rootEnv = path.join(__dirname, '../../.env');

if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

module.exports = {
  port: process.env.PORT || 5000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'hostel_booking',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_iit_hostel_jwt_key_2026',
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  }
};
