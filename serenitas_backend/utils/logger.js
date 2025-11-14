/**
 * Structured Logging Utility
 * 
 * Winston-based logger with structured logging format.
 * Supports multiple log levels and transports.
 * 
 * Requirements: 11.1, 11.2
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'gray'
};

winston.addColors(colors);

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport for all environments
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: structuredFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: structuredFormat,
  transports,
  exitOnError: false
});

/**
 * Log with request context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} req - Express request object
 * @param {Object} meta - Additional metadata
 */
logger.logWithRequest = function(level, message, req, meta = {}) {
  const requestContext = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?._id || req.user?.id,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  this[level](message, { ...requestContext, ...meta });
};

/**
 * Log security event
 * @param {string} action - Security action
 * @param {Object} details - Event details
 */
logger.security = function(action, details = {}) {
  this.warn('Security event', {
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} meta - Additional metadata
 */
logger.performance = function(operation, duration, meta = {}) {
  this.info('Performance metric', {
    operation,
    duration,
    unit: 'ms',
    ...meta
  });
};

/**
 * Log audit event
 * @param {string} action - Audit action
 * @param {Object} details - Event details
 */
logger.audit = function(action, details = {}) {
  this.info('Audit event', {
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join('logs', 'exceptions.log'),
    format: structuredFormat
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join('logs', 'rejections.log'),
    format: structuredFormat
  })
);

module.exports = logger;
