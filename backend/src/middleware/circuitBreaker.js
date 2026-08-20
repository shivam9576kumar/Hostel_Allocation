let isMaintenanceMode = false;

const setMaintenanceMode = (status) => {
  isMaintenanceMode = Boolean(status);
};

const circuitBreaker = (req, res, next) => {
  if (isMaintenanceMode && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (req.path.startsWith('/api/admin/maintenance')) return next();
    return res.status(503).json({
      error: 'System is currently under maintenance / incident lockdown.',
      code: 'CIRCUIT_BREAKER_ACTIVE'
    });
  }
  next();
};

module.exports = { circuitBreaker, setMaintenanceMode };
