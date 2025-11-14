/**
 * Audit Log Model
 * LGPD Requirement 11.1-11.10 - Comprehensive audit logging
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    enum: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_DELETION',
      'DATA_EXPORT',
      'CONSENT_GRANTED',
      'CONSENT_REVOKED',
      'LOGIN',
      'LOGOUT',
      'FAILED_LOGIN',
      'PASSWORD_CHANGE',
      'SENSITIVE_DATA_ACCESS',
      'ACCOUNT_DELETION_REQUESTED',
      'ACCOUNT_DELETION_EXECUTED',
      'ACCOUNT_DELETION_CANCELLED'
    ],
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    enum: [
      'User',
      'Patient',
      'Doctor',
      'Appointment',
      'Prescription',
      'Exam',
      'MoodEntry',
      'DoctorNote',
      'Consent'
    ]
  },
  resourceId: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
