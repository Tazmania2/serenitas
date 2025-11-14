/**
 * Consent Management Service
 * LGPD Requirement 8.8 - Explicit consent management
 */

const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Record consent grant
 * @param {Object} consentData - Consent information
 * @returns {Promise<Object>} Created consent record
 */
async function grantConsent(consentData) {
  const { userId, consentType, ipAddress, userAgent, version = '1.0' } = consentData;
  
  logger.info('Registrando consentimento', {
    userId,
    consentType,
    ipAddress
  });
  
  try {
    // Create consent record
    const consent = await Consent.create({
      userId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      ipAddress,
      userAgent,
      version,
      language: 'pt-BR'
    });
    
    // Log the consent grant
    await AuditLog.create({
      userId,
      action: 'CONSENT_GRANTED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      ipAddress,
      userAgent,
      details: {
        consentType,
        version
      }
    });
    
    logger.info('Consentimento registrado com sucesso', {
      userId,
      consentType,
      consentId: consent._id
    });
    
    return consent;
  } catch (error) {
    logger.error('Erro ao registrar consentimento', {
      userId,
      consentType,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Revoke consent
 * @param {Object} revokeData - Revocation information
 * @returns {Promise<Object>} Updated consent record
 */
async function revokeConsent(revokeData) {
  const { userId, consentType, ipAddress, userAgent } = revokeData;
  
  logger.info('Revogando consentimento', {
    userId,
    consentType,
    ipAddress
  });
  
  try {
    // Find the most recent granted consent
    const consent = await Consent.findOne({
      userId,
      consentType,
      granted: true,
      revokedAt: null
    }).sort({ createdAt: -1 });
    
    if (!consent) {
      throw new Error('Consentimento não encontrado ou já revogado');
    }
    
    // Update consent to revoked
    consent.granted = false;
    consent.revokedAt = new Date();
    await consent.save();
    
    // Log the consent revocation
    await AuditLog.create({
      userId,
      action: 'CONSENT_REVOKED',
      resourceType: 'Consent',
      resourceId: consent._id.toString(),
      ipAddress,
      userAgent,
      details: {
        consentType,
        originalGrantDate: consent.grantedAt
      }
    });
    
    logger.info('Consentimento revogado com sucesso', {
      userId,
      consentType,
      consentId: consent._id
    });
    
    return consent;
  } catch (error) {
    logger.error('Erro ao revogar consentimento', {
      userId,
      consentType,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Check consent status for a user
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent to check
 * @returns {Promise<Object>} Consent status
 */
async function checkConsentStatus(userId, consentType) {
  try {
    const consent = await Consent.findOne({
      userId,
      consentType,
      granted: true,
      revokedAt: null
    }).sort({ createdAt: -1 });
    
    return {
      hasConsent: !!consent,
      consent: consent || null,
      grantedAt: consent?.grantedAt || null,
      version: consent?.version || null
    };
  } catch (error) {
    logger.error('Erro ao verificar status de consentimento', {
      userId,
      consentType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get all consents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of consents
 */
async function getUserConsents(userId) {
  try {
    const consents = await Consent.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Group by consent type to show current status
    const consentsByType = {};
    
    for (const consent of consents) {
      if (!consentsByType[consent.consentType]) {
        consentsByType[consent.consentType] = {
          type: consent.consentType,
          currentStatus: consent.granted && !consent.revokedAt ? 'granted' : 'revoked',
          grantedAt: consent.grantedAt,
          revokedAt: consent.revokedAt,
          version: consent.version,
          history: []
        };
      }
      
      consentsByType[consent.consentType].history.push({
        granted: consent.granted,
        grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt,
        version: consent.version,
        createdAt: consent.createdAt
      });
    }
    
    return Object.values(consentsByType);
  } catch (error) {
    logger.error('Erro ao buscar consentimentos do usuário', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Require consent check middleware
 * @param {string} consentType - Required consent type
 * @returns {Function} Express middleware
 */
function requireConsent(consentType) {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;
      const status = await checkConsentStatus(userId, consentType);
      
      if (!status.hasConsent) {
        return res.status(403).json({
          success: false,
          message: 'Consentimento necessário para esta operação',
          error: `Consentimento do tipo '${consentType}' não foi concedido`,
          code: 'CONSENT_REQUIRED',
          consentType
        });
      }
      
      req.consent = status.consent;
      next();
    } catch (error) {
      logger.error('Erro ao verificar consentimento', {
        userId: req.user?._id,
        consentType,
        error: error.message
      });
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar consentimento',
        error: error.message
      });
    }
  };
}

module.exports = {
  grantConsent,
  revokeConsent,
  checkConsentStatus,
  getUserConsents,
  requireConsent
};
