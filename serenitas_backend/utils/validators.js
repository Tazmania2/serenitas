/**
 * Validation Utility Functions
 * 
 * Brazilian-specific validation functions for CPF, phone numbers, etc.
 * 
 * Requirements: 13.6
 */

const { constants } = require('../config');

/**
 * Validate CPF (Cadastro de Pessoas Físicas)
 * Brazilian tax ID validation using the official algorithm
 * 
 * @param {string} cpf - CPF to validate (with or without formatting)
 * @returns {boolean} True if CPF is valid
 */
function validateCPF(cpf) {
  if (!cpf) return false;

  // Remove formatting
  const cleaned = cpf.replace(/\D/g, '');

  // Check length
  if (cleaned.length !== 11) return false;

  // Check if all digits are the same (invalid CPF)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(9))) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Validate Brazilian phone number
 * Accepts formats: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone is valid
 */
function validatePhone(phone) {
  if (!phone) return false;

  // Remove formatting
  const cleaned = phone.replace(/\D/g, '');

  // Check length (10 for landline, 11 for mobile)
  if (cleaned.length !== 10 && cleaned.length !== 11) return false;

  // Check if area code is valid (11-99)
  const areaCode = parseInt(cleaned.substring(0, 2));
  if (areaCode < 11 || areaCode > 99) return false;

  return true;
}

/**
 * Validate email address
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
function validateEmail(email) {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements from constants.PASSWORD
 * 
 * @param {string} password - Password to validate
 * @returns {Object} Object with isValid boolean and errors array
 */
function validatePassword(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Senha é obrigatória'] };
  }

  if (password.length < constants.PASSWORD.MIN_LENGTH) {
    errors.push(`Senha deve ter no mínimo ${constants.PASSWORD.MIN_LENGTH} caracteres`);
  }

  if (constants.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (constants.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (constants.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  if (constants.PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate date string
 * 
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if date is valid
 */
function validateDate(dateStr) {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validate UUID
 * 
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if UUID is valid
 */
function validateUUID(uuid) {
  if (!uuid) return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate mood level (1-5)
 * 
 * @param {number} level - Mood level to validate
 * @returns {boolean} True if level is valid
 */
function validateMoodLevel(level) {
  return Number.isInteger(level) && 
         level >= constants.MOOD.MIN_LEVEL && 
         level <= constants.MOOD.MAX_LEVEL;
}

/**
 * Validate file type
 * 
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} True if file type is allowed
 */
function validateFileType(mimeType) {
  return constants.FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Validate file size
 * 
 * @param {number} size - File size in bytes
 * @returns {boolean} True if file size is within limit
 */
function validateFileSize(size) {
  return size <= constants.FILE_UPLOAD.MAX_SIZE;
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize filename
 * Removes path traversal and dangerous characters
 * 
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename) return '';

  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

module.exports = {
  validateCPF,
  validatePhone,
  validateEmail,
  validatePassword,
  validateDate,
  validateUUID,
  validateMoodLevel,
  validateFileType,
  validateFileSize,
  sanitizeString,
  sanitizeFilename
};
