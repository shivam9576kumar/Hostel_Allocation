const express = require('express');
const client = require('prom-client');
const router = express.Router();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const jobCounter = new client.Counter({
  name: 'booking_requests_total',
  help: 'Total number of booking requests',
  labelNames: ['status'],
});
register.registerMetric(jobCounter);

router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

const trackRequests = (req, res, next) => {
  res.on('finish', () => {
    jobCounter.inc({ status: res.statusCode < 400 ? 'success' : 'error' });
  });
  next();
};

module.exports = { router, trackRequests };
