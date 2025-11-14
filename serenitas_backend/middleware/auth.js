/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user to request object.
 * Handles expired and invalid tokens with appropriate error messages.
 * 
 * Requirements: 2.5
 */

const { verifyToken } = require('../services/authService');
const { supabase } = require('../config/supabase');
const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      logger.warn('Authentication failed - no token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária',
        error: 'Token não fornecido',
        code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
      });
    }

    // Remove 'Bearer ' prefix
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária',
        error: 'Token não fornecido',
        code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
      });
    }

    // Verify token
    const decoded = await verifyToken(token);

    // Fetch user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      logger.warn('Authentication failed - user not found', {
        userId: decoded.userId,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'Usuário não encontrado',
        code: constants.ERROR_CODES.AUTH_TOKEN_INVALID
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;

    const duration = Date.now() - startTime;
    logger.debug('Authentication successful', {
      userId: user.id,
      role: user.role,
      path: req.path,
      method: req.method,
      duration
    });

    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle specific JWT errors
    if (error.message.includes('expirado')) {
      logger.warn('Authentication failed - token expired', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        duration
      });
      
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'Faça login novamente',
        code: constants.ERROR_CODES.AUTH_TOKEN_EXPIRED
      });
    }

    logger.error('Authentication error', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      duration
    });

    return res.status(401).json({
      success: false,
      message: 'Autenticação falhou',
      error: error.message,
      code: constants.ERROR_CODES.AUTH_TOKEN_INVALID
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 * Useful for endpoints that work differently for authenticated vs anonymous users
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    // Try to verify token
    const decoded = await verifyToken(token);

    // Fetch user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at')
      .eq('id', decoded.userId)
      .single();

    if (!userError && user) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // If token verification fails, just continue without user
    logger.debug('Optional auth - token verification failed', {
      error: error.message,
      path: req.path
    });
    next();
  }
};

module.exports = { auth, optionalAuth }; 