const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { auth } = require('../middleware/auth');
const authLimiter = require('../middleware/rateLimit').authLimiter;
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Requirements: 2.1, 2.2
 */
router.post('/register',
  authLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nome é obrigatório')
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome deve ter entre 2 e 255 caracteres'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email é obrigatório')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória')
      .isLength({ min: 8 })
      .withMessage('Senha deve ter no mínimo 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .withMessage('Senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais'),
    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'secretary', 'admin'])
      .withMessage('Tipo de usuário inválido'),
    body('phone')
      .optional()
      .matches(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/)
      .withMessage('Formato de telefone inválido. Use (XX) XXXXX-XXXX')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const { name, email, password, role, phone } = req.body;

      logger.info('User registration attempt', { email, role: role || 'patient' });

      // Register user
      const result = await authService.register({
        name,
        email,
        password,
        role: role || 'patient',
        phone
      });

      // Log audit trail
      await auditService.logAction({
        userId: result.user.id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: result.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('User registered successfully', { userId: result.user.id, email });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Usuário registrado com sucesso'
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message, email: req.body.email });
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 * Requirements: 2.3, 2.4
 */
router.post('/login',
  authLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email é obrigatório')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const { email, password } = req.body;

      logger.info('Login attempt', { email, ip: req.ip });

      // Login user
      const result = await authService.login(email, password);

      // Update last login
      await authService.updateLastLogin(result.user.id);

      // Log audit trail
      await auditService.logAction({
        userId: result.user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('Login successful', { userId: result.user.id, email });

      res.json({
        success: true,
        data: result,
        message: 'Login realizado com sucesso'
      });
    } catch (error) {
      logger.error('Login error', { error: error.message, email: req.body.email, ip: req.ip });
      
      // Log failed login attempt
      await auditService.logAction({
        action: 'LOGIN_FAILED',
        details: { email: req.body.email, reason: error.message },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      next(error);
    }
  }
);

/**
 * GET /api/auth/profile
 * Get current user profile
 * Requirements: 2.3
 */
router.get('/profile', auth, async (req, res, next) => {
  try {
    logger.info('Profile request', { userId: req.user.id });

    const user = await authService.getUserById(req.user.id);

    res.json({
      success: true,
      data: user,
      message: 'Perfil recuperado com sucesso'
    });
  } catch (error) {
    logger.error('Profile retrieval error', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal, server-side audit log)
 * Requirements: 2.4
 */
router.post('/logout', auth, async (req, res, next) => {
  try {
    logger.info('Logout request', { userId: req.user.id });

    // Log audit trail
    await auditService.logAction({
      userId: req.user.id,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    logger.info('Logout successful', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error('Logout error', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * Requirements: 2.4, 12.8, 12.10
 */
router.post('/change-password',
  auth,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Senha atual é obrigatória'),
    body('newPassword')
      .notEmpty()
      .withMessage('Nova senha é obrigatória')
      .isLength({ min: 8 })
      .withMessage('Nova senha deve ter no mínimo 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .withMessage('Nova senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const { currentPassword, newPassword } = req.body;

      logger.info('Password change attempt', { userId: req.user.id });

      // Change password
      await authService.changePassword(req.user.id, currentPassword, newPassword);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'PASSWORD_CHANGED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('Password changed successfully', { userId: req.user.id });

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      logger.error('Password change error', { error: error.message, userId: req.user.id });
      next(error);
    }
  }
);

module.exports = router; 