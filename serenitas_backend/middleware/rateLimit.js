/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse and DoS attacks.
 * Implements different rate limits for general API and authentication endpoints.
 * 
 * Requirements: 12.2, 12.3
 */

const rateLimit = require('express-rate-limit');
const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Custom handler for rate limit exceeded
 * Logs the event and returns Portuguese error message
 */
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  return res.status(429).json({
    success: false,
    message: 'Muitas requisições. Tente novamente mais tarde.',
    error: 'Limite de requisições excedido',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(constants.RATE_LIMIT.WINDOW_MS / 1000 / 60) // minutes
  });
};

/**
 * Custom handler for auth rate limit exceeded
 */
const authRateLimitHandler = (req, res) => {
  logger.security('Auth rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    email: req.body?.email,
    userAgent: req.get('user-agent')
  });

  return res.status(429).json({
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: 'Limite de tentativas de autenticação excedido',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(constants.RATE_LIMIT.WINDOW_MS / 1000 / 60) // minutes
  });
};

/**
 * General API rate limiter
 * Applies to all API endpoints
 * 
 * Default: 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.WINDOW_MS,
  max: constants.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health' || req.path === '/api/health';
  },
  keyGenerator: (req) => {
    // Use IP address as key
    // In production with proxy, use req.headers['x-forwarded-for'] or req.headers['x-real-ip']
    return req.ip;
  }
});

/**
 * Authentication rate limiter
 * Stricter limits for login and registration endpoints
 * 
 * Default: 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.WINDOW_MS,
  max: constants.RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: authRateLimitHandler,
  keyGenerator: (req) => {
    // Use combination of IP and email for more granular control
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Very strict limits for password reset, account deletion, etc.
 * 
 * Default: 3 requests per hour per IP
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em 1 hora.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.id
    });

    return res.status(429).json({
      success: false,
      message: 'Muitas tentativas. Tente novamente em 1 hora.',
      error: 'Limite de requisições excedido',
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      retryAfter: 60 // minutes
    });
  }
});

/**
 * File upload rate limiter
 * Limits file upload requests
 * 
 * Default: 10 uploads per 15 minutes per user
 */
const uploadLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.WINDOW_MS,
  max: 10,
  message: {
    success: false,
    message: 'Muitos uploads. Tente novamente em 15 minutos.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id
    });

    return res.status(429).json({
      success: false,
      message: 'Muitos uploads. Tente novamente em 15 minutos.',
      error: 'Limite de uploads excedido',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(constants.RATE_LIMIT.WINDOW_MS / 1000 / 60)
    });
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
});

/**
 * Create custom rate limiter with specific options
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message in Portuguese
 * @returns {Function} Express middleware
 */
function createRateLimiter(options) {
  const {
    windowMs = constants.RATE_LIMIT.WINDOW_MS,
    max = constants.RATE_LIMIT.MAX_REQUESTS,
    message = 'Muitas requisições. Tente novamente mais tarde.'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
  });
}

module.exports = {
  apiLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  createRateLimiter
};
