// src/middleware/errorHandler.js
import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error details with context
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Handle database unique constraint errors
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry. This record already exists.'
    });
  }

  // Handle foreign key constraint errors
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Related record not found.'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

export default errorHandler;
