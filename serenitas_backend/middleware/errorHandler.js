/**
 * Global Error Handling Middleware
 * 
 * Catches and formats all errors in the application.
 * Maps error types to HTTP status codes and provides consistent error responses.
 * Hides stack traces in production for security.
 * 
 * Requirements: 12.7
 */

const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create validation error
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, constants.ERROR_CODES.VALIDATION_REQUIRED_FIELD);
  }
}

/**
 * Create authentication error
 */
class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401, constants.ERROR_CODES.AUTH_UNAUTHORIZED);
  }
}

/**
 * Create authorization error
 */
class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403, constants.ERROR_CODES.AUTHZ_FORBIDDEN);
  }
}

/**
 * Create not found error
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, constants.ERROR_CODES.BUSINESS_PATIENT_NOT_FOUND);
  }
}

/**
 * Create conflict error
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, constants.ERROR_CODES.BUSINESS_APPOINTMENT_CONFLICT);
  }
}

/**
 * Create database error
 */
class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, constants.ERROR_CODES.SYSTEM_DATABASE_ERROR);
  }
}

/**
 * Map error to HTTP status code
 * 
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
function getStatusCode(error) {
  // If error already has status code, use it
  if (error.statusCode) {
    return error.statusCode;
  }

  // Map common error types
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'ForbiddenError') return 403;
  if (error.name === 'NotFoundError') return 404;
  if (error.name === 'ConflictError') return 409;
  if (error.name === 'JsonWebTokenError') return 401;
  if (error.name === 'TokenExpiredError') return 401;

  // Supabase errors
  if (error.code === '23505') return 409; // Unique violation
  if (error.code === '23503') return 400; // Foreign key violation
  if (error.code === '23502') return 400; // Not null violation
  if (error.code === '22P02') return 400; // Invalid text representation

  // Default to 500
  return 500;
}

/**
 * Map error to error code
 * 
 * @param {Error} error - Error object
 * @returns {string} Error code
 */
function getErrorCode(error) {
  // If error already has code, use it
  if (error.code && typeof error.code === 'string' && error.code.includes('_')) {
    return error.code;
  }

  // Map common error types
  const statusCode = getStatusCode(error);
  
  if (statusCode === 400) return constants.ERROR_CODES.VALIDATION_REQUIRED_FIELD;
  if (statusCode === 401) return constants.ERROR_CODES.AUTH_UNAUTHORIZED;
  if (statusCode === 403) return constants.ERROR_CODES.AUTHZ_FORBIDDEN;
  if (statusCode === 404) return constants.ERROR_CODES.BUSINESS_PATIENT_NOT_FOUND;
  if (statusCode === 409) return constants.ERROR_CODES.BUSINESS_APPOINTMENT_CONFLICT;
  if (statusCode === 500) return constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR;

  return constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR;
}

/**
 * Get user-friendly error message in Portuguese
 * 
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @returns {string} User-friendly error message
 */
function getUserMessage(error, statusCode) {
  // If error has a message and it's in Portuguese, use it
  if (error.message && /[áàâãéêíóôõúç]/i.test(error.message)) {
    return error.message;
  }

  // Map status codes to Portuguese messages
  const messages = {
    400: 'Requisição inválida. Verifique os dados enviados.',
    401: 'Autenticação necessária. Faça login novamente.',
    403: 'Acesso negado. Você não tem permissão para esta ação.',
    404: 'Recurso não encontrado.',
    409: 'Conflito. O recurso já existe ou está em uso.',
    429: 'Muitas requisições. Tente novamente mais tarde.',
    500: 'Erro interno do servidor. Tente novamente mais tarde.',
    503: 'Serviço temporariamente indisponível.'
  };

  return messages[statusCode] || 'Erro ao processar requisição.';
}

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  const startTime = Date.now();

  // Get status code and error code
  const statusCode = getStatusCode(err);
  const errorCode = getErrorCode(err);

  // Determine if we should show detailed error
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isOperationalError = err.isOperational === true;

  // Get user-friendly message
  const userMessage = getUserMessage(err, statusCode);

  // Log error with full context
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    error: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    duration: Date.now() - startTime
  });

  // Build error response
  const errorResponse = {
    success: false,
    message: userMessage,
    code: errorCode,
    timestamp: new Date().toISOString()
  };

  // Add error details in development or for operational errors
  if (isDevelopment || isOperationalError) {
    errorResponse.error = err.message;
  }

  // Add stack trace only in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      originalCode: err.code
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle 404 Not Found errors
 * Should be placed before the global error handler
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    error: `Rota ${req.method} ${req.path} não existe`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json({ success: true, data: users });
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });

  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled promise rejection');
    process.exit(1);
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  // Always exit on uncaught exception
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  // Export error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError
};
