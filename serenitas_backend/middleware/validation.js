const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['patient', 'doctor', 'secretary'])
    .withMessage('Role must be patient, doctor, or secretary'),
  
  body('cpf')
    .optional()
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters')
    .matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
    .withMessage('Please provide a valid CPF format'),
  
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Patient data validation
const validatePatientData = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),
  
  handleValidationErrors
];

// Appointment validation
const validateAppointment = [
  body('patientId')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
  
  body('doctorId')
    .isMongoId()
    .withMessage('Valid doctor ID is required'),
  
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid appointment date'),
  
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  
  body('type')
    .isIn(['consultation', 'follow-up', 'emergency', 'evaluation'])
    .withMessage('Appointment type must be consultation, follow-up, emergency, or evaluation'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors
];

// Prescription validation
const validatePrescription = [
  body('patientId')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
  
  body('doctorId')
    .isMongoId()
    .withMessage('Valid doctor ID is required'),
  
  body('medication')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Medication name must be between 2 and 100 characters'),
  
  body('dosage')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Dosage must be between 1 and 50 characters'),
  
  body('instructions')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Instructions must be between 5 and 500 characters'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  
  handleValidationErrors
];

// Exam validation
const validateExam = [
  body('patientId')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
  
  body('doctorId')
    .isMongoId()
    .withMessage('Valid doctor ID is required'),
  
  body('type')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Exam type must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid exam date'),
  
  body('results')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Results must be less than 1000 characters'),
  
  handleValidationErrors
];

// Mood entry validation
const validateMoodEntry = [
  body('patientId')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
  
  body('mood')
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood must be a number between 1 and 10'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  body('activities')
    .optional()
    .isArray()
    .withMessage('Activities must be an array'),
  
  body('activities.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each activity must be less than 50 characters'),
  
  handleValidationErrors
];

// ID validation
const validateId = [
  body('id')
    .isMongoId()
    .withMessage('Valid ID is required'),
  
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
  validateId,
  handleValidationErrors
}; 