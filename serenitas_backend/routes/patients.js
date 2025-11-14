/**
 * Patient Routes
 * 
 * Handles patient-related HTTP endpoints with role-based access control.
 * Implements RLS-aware queries through the patient service layer.
 * 
 * Requirements: 4.1, 6.6, 6.7
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { requireRole, requireAssignedPatient } = require('../middleware/rbac');
const patientService = require('../services/patientService');
const logger = require('../utils/logger');
const { constants } = require('../config');

const router = express.Router();

/**
 * GET /api/patients
 * Get all patients (filtered by role via RLS)
 * Access: admin, secretary, doctor
 */
router.get(
  '/',
  auth,
  requireRole(constants.ROLES.ADMIN, constants.ROLES.SECRETARY, constants.ROLES.DOCTOR),
  async (req, res) => {
    try {
      const filters = {
        doctorId: req.query.doctorId,
        search: req.query.search
      };

      const patients = await patientService.getAllPatients(filters, req.user.id);

      res.json({
        success: true,
        data: patients,
        message: 'Pacientes recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get all patients error', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar pacientes',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/patients/:id
 * Get patient by ID
 * Access: admin, secretary, doctor (if assigned), patient (own data)
 */
router.get(
  '/:id',
  auth,
  requireAssignedPatient('id'),
  [
    param('id').isUUID().withMessage('ID do paciente inválido')
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

      const patient = await patientService.getPatientProfile(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: patient,
        message: 'Paciente recuperado com sucesso'
      });
    } catch (error) {
      logger.error('Get patient by ID error', {
        patientId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: statusCode === 404 
          ? constants.ERROR_CODES.BUSINESS_PATIENT_NOT_FOUND 
          : constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * POST /api/patients
 * Create new patient
 * Access: secretary, admin
 */
router.post(
  '/',
  auth,
  requireRole(constants.ROLES.SECRETARY, constants.ROLES.ADMIN),
  [
    body('user_id').isUUID().withMessage('ID do usuário inválido'),
    body('doctor_id').optional().isUUID().withMessage('ID do médico inválido'),
    body('date_of_birth').optional().isISO8601().withMessage('Data de nascimento inválida'),
    body('cpf').optional().isString().withMessage('CPF inválido'),
    body('blood_type').optional().isString().withMessage('Tipo sanguíneo inválido'),
    body('height').optional().isFloat({ min: 0 }).withMessage('Altura inválida'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('Peso inválido'),
    body('emergency_contact_name').optional().isString().withMessage('Nome do contato de emergência inválido'),
    body('emergency_contact_phone').optional().isString().withMessage('Telefone do contato de emergência inválido')
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

      const newPatient = await patientService.createPatient(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: newPatient,
        message: 'Paciente criado com sucesso'
      });
    } catch (error) {
      logger.error('Create patient error', {
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('já existe') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
      });
    }
  }
);

/**
 * PUT /api/patients/:id
 * Update patient profile
 * Access: admin, secretary, patient (own data)
 */
router.put(
  '/:id',
  auth,
  requireAssignedPatient('id'),
  [
    param('id').isUUID().withMessage('ID do paciente inválido'),
    body('date_of_birth').optional().isISO8601().withMessage('Data de nascimento inválida'),
    body('cpf').optional().isString().withMessage('CPF inválido'),
    body('blood_type').optional().isString().withMessage('Tipo sanguíneo inválido'),
    body('height').optional().isFloat({ min: 0 }).withMessage('Altura inválida'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('Peso inválido'),
    body('health_status').optional().isString().withMessage('Status de saúde inválido')
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

      const updatedPatient = await patientService.updatePatientProfile(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedPatient,
        message: 'Paciente atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update patient error', {
        patientId: req.params.id,
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
 * PUT /api/patients/:id/health-status
 * Update patient health status
 * Access: patient (own data), doctor (assigned patients), admin
 */
router.put(
  '/:id/health-status',
  auth,
  requireAssignedPatient('id'),
  [
    param('id').isUUID().withMessage('ID do paciente inválido'),
    body('health_status').notEmpty().isString().withMessage('Status de saúde é obrigatório')
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

      const updatedPatient = await patientService.updateHealthStatus(
        req.params.id,
        req.body.health_status,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedPatient,
        message: 'Status de saúde atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update health status error', {
        patientId: req.params.id,
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
 * GET /api/patients/:id/doctor
 * Get patient's assigned doctor
 * Access: patient (own data), doctor (assigned patients), admin, secretary
 */
router.get(
  '/:id/doctor',
  auth,
  requireAssignedPatient('id'),
  [
    param('id').isUUID().withMessage('ID do paciente inválido')
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

      const doctor = await patientService.getPatientDoctor(req.params.id);

      res.json({
        success: true,
        data: doctor,
        message: doctor 
          ? 'Médico recuperado com sucesso' 
          : 'Nenhum médico atribuído a este paciente'
      });
    } catch (error) {
      logger.error('Get patient doctor error', {
        patientId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

module.exports = router; 