/**
 * Exam Routes
 * 
 * Handles exam-related HTTP endpoints with file upload support.
 * Implements role-based access control and file validation.
 * 
 * Requirements: 4.4, 4.5, 5.8
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRole, requireAssignedPatient } = require('../middleware/rbac');
const examService = require('../services/examService');
const logger = require('../utils/logger');
const { constants } = require('../config');

const router = express.Router();

// Note: File upload middleware (multer) will be added when multer is installed
// For now, we'll handle file uploads through base64 or add multer later

/**
 * GET /api/exams
 * Get all exams (filtered by role via RLS)
 * Access: all authenticated users (filtered by RLS)
 */
router.get(
  '/',
  auth,
  [
    query('patientId').optional().isUUID().withMessage('ID do paciente inválido'),
    query('doctorId').optional().isUUID().withMessage('ID do médico inválido'),
    query('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido')
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

      const exams = await examService.getAllExams(filters, req.user.id);

      res.json({
        success: true,
        data: exams,
        message: 'Exames recuperados com sucesso'
      });
    } catch (error) {
      logger.error('Get all exams error', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar exames',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
      });
    }
  }
);

/**
 * GET /api/exams/:id
 * Get exam by ID with signed URL for file access
 * Access: patient (own), doctor (assigned patients), admin
 */
router.get(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID do exame inválido')
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

      const exam = await examService.getExamById(req.params.id, req.user.id);

      res.json({
        success: true,
        data: exam,
        message: 'Exame recuperado com sucesso'
      });
    } catch (error) {
      logger.error('Get exam by ID error', {
        examId: req.params.id,
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
 * POST /api/exams
 * Create new exam (with optional file upload)
 * Access: patient (own data), doctor, admin
 * 
 * Note: File upload will be handled via multipart/form-data when multer is added
 * For now, accepts exam metadata only
 */
router.post(
  '/',
  auth,
  [
    body('patient_id').isUUID().withMessage('ID do paciente inválido'),
    body('doctor_id').optional().isUUID().withMessage('ID do médico inválido'),
    body('exam_type').notEmpty().withMessage('Tipo de exame é obrigatório'),
    body('exam_name').notEmpty().withMessage('Nome do exame é obrigatório'),
    body('exam_date').optional().isISO8601().withMessage('Data do exame inválida'),
    body('results').optional().isString().withMessage('Resultados inválidos'),
    body('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido'),
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

      // TODO: Handle file upload when multer is added
      // For now, create exam without file

      const newExam = await examService.createExam(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: newExam,
        message: 'Exame criado com sucesso'
      });
    } catch (error) {
      logger.error('Create exam error', {
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
 * PUT /api/exams/:id
 * Update exam
 * Access: patient (own data), doctor (assigned patients), admin
 */
router.put(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID do exame inválido'),
    body('exam_type').optional().isString().withMessage('Tipo de exame inválido'),
    body('exam_name').optional().isString().withMessage('Nome do exame inválido'),
    body('results').optional().isString().withMessage('Resultados inválidos'),
    body('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Status inválido'),
    body('notes').optional().isString().withMessage('Notas inválidas'),
    body('doctor_notes').optional().isString().withMessage('Notas do médico inválidas')
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

      const updatedExam = await examService.updateExam(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: updatedExam,
        message: 'Exame atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Update exam error', {
        examId: req.params.id,
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
 * DELETE /api/exams/:id
 * Delete exam and associated file
 * Access: patient (own data), admin
 */
router.delete(
  '/:id',
  auth,
  [
    param('id').isUUID().withMessage('ID do exame inválido')
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

      await examService.deleteExam(req.params.id, req.user.id);

      res.json({
        success: true,
        data: null,
        message: 'Exame excluído com sucesso'
      });
    } catch (error) {
      logger.error('Delete exam error', {
        examId: req.params.id,
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
 * POST /api/exams/:id/upload
 * Upload file for existing exam
 * Access: patient (own data), doctor (assigned patients), admin
 * 
 * Note: This endpoint will be fully implemented when multer is added
 */
router.post(
  '/:id/upload',
  auth,
  [
    param('id').isUUID().withMessage('ID do exame inválido')
  ],
  async (req, res) => {
    try {
      // TODO: Implement file upload with multer
      // For now, return not implemented

      res.status(501).json({
        success: false,
        message: 'Upload de arquivo será implementado em breve',
        error: 'Funcionalidade não implementada',
        code: 'NOT_IMPLEMENTED'
      });
    } catch (error) {
      logger.error('Upload exam file error', {
        examId: req.params.id,
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload do arquivo',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_STORAGE_ERROR
      });
    }
  }
);

module.exports = router; 