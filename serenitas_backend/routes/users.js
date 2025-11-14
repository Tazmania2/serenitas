const express = require('express');
const { body, param, validationResult } = require('express-validator');
const userService = require('../services/userService');
const auditService = require('../services/auditService');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/users
 * Get all users (admin/secretary only)
 * Requirements: 7.2
 */
router.get('/',
  auth,
  requireRole('admin', 'secretary'),
  async (req, res, next) => {
    try {
      logger.info('Get all users request', { userId: req.user.id, role: req.user.role });

      const users = await userService.getAllUsers();

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'USERS_LIST_ACCESSED',
        resourceType: 'user',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: users,
        message: 'Usuários recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get all users error', { error: error.message, userId: req.user.id });
      next(error);
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID
 * Requirements: 7.2
 */
router.get('/:id',
  auth,
  [
    param('id')
      .isUUID()
      .withMessage('ID de usuário inválido')
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

      const { id } = req.params;

      logger.info('Get user by ID request', { userId: req.user.id, targetUserId: id });

      // Check authorization: users can view their own profile, or admin/secretary can view any
      if (req.user.id !== id && !['admin', 'secretary'].includes(req.user.role)) {
        logger.warn('Unauthorized user access attempt', {
          userId: req.user.id,
          targetUserId: id
        });
        return res.status(403).json({
          success: false,
          message: 'Acesso negado',
          error: 'Você não tem permissão para visualizar este usuário'
        });
      }

      const user = await userService.getUserById(id);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'USER_ACCESSED',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: user,
        message: 'Usuário recuperado com sucesso'
      });
    } catch (error) {
      logger.error('Get user by ID error', {
        error: error.message,
        userId: req.user.id,
        targetUserId: req.params.id
      });
      next(error);
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user profile
 * Requirements: 7.3
 */
router.put('/:id',
  auth,
  [
    param('id')
      .isUUID()
      .withMessage('ID de usuário inválido'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome deve ter entre 2 e 255 caracteres'),
    body('phone')
      .optional()
      .matches(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/)
      .withMessage('Formato de telefone inválido. Use (XX) XXXXX-XXXX'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'secretary', 'admin'])
      .withMessage('Tipo de usuário inválido')
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

      const { id } = req.params;
      const updateData = req.body;

      logger.info('Update user request', { userId: req.user.id, targetUserId: id });

      // Check authorization: users can update their own profile, or admin/secretary can update any
      if (req.user.id !== id && !['admin', 'secretary'].includes(req.user.role)) {
        logger.warn('Unauthorized user update attempt', {
          userId: req.user.id,
          targetUserId: id
        });
        return res.status(403).json({
          success: false,
          message: 'Acesso negado',
          error: 'Você não tem permissão para atualizar este usuário'
        });
      }

      // Only admin can change roles
      if (updateData.role && req.user.role !== 'admin') {
        logger.warn('Unauthorized role change attempt', {
          userId: req.user.id,
          targetUserId: id
        });
        return res.status(403).json({
          success: false,
          message: 'Acesso negado',
          error: 'Apenas administradores podem alterar funções de usuário'
        });
      }

      const updatedUser = await userService.updateUser(id, updateData);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'USER_UPDATED',
        resourceType: 'user',
        resourceId: id,
        details: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('User updated successfully', { userId: req.user.id, targetUserId: id });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Usuário atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update user error', {
        error: error.message,
        userId: req.user.id,
        targetUserId: req.params.id
      });
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user account (admin only)
 * Requirements: 7.4
 */
router.delete('/:id',
  auth,
  requireRole('admin'),
  [
    param('id')
      .isUUID()
      .withMessage('ID de usuário inválido')
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

      const { id } = req.params;

      logger.info('Delete user request', { userId: req.user.id, targetUserId: id });

      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Operação inválida',
          error: 'Você não pode excluir sua própria conta'
        });
      }

      await userService.deleteUser(id);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'USER_DELETED',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('User deleted successfully', { userId: req.user.id, targetUserId: id });

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      logger.error('Delete user error', {
        error: error.message,
        userId: req.user.id,
        targetUserId: req.params.id
      });
      next(error);
    }
  }
);

module.exports = router; 