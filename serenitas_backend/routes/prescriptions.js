/**
 * Prescription Routes
 * 
 * Handles prescription-related HTTP endpoints with role-based access control.
 * Implements doctor-patient relationship validation.
 * 
 * Requirements: 4.2, 4.3, 5.4, 5.5
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const prescriptionService = require('../services/prescriptionService');
const logger = require('../utils/logger');
const { constants } = require('../config');

const router = express.Router();

/**
 * GET /api/prescriptions
 * Get all prescriptions (filtered by role via RLS)
 * Access: all authenticated users (filtered by RLS)
 */
router.get(
  '/',
  auth,
  [
    query('patientId').optional().isUUID().withMessage('ID do paciente inválido'),
    query('doctorId').optional().isUUID().withMessage('ID do médico inválido'),
    query('status').optional().isIn(['active', 'completed', 'discontinued']).withMessage('Status inválido')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const filters = {
        patientId: req.query.patientId,
        doctorId: req.query.doctorId,
        status: req.query.status
      };

      const prescriptions = await prescriptionService.getAllPrescriptions(
        filters,
        req.user.id
      );

      res.json({
        success: true,
        data: prescriptions,
        message: 'Prescrições recuperadas com sucesso'
      });
    } catch (error) {
      logger.error('Get all prescriptions error', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar prescrições',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/prescriptions/:id
 * Get prescription by ID
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID da prescrição inválido')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const prescription = await prescriptionService.getPrescriptionById(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: prescription,
        message: 'Prescrição recuperada com sucesso'
      });
    } catch (error) {
      logger.error('Get prescription by ID error', {
        prescriptionId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: statusCode === 404 
          ? constants.ERROR_CODES.BUSINESS_PRESCRIPTION_EXPIRED 
          : constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * POST /api/prescriptions
 * Create new prescription
 * Access: doctor only
 */
router.post(
  '/',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    body('patient_id').isUUID().withMessage('ID do paciente inválido'),
    body('doctor_id').isUUID().withMessage('ID do médico inválido'),
    body('duration_days').isInt({ min: 1 }).withMessage('Duração deve ser maior que 0'),
    body('instructions').optional().isString().withMessage('Instruções inválidas'),
    body('doctor_notes').optional().isString().withMessage('Notas do médico inválidas'),
    body('medications').isArray({ min: 1 }).withMessage('Pelo menos um medicamento é obrigatório'),
    body('medications.*.name').notEmpty().withMessage('Nome do medicamento é obrigatório'),
    body('medications.*.dosage').notEmpty().withMessage('Dosagem é obrigatória'),
    body('medications.*.frequency').notEmpty().withMessage('Frequência é obrigatória'),
    body('medications.*.quantity').isInt({ min: 1 }).withMessage('Quantidade deve ser maior que 0')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const newPrescription = await prescriptionService.createPrescription(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: newPrescription,
        message: 'Prescrição criada com sucesso'
      });
    } catch (error) {
      logger.error('Create prescription error', {
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não autorizado') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: statusCode === 403
          ? constants.ERROR_CODES.AUTHZ_DOCTOR_NOT_ASSIGNED
          : constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
      });
    }
  }
);

/**
 * PUT /api/prescriptions/:id
 * Update prescription
 * Access: doctor only (who created it)
 */
router.put(
  '/:id',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID da prescrição inválido'),
    body('duration_days').optional().isInt({ min: 1 }).withMessage('Duração deve ser maior que 0'),
    body('status').optional().isIn(['active', 'completed', 'discontinued']).withMessage('Status inválido'),
    body('instructions').optional().isString().withMessage('Instruções inválidas'),
    body('doctor_notes').optional().isString().withMessage('Notas do médico inválidas'),
    body('patient_notes').optional().isString().withMessage('Notas do paciente inválidas')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const updatedPrescription = await prescriptionService.updatePrescription(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedPrescription,
        message: 'Prescrição atualizada com sucesso'
      });
    } catch (error) {
      logger.error('Update prescription error', {
        prescriptionId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
      });
    }
  }
);

/**
 * PUT /api/prescriptions/:id/status
 * Update prescription status
 * Access: doctor only
 */
router.put(
  '/:id/status',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID da prescrição inválido'),
    body('status').isIn(['active', 'completed', 'discontinued']).withMessage('Status inválido')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const updatedPrescription = await prescriptionService.updatePrescriptionStatus(
        req.params.id,
        req.body.status,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedPrescription,
        message: 'Status da prescrição atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update prescription status error', {
        prescriptionId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
      });
    }
  }
);

/**
 * GET /api/prescriptions/patient/:patientId
 * Get prescriptions by patient ID
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/patient/:patientId',
  auth,
  [
    param('patientId').isUUID().withMessage('ID do paciente inválido'),
    query('status').optional().isIn(['active', 'completed', 'discontinued']).withMessage('Status inválido')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array(),
          code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
        });
      }

      const filters = {
        status: req.query.status
      };

      const prescriptions = await prescriptionService.getPrescriptionsByPatient(
        req.params.patientId,
        filters,
        req.user.id
      );

      res.json({
        success: true,
        data: prescriptions,
        message: 'Prescrições recuperadas com sucesso'
      });
    } catch (error) {
      logger.error('Get prescriptions by patient error', {
        patientId: req.params.patientId,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar prescrições',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

module.exports = router; 