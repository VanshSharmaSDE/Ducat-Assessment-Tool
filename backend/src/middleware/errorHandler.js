import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND',
  });
}

export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred';
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  const response = {
    success: false,
    message,
    errorCode,
  };

  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
