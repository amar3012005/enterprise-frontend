/**
 * Standardized Error Handler Middleware
 * 
 * This middleware ensures consistent error response formats across all API endpoints.
 * It handles different types of errors and returns standardized JSON responses.
 */

const logger = require('../config/logger');

// Custom error classes for different error types
class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errorCode = 'VALIDATION_ERROR';
    this.details = details;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.errorCode = 'AUTHENTICATION_ERROR';
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.errorCode = 'AUTHORIZATION_ERROR';
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.errorCode = 'NOT_FOUND';
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.errorCode = 'CONFLICT_ERROR';
  }
}

class BusinessLogicError extends Error {
  constructor(message, errorCode = 'BUSINESS_LOGIC_ERROR') {
    super(message);
    this.name = 'BusinessLogicError';
    this.statusCode = 400;
    this.errorCode = errorCode;
  }
}

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log the error with detailed context
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    userType: req.user?.type,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    errorName: err.name,
    errorCode: err.errorCode || 'UNKNOWN_ERROR'
  });

  // Handle custom error classes
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString()
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err instanceof ConflictError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err instanceof BusinessLogicError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));

    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ID',
      message: 'Invalid resource ID format',
      details: {
        field: err.path,
        value: err.value
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_RESOURCE',
      message: `${field} already exists`,
      details: {
        field,
        value: err.keyValue[field]
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      timestamp: new Date().toISOString()
    });
  }

  // Handle network/connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT') {
    return res.status(408).json({
      success: false,
      error: 'REQUEST_TIMEOUT',
      message: 'Request timed out',
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      message: err.message,
      code: err.code
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Helper function to create standardized success responses
const createSuccessResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

// Helper function to create paginated responses
const createPaginatedResponse = (data, page, limit, total) => {
  return {
    success: true,
    message: 'Data retrieved successfully',
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  };
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation helper
const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  });

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      missing.map(field => ({
        field,
        message: `${field} is required`
      }))
    );
  }
};

// Export all error classes and utilities
module.exports = {
  errorHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  createSuccessResponse,
  createPaginatedResponse,
  asyncHandler,
  validateRequired
};
