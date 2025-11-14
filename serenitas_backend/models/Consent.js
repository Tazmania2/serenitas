/**
 * Consent Model
 * LGPD Requirement 8.8 - Explicit consent management
 */

const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  consentType: {
    type: String,
    enum: [
      'data_processing',           // Processamento de dados
      'sensitive_health_data',     // Dados sensíveis de saúde
      'data_sharing_doctors',      // Compartilhamento com médicos
      'data_retention',            // Retenção de dados
      'marketing_communications'   // Comunicações de marketing (opcional)
    ],
    required: true,
    index: true
  },
  granted: {
    type: Boolean,
    required: true
  },
  grantedAt: {
    type: Date
  },
  revokedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  language: {
    type: String,
    default: 'pt-BR'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
consentSchema.index({ userId: 1, consentType: 1, createdAt: -1 });

module.exports = mongoose.model('Consent', consentSchema);
