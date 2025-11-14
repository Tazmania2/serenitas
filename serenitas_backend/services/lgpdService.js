/**
 * LGPD Service
 * LGPD Requirements 8.1-8.5 - Data subject rights implementation
 */

const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Exam = require('../models/Exam');
const MoodEntry = require('../models/MoodEntry');
const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { deleteUserAccount } = require('./dataRetentionService');
const { revokeConsent } = require('./consentService');

/**
 * Export all user data in JSON format
 * LGPD Article 18, V - Data portability
 * @param {string} userId - User ID
 * @param {Object} requestInfo - Request information (IP, user agent)
 * @returns {Promise<Object>} Complete user data export
 */
async function exportUserData(userId, requestInfo = {}) {
  logger.info('Exportando dados do usuário', {
    userId,
    ipAddress: requestInfo.ipAddress
  });
  
  try {
    // Get user data
    const user = await User.findById(userId).select('-password').lean();
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        userId: userId,
        format: 'JSON',
        lgpdArticle: 'Art. 18, V - Portabilidade dos dados'
      },
      personalData: {
        user: user
      }
    };
    
    // If patient, get patient-specific data
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ userId }).lean();
      const appointments = await Appointment.find({ patientId: patient?._id })
        .populate('doctorId', 'name specialization')
        .lean();
      const prescriptions = await Prescription.find({ patientId: patient?._id })
        .populate('doctorId', 'name')
        .lean();
      const exams = await Exam.find({ patientId: patient?._id })
        .populate('doctorId', 'name')
        .lean();
      const moodEntries = await MoodEntry.find({ patientId: patient?._id }).lean();
      
      exportData.healthData = {
        patientProfile: patient,
        appointments: appointments,
        prescriptions: prescriptions,
        exams: exams.map(exam => ({
          ...exam,
          fileUrl: exam.fileUrl ? '[Arquivo disponível no sistema]' : null
        })),
        moodEntries: moodEntries
      };
    }
    
    // If doctor, get doctor-specific data
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId }).lean();
      const appointments = await Appointment.find({ doctorId: doctor?._id })
        .populate('patientId', 'name')
        .lean();
      
      exportData.professionalData = {
        doctorProfile: doctor,
        appointments: appointments
      };
    }
    
    // Get consents
    const consents = await Consent.find({ userId }).lean();
    exportData.consents = consents;
    
    // Get audit logs (last 90 days for privacy)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const auditLogs = await AuditLog.find({
      userId,
      timestamp: { $gte: ninetyDaysAgo }
    }).lean();
    exportData.auditLogs = auditLogs;
    
    // Log the export
    await AuditLog.create({
      userId,
      action: 'DATA_EXPORT',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      details: {
        exportDate: new Date(),
        dataTypes: Object.keys(exportData)
      }
    });
    
    logger.info('Dados do usuário exportados com sucesso', {
      userId,
      dataTypes: Object.keys(exportData)
    });
    
    return exportData;
  } catch (error) {
    logger.error('Erro ao exportar dados do usuário', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Schedule account deletion with grace period
 * LGPD Article 18, VI - Deletion
 * @param {string} userId - User ID
 * @param {Object} requestInfo - Request information
 * @returns {Promise<Object>} Deletion schedule information
 */
async function scheduleAccountDeletion(userId, requestInfo = {}) {
  logger.info('Agendando exclusão de conta', {
    userId,
    ipAddress: requestInfo.ipAddress
  });
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    if (user.deletionScheduled) {
      return {
        alreadyScheduled: true,
        deletionDate: user.deletionDate,
        message: 'Exclusão já agendada'
      };
    }
    
    // Schedule deletion for 30 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);
    
    await User.updateOne(
      { _id: userId },
      {
        deletionScheduled: true,
        deletionDate: deletionDate,
        deletionRequestedAt: new Date()
      }
    );
    
    // Log the deletion request
    await AuditLog.create({
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      details: {
        scheduledDate: deletionDate,
        gracePeriodDays: 30,
        reason: 'User request'
      }
    });
    
    logger.info('Exclusão de conta agendada', {
      userId,
      deletionDate: deletionDate.toISOString()
    });
    
    return {
      scheduled: true,
      deletionDate: deletionDate,
      gracePeriodDays: 30,
      message: 'Exclusão agendada com sucesso. Você tem 30 dias para cancelar.'
    };
  } catch (error) {
    logger.error('Erro ao agendar exclusão de conta', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get data processing purposes
 * LGPD Article 18, I - Information about processing
 * @returns {Object} Data processing purposes
 */
function getDataProcessingPurposes() {
  return {
    purposes: [
      {
        category: 'Identificação e Autenticação',
        data: ['Nome', 'Email', 'Senha (criptografada)'],
        purpose: 'Identificação do usuário e controle de acesso ao sistema',
        legalBasis: 'Execução de contrato (LGPD Art. 7, V)',
        retention: 'Enquanto a conta estiver ativa + 2 anos'
      },
      {
        category: 'Dados de Saúde',
        data: [
          'Histórico médico',
          'Prescrições',
          'Exames',
          'Registro de humor',
          'Anotações médicas'
        ],
        purpose: 'Prestação de serviços de saúde mental e acompanhamento clínico',
        legalBasis: 'Tutela da saúde (LGPD Art. 11, II, f)',
        retention: '20 anos (Resolução CFM 1.821/2007)'
      },
      {
        category: 'Dados de Contato',
        data: ['Telefone', 'Contato de emergência'],
        purpose: 'Comunicação sobre consultas e emergências',
        legalBasis: 'Execução de contrato (LGPD Art. 7, V)',
        retention: 'Enquanto a conta estiver ativa'
      },
      {
        category: 'Dados de Uso',
        data: ['Logs de acesso', 'Endereço IP', 'User agent'],
        purpose: 'Segurança, auditoria e conformidade com LGPD',
        legalBasis: 'Obrigação legal (LGPD Art. 7, II)',
        retention: '5 anos'
      },
      {
        category: 'Consentimentos',
        data: ['Registros de consentimento', 'IP', 'Data/hora'],
        purpose: 'Comprovação de consentimento conforme LGPD',
        legalBasis: 'Obrigação legal (LGPD Art. 7, II)',
        retention: '5 anos após revogação'
      }
    ],
    dataProtectionOfficer: {
      name: process.env.DPO_NAME || 'Encarregado de Dados',
      email: process.env.DPO_EMAIL || 'dpo@clinicaserenitas.com.br',
      phone: process.env.DPO_PHONE || null
    },
    rights: [
      'Confirmação da existência de tratamento (Art. 18, I)',
      'Acesso aos dados (Art. 18, II)',
      'Correção de dados incompletos, inexatos ou desatualizados (Art. 18, III)',
      'Anonimização, bloqueio ou eliminação (Art. 18, IV)',
      'Portabilidade dos dados (Art. 18, V)',
      'Eliminação dos dados (Art. 18, VI)',
      'Informação sobre compartilhamento (Art. 18, VII)',
      'Revogação do consentimento (Art. 18, IX)'
    ]
  };
}

/**
 * Revoke user consent
 * LGPD Article 18, IX - Consent revocation
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent to revoke
 * @param {Object} requestInfo - Request information
 * @returns {Promise<Object>} Revocation result
 */
async function revokeUserConsent(userId, consentType, requestInfo = {}) {
  logger.info('Revogando consentimento do usuário', {
    userId,
    consentType,
    ipAddress: requestInfo.ipAddress
  });
  
  try {
    const result = await revokeConsent({
      userId,
      consentType,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });
    
    logger.info('Consentimento revogado com sucesso', {
      userId,
      consentType
    });
    
    return {
      success: true,
      consentType,
      revokedAt: result.revokedAt,
      message: 'Consentimento revogado com sucesso'
    };
  } catch (error) {
    logger.error('Erro ao revogar consentimento', {
      userId,
      consentType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Anonymize user data for deletion
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function anonymizeUserData(userId) {
  logger.info('Anonimizando dados do usuário', { userId });
  
  try {
    await deleteUserAccount(userId, {
      reason: 'User request - LGPD compliance',
      preserveMedicalRecords: true
    });
    
    logger.info('Dados do usuário anonimizados', { userId });
  } catch (error) {
    logger.error('Erro ao anonimizar dados', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get DPO contact information
 * LGPD Article 41 - DPO information
 * @returns {Object} DPO contact details
 */
function getDPOContact() {
  return {
    name: process.env.DPO_NAME || 'Encarregado de Proteção de Dados',
    email: process.env.DPO_EMAIL || 'dpo@clinicaserenitas.com.br',
    phone: process.env.DPO_PHONE || null,
    address: process.env.DPO_ADDRESS || null,
    role: 'Data Protection Officer (DPO) / Encarregado de Dados',
    responsibilities: [
      'Aceitar reclamações e comunicações dos titulares',
      'Prestar esclarecimentos sobre tratamento de dados',
      'Receber comunicações da ANPD',
      'Orientar funcionários sobre práticas de proteção de dados'
    ],
    lgpdArticle: 'Art. 41 - Lei 13.709/2018'
  };
}

module.exports = {
  exportUserData,
  scheduleAccountDeletion,
  getDataProcessingPurposes,
  revokeUserConsent,
  anonymizeUserData,
  getDPOContact
};
