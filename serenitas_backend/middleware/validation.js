/**
 * Input Validation Middleware
 * 
 * Express-validator based validation with Brazilian-specific validators.
 * Returns validation errors in Portuguese.
 * 
 * Requirements: 12.4, 13.6, 13.10
 */

const { body, param, query, validationResult } = require('express-validator');
const { validateCPF, validatePhone, validatePassword } = require('../utils/validators');
const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Handle validation errors
 * Returns errors in Portuguese with consistent format
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      campo: error.path,
      mensagem: error.msg,
      valor: error.value
    }));

    logger.warn('Validation errors', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors: formattedErrors,
      code: constants.ERROR_CODES.VALIDATION_REQUIRED_FIELD
    });
  }
  
  next();
};

/**
 * Custom validator for CPF
 */
const cpfValidator = (value) => {
  if (!value) return true; // Optional field
  if (!validateCPF(value)) {
    throw new Error('CPF inválido');
  }
  return true;
};

/**
 * Custom validator for phone
 */
const phoneValidator = (value) => {
  if (!value) return true; // Optional field
  if (!validatePhone(value)) {
    throw new Error('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
  }
  return true;
};

/**
 * Custom validator for password strength
 */
const passwordValidator = (value) => {
  const result = validatePassword(value);
  if (!result.isValid) {
    throw new Error(result.errors.join(', '));
  }
  return true;
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome deve ter entre 2 e 255 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
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
    .custom(passwordValidator),
  
  body('phone')
    .optional()
    .custom(phoneValidator),
  
  body('role')
    .optional()
    .isIn(Object.values(constants.ROLES))
    .withMessage(`Função deve ser: ${Object.values(constants.ROLES).join(', ')}`),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
];

// Patient data validation
const validatePatientData = [
  body('cpf')
    .optional()
    .custom(cpfValidator),
  
  body('phone')
    .optional()
    .custom(phoneValidator),
  
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida. Use formato ISO8601'),
  
  body('blood_type')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Tipo sanguíneo inválido'),
  
  body('height')
    .optional()
    .isFloat({ min: 0, max: 3 })
    .withMessage('Altura deve ser um número entre 0 e 3 metros'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Peso deve ser um número entre 0 e 500 kg'),
  
  body('emergency_contact_phone')
    .optional()
    .custom(phoneValidator),
  
  handleValidationErrors
];

// Appointment validation
const validateAppointment = [
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
    .withMessage('Data da consulta inválida. Use formato YYYY-MM-DD'),
  
  body('appointment_time')
    .notEmpty()
    .withMessage('Horário da consulta é obrigatório')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Horário inválido. Use formato HH:MM'),
  
  body('type')
    .optional()
    .isIn(constants.APPOINTMENT.TYPES)
    .withMessage(`Tipo deve ser: ${constants.APPOINTMENT.TYPES.join(', ')}`),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duração deve ser entre 15 e 240 minutos'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notas devem ter no máximo 1000 caracteres'),
  
  handleValidationErrors
];

// Prescription validation
const validatePrescription = [
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
  
  body('duration_days')
    .notEmpty()
    .withMessage('Duração é obrigatória')
    .isInt({ min: 1, max: constants.PRESCRIPTION.MAX_DURATION_DAYS })
    .withMessage(`Duração deve ser entre 1 e ${constants.PRESCRIPTION.MAX_DURATION_DAYS} dias`),
  
  body('instructions')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Instruções devem ter no máximo 1000 caracteres'),
  
  body('medications')
    .isArray({ min: 1 })
    .withMessage('Pelo menos um medicamento é obrigatório'),
  
  body('medications.*.name')
    .trim()
    .notEmpty()
    .withMessage('Nome do medicamento é obrigatório')
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome do medicamento deve ter entre 2 e 255 caracteres'),
  
  body('medications.*.dosage')
    .trim()
    .notEmpty()
    .withMessage('Dosagem é obrigatória')
    .isLength({ max: 100 })
    .withMessage('Dosagem deve ter no máximo 100 caracteres'),
  
  body('medications.*.frequency')
    .trim()
    .notEmpty()
    .withMessage('Frequência é obrigatória')
    .isLength({ max: 100 })
    .withMessage('Frequência deve ter no máximo 100 caracteres'),
  
  body('medications.*.quantity')
    .notEmpty()
    .withMessage('Quantidade é obrigatória')
    .isInt({ min: 1 })
    .withMessage('Quantidade deve ser um número inteiro positivo'),
  
  handleValidationErrors
];

// Exam validation
const validateExam = [
  body('patient_id')
    .notEmpty()
    .withMessage('ID do paciente é obrigatório')
    .isUUID()
    .withMessage('ID do paciente inválido'),
  
  body('exam_type')
    .trim()
    .notEmpty()
    .withMessage('Tipo de exame é obrigatório')
    .isLength({ min: 2, max: 255 })
    .withMessage('Tipo de exame deve ter entre 2 e 255 caracteres'),
  
  body('exam_name')
    .trim()
    .notEmpty()
    .withMessage('Nome do exame é obrigatório')
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome do exame deve ter entre 2 e 255 caracteres'),
  
  body('exam_date')
    .optional()
    .isDate()
    .withMessage('Data do exame inválida. Use formato YYYY-MM-DD'),
  
  body('results')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Resultados devem ter no máximo 5000 caracteres'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notas devem ter no máximo 1000 caracteres'),
  
  handleValidationErrors
];

// Mood entry validation
const validateMoodEntry = [
  body('patient_id')
    .notEmpty()
    .withMessage('ID do paciente é obrigatório')
    .isUUID()
    .withMessage('ID do paciente inválido'),
  
  body('mood_level')
    .notEmpty()
    .withMessage('Nível de humor é obrigatório')
    .isInt({ min: constants.MOOD.MIN_LEVEL, max: constants.MOOD.MAX_LEVEL })
    .withMessage(`Nível de humor deve ser entre ${constants.MOOD.MIN_LEVEL} e ${constants.MOOD.MAX_LEVEL}`),
  
  body('stress_level')
    .optional()
    .isInt({ min: constants.MOOD.MIN_LEVEL, max: constants.MOOD.MAX_LEVEL })
    .withMessage(`Nível de estresse deve ser entre ${constants.MOOD.MIN_LEVEL} e ${constants.MOOD.MAX_LEVEL}`),
  
  body('anxiety_level')
    .optional()
    .isInt({ min: constants.MOOD.MIN_LEVEL, max: constants.MOOD.MAX_LEVEL })
    .withMessage(`Nível de ansiedade deve ser entre ${constants.MOOD.MIN_LEVEL} e ${constants.MOOD.MAX_LEVEL}`),
  
  body('depression_level')
    .optional()
    .isInt({ min: constants.MOOD.MIN_LEVEL, max: constants.MOOD.MAX_LEVEL })
    .withMessage(`Nível de depressão deve ser entre ${constants.MOOD.MIN_LEVEL} e ${constants.MOOD.MAX_LEVEL}`),
  
  body('sleep_hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Horas de sono devem ser entre 0 e 24'),
  
  body('exercise_minutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minutos de exercício devem ser um número positivo'),
  
  body('social_interaction')
    .optional()
    .isIn(constants.MOOD.SOCIAL_INTERACTION_LEVELS)
    .withMessage(`Interação social deve ser: ${constants.MOOD.SOCIAL_INTERACTION_LEVELS.join(', ')}`),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notas devem ter no máximo 1000 caracteres'),
  
  body('activities')
    .optional()
    .isArray()
    .withMessage('Atividades devem ser um array'),
  
  handleValidationErrors
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .custom(passwordValidator),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('resetToken')
    .notEmpty()
    .withMessage('Token de redefinição é obrigatório'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .custom(passwordValidator),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePatientData,
  validateAppointment,
  validatePrescription,
  validateExam,
  validateMoodEntry,
  validateUUID,
  validatePasswordChange,
  validatePasswordReset,
  handleValidationErrors,
  // Export custom validators for reuse
  cpfValidator,
  phoneValidator,
  passwordValidator
}; 