const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const { body, query, validationResult } = require('express-validator');
const appointmentService = require('../services/appointmentService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Validation middleware for appointment creation
 */
const validateAppointmentCreate = [
  body('patient_id')
    .notEmpty()
    .withMessage('ID do paciente é obrigatório')
    .isUUID()
    .withMessage('ID do paciente inválido'),
  body('doctor_id')
    .notEmpty()
    .withMessage('ID do médico é obrigatório')
    .isUUID()
    .withMessage('ID do médico inválido'),
  body('appointment_date')
    .notEmpty()
    .withMessage('Data da consulta é obrigatória')
    .isDate()
    .withMessage('Formato de data inválido (use YYYY-MM-DD)'),
  body('appointment_time')
    .notEmpty()
    .withMessage('Horário da consulta é obrigatório')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de horário inválido (use HH:MM)'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duração deve estar entre 15 e 240 minutos'),
  body('type')
    .optional()
    .isIn(['consultation', 'follow-up', 'emergency'])
    .withMessage('Tipo inválido'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notas devem ser texto')
];

/**
 * Validation middleware for appointment update
 */
const validateAppointmentUpdate = [
  body('appointment_date')
    .optional()
    .isDate()
    .withMessage('Formato de data inválido (use YYYY-MM-DD)'),
  body('appointment_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de horário inválido (use HH:MM)'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duração deve estar entre 15 e 240 minutos'),
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Status inválido'),
  body('type')
    .optional()
    .isIn(['consultation', 'follow-up', 'emergency'])
    .withMessage('Tipo inválido')
];

/**
 * GET /api/appointments
 * Get appointments filtered by role
 * Access: All authenticated users (filtered by role)
 * Requirements: 5.9, 6.2
 */
router.get('/', auth, async (req, res, next) => {
  try {
    logger.info('GET /api/appointments', { 
      userId: req.user.id, 
      role: req.user.role,
      query: req.query
    });

    const filters = {
      date: req.query.date,
      status: req.query.status,
      doctorId: req.query.doctorId,
      patientId: req.query.patientId
    };

    const appointments = await appointmentService.getAppointments(req.user, filters);

    res.json({
      success: true,
      data: appointments,
      message: 'Consultas recuperadas com sucesso'
    });
  } catch (error) {
    logger.error('Error in GET /api/appointments', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/appointments/:id
 * Get appointment by ID
 * Access: Patient (own), Doctor (own patients), Secretary, Admin
 * Requirements: 5.9, 6.2
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info('GET /api/appointments/:id', { 
      appointmentId: id, 
      userId: req.user.id 
    });

    const appointment = await appointmentService.getAppointmentById(id, req.user);

    res.json({
      success: true,
      data: appointment,
      message: 'Consulta recuperada com sucesso'
    });
  } catch (error) {
    if (error.message === 'Consulta não encontrada') {
      return res.status(404).json({
        success: false,
        data: null,
        message: error.message,
        error: error.message
      });
    }
    if (error.message.includes('Acesso negado')) {
      return res.status(403).json({
        success: false,
        data: null,
        message: error.message,
        error: error.message
      });
    }
    logger.error('Error in GET /api/appointments/:id', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/appointments
 * Create new appointment
 * Access: Secretary, Admin
 * Requirements: 6.2, 6.9
 */
router.post(
  '/',
  auth,
  requireRole('secretary', 'admin'),
  validateAppointmentCreate,
  async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Erro de validação',
          error: errors.array()[0].msg,
          errors: errors.array()
        });
      }

      logger.info('POST /api/appointments', { 
        userId: req.user.id, 
        body: req.body 
      });

      const appointment = await appointmentService.createAppointment(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Consulta criada com sucesso'
      });
    } catch (error) {
      if (error.message.includes('não encontrado') || 
          error.message.includes('não disponível') ||
          error.message.includes('faltando')) {
        return res.status(400).json({
          success: false,
          data: null,
          message: error.message,
          error: error.message
        });
      }
      logger.error('Error in POST /api/appointments', { error: error.message });
      next(error);
    }
  }
);

/**
 * PUT /api/appointments/:id
 * Update appointment
 * Access: Doctor (own patients), Secretary, Admin
 * Requirements: 6.3
 */
router.put(
  '/:id',
  auth,
  requireRole('doctor', 'secretary', 'admin'),
  validateAppointmentUpdate,
  async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Erro de validação',
          error: errors.array()[0].msg,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      logger.info('PUT /api/appointments/:id', { 
        appointmentId: id, 
        userId: req.user.id,
        body: req.body
      });

      const appointment = await appointmentService.updateAppointment(
        id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: appointment,
        message: 'Consulta atualizada com sucesso'
      });
    } catch (error) {
      if (error.message === 'Consulta não encontrada') {
        return res.status(404).json({
          success: false,
          data: null,
          message: error.message,
          error: error.message
        });
      }
      if (error.message.includes('não disponível')) {
        return res.status(400).json({
          success: false,
          data: null,
          message: error.message,
          error: error.message
        });
      }
      logger.error('Error in PUT /api/appointments/:id', { error: error.message });
      next(error);
    }
  }
);

/**
 * DELETE /api/appointments/:id
 * Delete appointment
 * Access: Secretary, Admin
 * Requirements: 6.4
 */
router.delete(
  '/:id',
  auth,
  requireRole('secretary', 'admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;

      logger.info('DELETE /api/appointments/:id', { 
        appointmentId: id, 
        userId: req.user.id 
      });

      // If cancellation reason provided, cancel instead of delete
      if (cancellation_reason) {
        const appointment = await appointmentService.cancelAppointment(
          id,
          cancellation_reason,
          req.user.id
        );

        return res.json({
          success: true,
          data: appointment,
          message: 'Consulta cancelada com sucesso'
        });
      }

      // Otherwise, delete permanently
      await appointmentService.deleteAppointment(id, req.user.id);

      res.json({
        success: true,
        data: null,
        message: 'Consulta excluída com sucesso'
      });
    } catch (error) {
      if (error.message === 'Consulta não encontrada') {
        return res.status(404).json({
          success: false,
          data: null,
          message: error.message,
          error: error.message
        });
      }
      logger.error('Error in DELETE /api/appointments/:id', { error: error.message });
      next(error);
    }
  }
);

module.exports = router;
