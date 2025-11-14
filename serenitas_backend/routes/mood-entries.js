/**
 * Mood Entry Routes
 * 
 * Handles mood tracking HTTP endpoints with role-based access control.
 * Patients can manage their own mood entries, doctors can view assigned patients' entries.
 * 
 * Requirements: 4.8, 4.9, 5.7
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const moodService = require('../services/moodService');
const logger = require('../utils/logger');
const { constants } = require('../config');

const router = express.Router();

/**
 * GET /api/mood-entries
 * Get all mood entries (filtered by role via RLS)
 * Access: all authenticated users (filtered by RLS)
 */
router.get(
  '/',
  auth,
  [
    query('patientId').optional().isUUID().withMessage('ID do paciente inválido')
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
        patientId: req.query.patientId
      };

      const moodEntries = await moodService.getAllMoodEntries(filters, req.user.id);

      res.json({
        success: true,
        data: moodEntries,
        message: 'Registros de humor recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get all mood entries error', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar registros de humor',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/mood-entries/:id
 * Get mood entry by ID
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID do registro inválido')
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

      const moodEntry = await moodService.getMoodEntryById(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: moodEntry,
        message: 'Registro de humor recuperado com sucesso'
      });
    } catch (error) {
      logger.error('Get mood entry by ID error', {
        moodEntryId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * POST /api/mood-entries
 * Create new mood entry
 * Access: patient only (for own data)
 */
router.post(
  '/',
  auth,
  requireRole(constants.ROLES.PATIENT, constants.ROLES.ADMIN),
  [
    body('patient_id').isUUID().withMessage('ID do paciente inválido'),
    body('mood_level').isInt({ min: 1, max: 5 }).withMessage('Nível de humor deve estar entre 1 e 5'),
    body('stress_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de estresse deve estar entre 1 e 5'),
    body('anxiety_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de ansiedade deve estar entre 1 e 5'),
    body('depression_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de depressão deve estar entre 1 e 5'),
    body('sleep_hours').optional().isFloat({ min: 0, max: 24 }).withMessage('Horas de sono devem estar entre 0 e 24'),
    body('exercise_minutes').optional().isInt({ min: 0 }).withMessage('Minutos de exercício inválidos'),
    body('social_interaction').optional().isIn(['none', 'minimal', 'moderate', 'high']).withMessage('Interação social inválida'),
    body('medication_taken').optional().isBoolean().withMessage('Medicação tomada deve ser verdadeiro ou falso'),
    body('notes').optional().isString().withMessage('Notas inválidas'),
    body('activities').optional().isArray().withMessage('Atividades devem ser um array')
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

      const newMoodEntry = await moodService.createMoodEntry(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: newMoodEntry,
        message: 'Registro de humor criado com sucesso'
      });
    } catch (error) {
      logger.error('Create mood entry error', {
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
 * PUT /api/mood-entries/:id
 * Update mood entry
 * Access: patient only (own data)
 */
router.put(
  '/:id',
  auth,
  requireRole(constants.ROLES.PATIENT, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID do registro inválido'),
    body('mood_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de humor deve estar entre 1 e 5'),
    body('stress_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de estresse deve estar entre 1 e 5'),
    body('anxiety_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de ansiedade deve estar entre 1 e 5'),
    body('depression_level').optional().isInt({ min: 1, max: 5 }).withMessage('Nível de depressão deve estar entre 1 e 5'),
    body('sleep_hours').optional().isFloat({ min: 0, max: 24 }).withMessage('Horas de sono devem estar entre 0 e 24'),
    body('exercise_minutes').optional().isInt({ min: 0 }).withMessage('Minutos de exercício inválidos'),
    body('notes').optional().isString().withMessage('Notas inválidas')
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

      const updatedMoodEntry = await moodService.updateMoodEntry(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedMoodEntry,
        message: 'Registro de humor atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update mood entry error', {
        moodEntryId: req.params.id,
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
 * DELETE /api/mood-entries/:id
 * Delete mood entry
 * Access: patient only (own data)
 */
router.delete(
  '/:id',
  auth,
  requireRole(constants.ROLES.PATIENT, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID do registro inválido')
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

      await moodService.deleteMoodEntry(req.params.id, req.user.id);

      res.json({
        success: true,
        data: null,
        message: 'Registro de humor excluído com sucesso'
      });
    } catch (error) {
      logger.error('Delete mood entry error', {
        moodEntryId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/mood-entries/patient/:patientId
 * Get mood entries by patient ID with optional date range
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/patient/:patientId',
  auth,
  [
    param('patientId').isUUID().withMessage('ID do paciente inválido'),
    query('startDate').optional().isISO8601().withMessage('Data inicial inválida'),
    query('endDate').optional().isISO8601().withMessage('Data final inválida')
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

      const dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const moodEntries = await moodService.getMoodEntriesByPatient(
        req.params.patientId,
        dateRange,
        req.user.id
      );

      res.json({
        success: true,
        data: moodEntries,
        message: 'Registros de humor recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get mood entries by patient error', {
        patientId: req.params.patientId,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar registros de humor',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/mood-entries/patient/:patientId/statistics
 * Get mood statistics for a patient
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/patient/:patientId/statistics',
  auth,
  [
    param('patientId').isUUID().withMessage('ID do paciente inválido'),
    query('startDate').optional().isISO8601().withMessage('Data inicial inválida'),
    query('endDate').optional().isISO8601().withMessage('Data final inválida')
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

      const dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const statistics = await moodService.calculateMoodStatistics(
        req.params.patientId,
        dateRange
      );

      res.json({
        success: true,
        data: statistics,
        message: 'Estatísticas de humor calculadas com sucesso'
      });
    } catch (error) {
      logger.error('Get mood statistics error', {
        patientId: req.params.patientId,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao calcular estatísticas de humor',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

module.exports = router; 