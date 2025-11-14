/**
 * Application Constants
 * 
 * Centralized configuration for business rules and constants.
 * Avoids hardcoded values throughout the application.
 */

module.exports = {
  // User Roles
  ROLES: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    SECRETARY: 'secretary',
    ADMIN: 'admin'
  },

  // JWT Configuration
  JWT: {
    EXPIRATION: process.env.JWT_EXPIRE || '7d',
    ALGORITHM: 'HS256'
  },

  // Password Security
  PASSWORD: {
    MIN_LENGTH: 8,
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    AUTH_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5
  },

  // File Upload
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
    ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png']
  },

  // Appointment Configuration
  APPOINTMENT: {
    TYPES: ['consultation', 'follow-up', 'emergency'],
    STATUSES: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    DEFAULT_DURATION: 60, // minutes
    MIN_ADVANCE_HOURS: 24 // minimum hours in advance to schedule
  },

  // Prescription Configuration
  PRESCRIPTION: {
    STATUSES: ['active', 'completed', 'discontinued'],
    MAX_DURATION_DAYS: 365
  },

  // Exam Configuration
  EXAM: {
    STATUSES: ['pending', 'completed', 'cancelled']
  },

  // Mood Entry Configuration
  MOOD: {
    MIN_LEVEL: 1,
    MAX_LEVEL: 5,
    SOCIAL_INTERACTION_LEVELS: ['none', 'minimal', 'moderate', 'high']
  },

  // LGPD Configuration
  LGPD: {
    CONSENT_TYPES: [
      'data_processing',
      'sensitive_health_data',
      'data_sharing_doctors',
      'data_retention',
      'marketing_communications'
    ],
    DATA_RETENTION_YEARS: {
      MEDICAL_RECORDS: 20, // CFM Resolution 1.821/2007
      AUDIT_LOGS: 5,
      INACTIVE_ACCOUNTS: 2
    },
    DELETION_GRACE_PERIOD_DAYS: 30
  },

  // Audit Log Actions
  AUDIT_ACTIONS: {
    DATA_ACCESS: 'DATA_ACCESS',
    DATA_MODIFICATION: 'DATA_MODIFICATION',
    DATA_DELETION: 'DATA_DELETION',
    DATA_EXPORT: 'DATA_EXPORT',
    CONSENT_GRANTED: 'CONSENT_GRANTED',
    CONSENT_REVOKED: 'CONSENT_REVOKED',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    FAILED_LOGIN: 'FAILED_LOGIN',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS'
  },

  // Error Codes
  ERROR_CODES: {
    // Authentication
    AUTH_INVALID_CREDENTIALS: 'AUTH_001',
    AUTH_TOKEN_EXPIRED: 'AUTH_002',
    AUTH_TOKEN_INVALID: 'AUTH_003',
    AUTH_UNAUTHORIZED: 'AUTH_004',
    
    // Authorization
    AUTHZ_FORBIDDEN: 'AUTHZ_001',
    AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',
    AUTHZ_DOCTOR_NOT_ASSIGNED: 'AUTHZ_003',
    
    // Validation
    VALIDATION_REQUIRED_FIELD: 'VAL_001',
    VALIDATION_INVALID_FORMAT: 'VAL_002',
    VALIDATION_CPF_INVALID: 'VAL_003',
    VALIDATION_FILE_TOO_LARGE: 'VAL_004',
    VALIDATION_FILE_TYPE_INVALID: 'VAL_005',
    
    // Business Logic
    BUSINESS_APPOINTMENT_CONFLICT: 'BUS_001',
    BUSINESS_PRESCRIPTION_EXPIRED: 'BUS_002',
    BUSINESS_PATIENT_NOT_FOUND: 'BUS_003',
    
    // LGPD
    LGPD_CONSENT_REQUIRED: 'LGPD_001',
    LGPD_DATA_RETENTION_VIOLATION: 'LGPD_002',
    
    // System
    SYSTEM_DATABASE_ERROR: 'SYS_001',
    SYSTEM_STORAGE_ERROR: 'SYS_002',
    SYSTEM_INTERNAL_ERROR: 'SYS_003'
  },

  // Brazilian Formats
  BRAZIL: {
    TIMEZONE: 'America/Sao_Paulo',
    LOCALE: 'pt-BR',
    CURRENCY: 'BRL',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: 'HH:mm',
    PHONE_REGEX: /^(\d{2})(\d{4,5})(\d{4})$/,
    CPF_REGEX: /^(\d{3})(\d{3})(\d{3})(\d{2})$/
  }
};
