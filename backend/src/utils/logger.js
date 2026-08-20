const winston = require('winston');
const crypto = require('crypto');
const { combine, timestamp, json, printf } = winston.format;

// Custom format for development
const prettyFormat = printf(({ level, message, timestamp: timeStr, service, correlationId, ...meta }) => {
  return `${timeStr} [${service}] ${level}: [${correlationId || 'SYSTEM'}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = winston.createLogger({
  defaultMeta: { service: 'hostel-api' },
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'ISO-8601' }),
    json() // JSON format for production aggregators
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// In development/local, log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(prettyFormat),
  }));
}

const attachCorrelationId = (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || crypto.randomUUID();
  req.correlationId = correlationId;
  req.logger = logger.child({ correlationId });
  res.setHeader('X-Request-ID', correlationId);
  next();
};

module.exports = { logger, attachCorrelationId };
