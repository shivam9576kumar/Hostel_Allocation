/* eslint-disable no-unused-vars */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const response = {
    error: message,
    requestId: req.correlationId || null
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  console.error(`[Global Error Handler] ${status} - ${message} - ${req.method} ${req.url}`);
  res.status(status).json(response);
};

module.exports = errorHandler;
