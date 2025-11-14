/**
 * Data Retention Service
 * LGPD Requirement 8.9 - Data retention policies
 * CFM Resolution 1.821/2007 - Medical records retention (20 years)
 */

const User = require('../models/User');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/email');

// Retention policies in days
const RETENTION_POLICIES = {
  INACTIVE_ACCOUNT_WARNING: 730, // 2 years - warn user
  GRACE_PERIOD: 30, // 30 days grace period after deletion request
  MEDICAL_RECORDS: 7300, // 20 years - CFM requirement
  AUDIT_LOGS: 1825 // 5 years - security and compliance
};

/**
 * Identify inactive accounts that need notification
 * @returns {Promise<Array>} List of inactive users
 */
async function identifyInactiveAccounts() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.INACTIVE_ACCOUNT_WARNING);
  
  logger.info('Identificando contas inativas', {
    cutoffDate: cutoffDate.toISOString()
  });
  
  try {
    const inactiveUsers = await User.find({
      lastLoginAt: { $lt: cutoffDate },
      deletionScheduled: { $ne: true },
      role: { $ne: 'admin' } // Don't auto-delete admin accounts
    }).select('_id name email lastLoginAt');
    
    logger.info('Contas inativas identificadas', {
      count: inactiveUsers.length
    });
    
    return inactiveUsers;
  } catch (error) {
    logger.error('Erro ao identificar contas inativas', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Notify user before account deletion
 * @param {Object} user - User to notify
 * @returns {Promise<void>}
 */
async function notifyUserBeforeDeletion(user) {
  logger.info('Notificando usuário sobre exclusão pendente', {
    userId: user._id,
    email: user.email
  });
  
  try {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + RETENTION_POLICIES.GRACE_PERIOD);
    
    // Send email notification
    await sendEmail({
      to: user.email,
      subject: 'Aviso: Conta Inativa - Clínica Serenitas',
      html: `
        <h2>Olá, ${user.name}!</h2>
        <p>Sua conta na Clínica Serenitas está inativa há mais de 2 anos.</p>
        <p>Conforme nossa política de retenção de dados (LGPD), sua conta será excluída em <strong>${deletionDate.toLocaleDateString('pt-BR')}</strong>.</p>
        <p>Se você deseja manter sua conta ativa, faça login no sistema antes desta data.</p>
        <p><strong>Importante:</strong> Seus registros médicos serão preservados por 20 anos conforme exigido pela Resolução CFM 1.821/2007.</p>
        <p>Se tiver dúvidas, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Clínica Serenitas</p>
      `
    });
    
    // Schedule deletion
    await User.updateOne(
      { _id: user._id },
      {
        deletionScheduled: true,
        deletionDate: deletionDate,
        deletionNotifiedAt: new Date()
      }
    );
    
    // Log the notification
    await AuditLog.create({
      userId: user._id,
      action: 'ACCOUNT_DELETION_REQUESTED',
      details: {
        reason: 'Inactive account',
        scheduledDate: deletionDate,
        gracePeriodDays: RETENTION_POLICIES.GRACE_PERIOD
      }
    });
    
    logger.info('Usuário notificado com sucesso', {
      userId: user._id,
      deletionDate: deletionDate.toISOString()
    });
  } catch (error) {
    logger.error('Erro ao notificar usuário', {
      userId: user._id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Execute scheduled account deletions
 * @returns {Promise<Object>} Deletion results
 */
async function executeScheduledDeletions() {
  const now = new Date();
  
  logger.info('Executando exclusões agendadas', {
    timestamp: now.toISOString()
  });
  
  try {
    // Find accounts scheduled for deletion
    const usersToDelete = await User.find({
      deletionScheduled: true,
      deletionDate: { $lte: now }
    });
    
    const results = {
      total: usersToDelete.length,
      deleted: 0,
      preserved: 0,
      errors: []
    };
    
    for (const user of usersToDelete) {
      try {
        await deleteUserAccount(user._id, {
          reason: 'Scheduled deletion after grace period',
          preserveMedicalRecords: true
        });
        results.deleted++;
      } catch (error) {
        logger.error('Erro ao excluir conta agendada', {
          userId: user._id,
          error: error.message
        });
        results.errors.push({
          userId: user._id,
          error: error.message
        });
      }
    }
    
    logger.info('Exclusões agendadas executadas', results);
    
    return results;
  } catch (error) {
    logger.error('Erro ao executar exclusões agendadas', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Delete user account with data anonymization
 * @param {string} userId - User ID to delete
 * @param {Object} options - Deletion options
 * @returns {Promise<void>}
 */
async function deleteUserAccount(userId, options = {}) {
  const { reason = 'User request', preserveMedicalRecords = true } = options;
  
  logger.info('Iniciando exclusão de conta', {
    userId,
    reason,
    preserveMedicalRecords
  });
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // If user is a patient, handle medical records
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ userId });
      
      if (patient && preserveMedicalRecords) {
        // Anonymize patient data but preserve medical records
        await anonymizePatientData(patient._id);
      }
    }
    
    // Anonymize user data
    await User.updateOne(
      { _id: userId },
      {
        name: `Usuário Excluído ${userId}`,
        email: `deleted_${userId}@anonymized.local`,
        phone: null,
        password: 'DELETED',
        deletedAt: new Date(),
        deletionReason: reason
      }
    );
    
    // Log the deletion
    await AuditLog.create({
      userId,
      action: 'ACCOUNT_DELETION_EXECUTED',
      details: {
        reason,
        preserveMedicalRecords,
        timestamp: new Date()
      }
    });
    
    logger.info('Conta excluída com sucesso', {
      userId,
      preserveMedicalRecords
    });
  } catch (error) {
    logger.error('Erro ao excluir conta', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Anonymize patient data while preserving medical records
 * @param {string} patientId - Patient ID
 * @returns {Promise<void>}
 */
async function anonymizePatientData(patientId) {
  logger.info('Anonimizando dados do paciente', { patientId });
  
  try {
    await Patient.updateOne(
      { _id: patientId },
      {
        cpf: null,
        phone: null,
        emergencyContactName: 'Anonimizado',
        emergencyContactPhone: null,
        insuranceProvider: null,
        insuranceNumber: null,
        anonymizedAt: new Date()
      }
    );
    
    logger.info('Dados do paciente anonimizados', { patientId });
  } catch (error) {
    logger.error('Erro ao anonimizar dados do paciente', {
      patientId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Cancel scheduled deletion (user logged in during grace period)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function cancelScheduledDeletion(userId) {
  logger.info('Cancelando exclusão agendada', { userId });
  
  try {
    await User.updateOne(
      { _id: userId },
      {
        deletionScheduled: false,
        deletionDate: null,
        deletionNotifiedAt: null
      }
    );
    
    await AuditLog.create({
      userId,
      action: 'ACCOUNT_DELETION_CANCELLED',
      details: {
        reason: 'User logged in during grace period',
        timestamp: new Date()
      }
    });
    
    logger.info('Exclusão agendada cancelada', { userId });
  } catch (error) {
    logger.error('Erro ao cancelar exclusão agendada', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Clean up old audit logs (keep for 5 years)
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanupOldAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.AUDIT_LOGS);
  
  logger.info('Limpando logs de auditoria antigos', {
    cutoffDate: cutoffDate.toISOString()
  });
  
  try {
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    logger.info('Logs de auditoria limpos', {
      deletedCount: result.deletedCount
    });
    
    return {
      deletedCount: result.deletedCount,
      cutoffDate
    };
  } catch (error) {
    logger.error('Erro ao limpar logs de auditoria', {
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  identifyInactiveAccounts,
  notifyUserBeforeDeletion,
  executeScheduledDeletions,
  deleteUserAccount,
  anonymizePatientData,
  cancelScheduledDeletion,
  cleanupOldAuditLogs,
  RETENTION_POLICIES
};
