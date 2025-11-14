/**
 * Doctor Notes Routes
 * 
 * Handles doctor notes HTTP endpoints with role-based access control.
 * Implements doctor-patient relationship validation and visibility filtering.
 * 
 * Requirements: 4.7, 5.6
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const doctorNotesService = require('../services/doctorNotesService');
const logger = require('../utils/logger');
const { constants } = require('../config');

const router = express.Router();

/**
 * GET /api/doctor-notes
 * Get all doctor notes (filtered by role via RLS)
 * Access: all authenticated users (filtered by RLS)
 */
router.get(
  '/',
  auth,
  [
    query('patientId').optional().isUUID().withMessage('ID do paciente inválido'),
    query('doctorId').optional().isUUID().withMessage('ID do médico inválido')
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
        doctorId: req.query.doctorId
      };

      const notes = await doctorNotesService.getAllDoctorNotes(
        filters,
        req.user.id
      );

      res.json({
        success: true,
        data: notes,
        message: 'Notas médicas recuperadas com sucesso'
      });
    } catch (error) {
      logger.error('Get all doctor notes error', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar notas médicas',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/doctor-notes/:id
 * Get doctor note by ID
 * Access: patient (visible notes only), doctor (assigned patients), admin
 */
router.get(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID da nota inválido')
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

      const note = await doctorNotesService.getDoctorNoteById(
        req.params.id,
        req.user.id
      );

      // If user is patient, check visibility
      if (req.user.role === constants.ROLES.PATIENT && !note.is_visible_to_patient) {
        logger.warn('Patient attempted to access hidden note', {
          noteId: req.params.id,
          userId: req.user.id
        });
        
        return res.status(403).json({
          success: false,
          message: 'Acesso negado',
          error: 'Esta nota não está visível para você',
          code: constants.ERROR_CODES.AUTHZ_FORBIDDEN
        });
      }

      res.json({
        success: true,
        data: note,
        message: 'Nota médica recuperada com sucesso'
      });
    } catch (error) {
      logger.error('Get doctor note by ID error', {
        noteId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
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
 * POST /api/doctor-notes
 * Create new doctor note
 * Access: doctor only
 */
router.post(
  '/',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    body('patient_id').isUUID().withMessage('ID do paciente inválido'),
    body('doctor_id').isUUID().withMessage('ID do médico inválido'),
    body('appointment_id').optional().isUUID().withMessage('ID da consulta inválido'),
    body('title').optional().isString().withMessage('Título inválido'),
    body('content').notEmpty().withMessage('Conteúdo é obrigatório'),
    body('is_visible_to_patient').optional().isBoolean().withMessage('Visibilidade deve ser verdadeiro ou falso'),
    body('note_date').optional().isISO8601().withMessage('Data da nota inválida')
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

      const newNote = await doctorNotesService.writeDoctorNote(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: newNote,
        message: 'Nota médica criada com sucesso'
      });
    } catch (error) {
      logger.error('Create doctor note error', {
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
 * PUT /api/doctor-notes/:id
 * Update doctor note
 * Access: doctor only (who created it)
 */
router.put(
  '/:id',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID da nota inválido'),
    body('title').optional().isString().withMessage('Título inválido'),
    body('content').optional().notEmpty().withMessage('Conteúdo não pode estar vazio'),
    body('is_visible_to_patient').optional().isBoolean().withMessage('Visibilidade deve ser verdadeiro ou falso')
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

      const updatedNote = await doctorNotesService.updateDoctorNote(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedNote,
        message: 'Nota médica atualizada com sucesso'
      });
    } catch (error) {
      logger.error('Update doctor note error', {
        noteId: req.params.id,
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
 * DELETE /api/doctor-notes/:id
 * Delete doctor note
 * Access: doctor only (who created it)
 */
router.delete(
  '/:id',
  auth,
  requireRole(constants.ROLES.DOCTOR, constants.ROLES.ADMIN),
  [
    param('id').isUUID().withMessage('ID da nota inválido')
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

      await doctorNotesService.deleteDoctorNote(req.params.id, req.user.id);

      res.json({
        success: true,
        data: null,
        message: 'Nota médica excluída com sucesso'
      });
    } catch (error) {
      logger.error('Delete doctor note error', {
        noteId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
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
 * GET /api/doctor-notes/patient/:patientId
 * Get notes for a specific patient
 * Access: patient (visible notes only), doctor (assigned patients, all notes), admin (all notes)
 */
router.get(
  '/patient/:patientId',
  auth,
  [
    param('patientId').isUUID().withMessage('ID do paciente inválido')
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

      // Determine if hidden notes should be included
      const includeHidden = req.user.role === constants.ROLES.DOCTOR || 
                           req.user.role === constants.ROLES.ADMIN;

      const notes = await doctorNotesService.getNotesForPatient(
        req.params.patientId,
        includeHidden,
        req.user.id
      );

      res.json({
        success: true,
        data: notes,
        message: 'Notas médicas recuperadas com sucesso'
      });
    } catch (error) {
      logger.error('Get notes for patient error', {
        patientId: req.params.patientId,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar notas médicas',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

module.exports = router;
