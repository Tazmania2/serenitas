/**
 * LGPD Routes
 * LGPD Requirements 8.1-8.7 - Data subject rights endpoints
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const lgpdService = require('../services/lgpdService');
const consentService = require('../services/consentService');
const logger = require('../utils/logger');

/**
 * GET /api/lgpd/my-data
 * Export all user data
 * LGPD Article 18, II - Right to access
 */
router.get('/my-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userData = await lgpdService.exportUserData(userId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: userData,
      message: 'Dados exportados conforme LGPD Art. 18, II'
    });
  } catch (error) {
    logger.error('Erro ao exportar dados do usuário', {
      userId: req.user._id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar dados',
      error: error.message
    });
  }
});

/**
 * POST /api/lgpd/data-portability
 * Export user data in JSON format for portability
 * LGPD Article 18, V - Data portability
 */
router.post('/data-portability', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userData = await lgpdService.exportUserData(userId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="meus-dados-serenitas-${Date.now()}.json"`);
    
    res.json(userData);
  } catch (error) {
    logger.error('Erro na portabilidade de dados', {
      userId: req.user._id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar dados para portabilidade',
      error: error.message
    });
  }
});

/**
 * DELETE /api/lgpd/delete-account
 * Schedule account deletion with grace period
 * LGPD Article 18, VI - Right to deletion
 */
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const result = await lgpdService.scheduleAccountDeletion(userId, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: result,
      message: result.alreadyScheduled 
        ? 'Exclusão já estava agendada' 
        : 'Exclusão agendada com sucesso. Você tem 30 dias para cancelar fazendo login novamente.'
    });
  } catch (error) {
    logger.error('Erro ao agendar exclusão de conta', {
      userId: req.user._id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao agendar exclusão de conta',
      error: error.message
    });
  }
});

/**
 * POST /api/lgpd/revoke-consent
 * Revoke user consent
 * LGPD Article 18, IX - Right to revoke consent
 */
router.post('/revoke-consent', [
  auth,
  body('consentType')
    .notEmpty()
    .withMessage('Tipo de consentimento é obrigatório')
    .isIn([
      'data_processing',
      'sensitive_health_data',
      'data_sharing_doctors',
      'data_retention',
      'marketing_communications'
    ])
    .withMessage('Tipo de consentimento inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  
  try {
    const userId = req.user._id;
    const { consentType } = req.body;
    
    const result = await lgpdService.revokeUserConsent(userId, consentType, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Consentimento revogado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao revogar consentimento', {
      userId: req.user._id,
      consentType: req.body.consentType,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao revogar consentimento',
      error: error.message
    });
  }
});

/**
 * POST /api/lgpd/grant-consent
 * Grant user consent
 * LGPD Article 8 - Consent requirements
 */
router.post('/grant-consent', [
  auth,
  body('consentType')
    .notEmpty()
    .withMessage('Tipo de consentimento é obrigatório')
    .isIn([
      'data_processing',
      'sensitive_health_data',
      'data_sharing_doctors',
      'data_retention',
      'marketing_communications'
    ])
    .withMessage('Tipo de consentimento inválido'),
  body('version')
    .optional()
    .isString()
    .withMessage('Versão deve ser uma string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  
  try {
    const userId = req.user._id;
    const { consentType, version = '1.0' } = req.body;
    
    const consent = await consentService.grantConsent({
      userId,
      consentType,
      version,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(201).json({
      success: true,
      data: consent,
      message: 'Consentimento registrado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimento', {
      userId: req.user._id,
      consentType: req.body.consentType,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar consentimento',
      error: error.message
    });
  }
});

/**
 * GET /api/lgpd/consents
 * Get all user consents
 * LGPD Article 18, VIII - Information about consent
 */
router.get('/consents', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const consents = await consentService.getUserConsents(userId);
    
    res.json({
      success: true,
      data: consents,
      message: 'Consentimentos recuperados com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao buscar consentimentos', {
      userId: req.user._id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar consentimentos',
      error: error.message
    });
  }
});

/**
 * GET /api/lgpd/data-usage
 * Get information about data processing purposes
 * LGPD Article 18, I - Right to information
 */
router.get('/data-usage', async (req, res) => {
  try {
    const purposes = lgpdService.getDataProcessingPurposes();
    
    res.json({
      success: true,
      data: purposes,
      message: 'Informações sobre tratamento de dados conforme LGPD Art. 18, I'
    });
  } catch (error) {
    logger.error('Erro ao buscar finalidades de tratamento', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar informações sobre tratamento de dados',
      error: error.message
    });
  }
});

/**
 * GET /api/lgpd/dpo-contact
 * Get DPO contact information
 * LGPD Article 41 - DPO information
 */
router.get('/dpo-contact', async (req, res) => {
  try {
    const dpoInfo = lgpdService.getDPOContact();
    
    res.json({
      success: true,
      data: dpoInfo,
      message: 'Informações do Encarregado de Dados (DPO) conforme LGPD Art. 41'
    });
  } catch (error) {
    logger.error('Erro ao buscar informações do DPO', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar informações do DPO',
      error: error.message
    });
  }
});

module.exports = router;
