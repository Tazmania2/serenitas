const express = require('express');
const { query, body, validationResult } = require('express-validator');
const adminService = require('../services/adminService');
const auditService = require('../services/auditService');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/admin/stats
 * Get system statistics (admin only)
 * Requirements: 7.1
 */
router.get('/stats',
  auth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      logger.info('Get system statistics request', { userId: req.user.id });

      const stats = await adminService.getSystemStatistics();

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'SYSTEM_STATS_ACCESSED',
        resourceType: 'system',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: stats,
        message: 'Estatísticas do sistema recuperadas com sucesso'
      });
    } catch (error) {
      logger.error('Get system statistics error', { error: error.message, userId: req.user.id });
      next(error);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Query audit logs with filters (admin only)
 * Requirements: 7.8, 11.9
 */
router.get('/audit-logs',
  auth,
  requireRole('admin'),
  [
    query('userId')
      .optional()
      .isUUID()
      .withMessage('ID de usuário inválido'),
    query('action')
      .optional()
      .isString()
      .withMessage('Ação inválida'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Data inicial inválida (use formato ISO8601)'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Data final inválida (use formato ISO8601)'),
    query('resourceType')
      .optional()
      .isString()
      .withMessage('Tipo de recurso inválido'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Número da página deve ser maior que 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve estar entre 1 e 100')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros de consulta inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const filters = {
        userId: req.query.userId,
        action: req.query.action,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        resourceType: req.query.resourceType,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      logger.info('Query audit logs request', { userId: req.user.id, filters });

      const result = await adminService.queryAuditLogs(filters);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'AUDIT_LOGS_ACCESSED',
        resourceType: 'audit_log',
        details: { filters },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        message: 'Logs de auditoria recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Query audit logs error', { error: error.message, userId: req.user.id });
      next(error);
    }
  }
);

/**
 * GET /api/admin/users
 * Get all users with filters (admin only)
 * Requirements: 7.1
 */
router.get('/users',
  auth,
  requireRole('admin'),
  [
    query('role')
      .optional()
      .isIn(['patient', 'doctor', 'secretary', 'admin'])
      .withMessage('Tipo de usuário inválido'),
    query('search')
      .optional()
      .isString()
      .withMessage('Termo de busca inválido'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Número da página deve ser maior que 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve estar entre 1 e 100')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros de consulta inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const filters = {
        role: req.query.role,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      logger.info('Get all users with filters request', { userId: req.user.id, filters });

      const result = await adminService.getAllUsersWithFilters(filters);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'USERS_LIST_ACCESSED',
        resourceType: 'user',
        details: { filters },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        message: 'Usuários recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get all users with filters error', { error: error.message, userId: req.user.id });
      next(error);
    }
  }
);

/**
 * POST /api/admin/export-data
 * Export compliance data (admin only)
 * Requirements: 7.9
 */
router.post('/export-data',
  auth,
  requireRole('admin'),
  [
    body('exportType')
      .isIn(['users', 'audit_logs', 'all', 'compliance'])
      .withMessage('Tipo de exportação inválido'),
    body('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Formato inválido (use json ou csv)'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Data inicial inválida (use formato ISO8601)'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('Data final inválida (use formato ISO8601)')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de exportação inválidos',
          errors: errors.array().map(err => ({
            field: err.path,
            message: err.msg
          }))
        });
      }

      const { exportType, format = 'json', startDate, endDate } = req.body;

      logger.info('Export compliance data request', {
        userId: req.user.id,
        exportType,
        format
      });

      const exportData = await adminService.exportComplianceData({
        exportType,
        format,
        startDate,
        endDate
      });

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'DATA_EXPORT',
        resourceType: 'system',
        details: { exportType, format },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      logger.info('Compliance data exported successfully', {
        userId: req.user.id,
        exportType
      });

      // Set appropriate content type
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="export_${exportType}_${Date.now()}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="export_${exportType}_${Date.now()}.json"`);
      }

      res.json({
        success: true,
        data: exportData,
        message: 'Dados exportados com sucesso',
        exportInfo: {
          type: exportType,
          format,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Export compliance data error', {
        error: error.message,
        userId: req.user.id
      });
      next(error);
    }
  }
);

module.exports = router;
