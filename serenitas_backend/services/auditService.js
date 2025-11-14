/**
 * Audit Logging Service
 * 
 * Records all security-relevant events and data access for LGPD compliance.
 * Stores audit logs in the audit_logs table.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

const { supabase } = require('../config/supabase');
const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Log a user action
 * 
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type (from constants.AUDIT_ACTIONS)
 * @param {string} params.resourceType - Type of resource (e.g., 'prescription', 'exam')
 * @param {string} params.resourceId - ID of the resource
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent string
 * @param {Object} params.details - Additional details about the action
 * @returns {Promise<Object>} Created audit log entry
 */
async function logAction(params) {
  try {
    const {
      userId,
      action,
      resourceType = null,
      resourceId = null,
      ipAddress = null,
      userAgent = null,
      details = {}
    } = params;

    // Validate action type
    const validActions = Object.values(constants.AUDIT_ACTIONS);
    if (!validActions.includes(action)) {
      logger.warn('Invalid audit action type', { action, validActions });
    }

    // Create audit log entry
    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          ip_address: ipAddress,
          user_agent: userAgent,
          details
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        userId,
        action
      });
      // Don't throw error - audit logging should not break the main flow
      return null;
    }

    logger.debug('Audit log created', {
      auditLogId: auditLog.id,
      userId,
      action,
      resourceType,
      resourceId
    });

    return auditLog;
  } catch (error) {
    logger.error('Audit logging error', {
      error: error.message,
      stack: error.stack,
      params
    });
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Log data access event
 * 
 * @param {Object} params - Data access parameters
 * @param {string} params.userId - User accessing the data
 * @param {string} params.resourceType - Type of resource accessed
 * @param {string} params.resourceId - ID of resource accessed
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @param {Object} params.details - Additional details
 * @returns {Promise<Object>} Audit log entry
 */
async function logDataAccess(params) {
  return logAction({
    ...params,
    action: constants.AUDIT_ACTIONS.DATA_ACCESS
  });
}

/**
 * Log sensitive health data access
 * Required for LGPD compliance
 * 
 * @param {Object} params - Data access parameters
 * @returns {Promise<Object>} Audit log entry
 */
async function logSensitiveDataAccess(params) {
  // Also log to application logger for immediate visibility
  logger.audit('Sensitive data access', {
    userId: params.userId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    ipAddress: params.ipAddress
  });

  return logAction({
    ...params,
    action: constants.AUDIT_ACTIONS.SENSITIVE_DATA_ACCESS
  });
}

/**
 * Log data modification event
 * 
 * @param {Object} params - Data modification parameters
 * @param {string} params.userId - User modifying the data
 * @param {string} params.resourceType - Type of resource modified
 * @param {string} params.resourceId - ID of resource modified
 * @param {Object} params.before - Data before modification
 * @param {Object} params.after - Data after modification
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @returns {Promise<Object>} Audit log entry
 */
async function logDataModification(params) {
  const { before, after, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: constants.AUDIT_ACTIONS.DATA_MODIFICATION,
    details: {
      before,
      after,
      changes: getChangedFields(before, after)
    }
  });
}

/**
 * Log data deletion event
 * 
 * @param {Object} params - Data deletion parameters
 * @param {string} params.userId - User deleting the data
 * @param {string} params.resourceType - Type of resource deleted
 * @param {string} params.resourceId - ID of resource deleted
 * @param {Object} params.deletedData - Data that was deleted
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @returns {Promise<Object>} Audit log entry
 */
async function logDataDeletion(params) {
  const { deletedData, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: constants.AUDIT_ACTIONS.DATA_DELETION,
    details: {
      deletedData
    }
  });
}

/**
 * Log user login event
 * 
 * @param {Object} params - Login parameters
 * @param {string} params.userId - User ID
 * @param {string} params.email - User email
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @param {boolean} params.success - Whether login was successful
 * @returns {Promise<Object>} Audit log entry
 */
async function logLogin(params) {
  const { success, email, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: success ? constants.AUDIT_ACTIONS.LOGIN : constants.AUDIT_ACTIONS.FAILED_LOGIN,
    details: {
      email,
      success
    }
  });
}

/**
 * Log user logout event
 * 
 * @param {Object} params - Logout parameters
 * @returns {Promise<Object>} Audit log entry
 */
async function logLogout(params) {
  return logAction({
    ...params,
    action: constants.AUDIT_ACTIONS.LOGOUT
  });
}

/**
 * Log password change event
 * 
 * @param {Object} params - Password change parameters
 * @returns {Promise<Object>} Audit log entry
 */
async function logPasswordChange(params) {
  return logAction({
    ...params,
    action: constants.AUDIT_ACTIONS.PASSWORD_CHANGE
  });
}

/**
 * Log consent granted event
 * 
 * @param {Object} params - Consent parameters
 * @param {string} params.userId - User ID
 * @param {string} params.consentType - Type of consent
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @returns {Promise<Object>} Audit log entry
 */
async function logConsentGranted(params) {
  const { consentType, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: constants.AUDIT_ACTIONS.CONSENT_GRANTED,
    details: {
      consentType
    }
  });
}

/**
 * Log consent revoked event
 * 
 * @param {Object} params - Consent parameters
 * @param {string} params.userId - User ID
 * @param {string} params.consentType - Type of consent
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @returns {Promise<Object>} Audit log entry
 */
async function logConsentRevoked(params) {
  const { consentType, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: constants.AUDIT_ACTIONS.CONSENT_REVOKED,
    details: {
      consentType
    }
  });
}

/**
 * Log data export event (LGPD data portability)
 * 
 * @param {Object} params - Export parameters
 * @param {string} params.userId - User ID
 * @param {string} params.exportFormat - Format of export (JSON, CSV, etc.)
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @returns {Promise<Object>} Audit log entry
 */
async function logDataExport(params) {
  const { exportFormat, ...baseParams } = params;

  return logAction({
    ...baseParams,
    action: constants.AUDIT_ACTIONS.DATA_EXPORT,
    details: {
      exportFormat
    }
  });
}

/**
 * Get audit logs for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.action - Filter by action type
 * @param {Date} options.startDate - Filter by start date
 * @param {Date} options.endDate - Filter by end date
 * @returns {Promise<Array>} Array of audit log entries
 */
async function getUserAuditLogs(userId, options = {}) {
  try {
    const {
      limit = 100,
      offset = 0,
      action = null,
      startDate = null,
      endDate = null
    } = options;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) {
      logger.error('Failed to fetch audit logs', {
        error: error.message,
        userId
      });
      throw new Error('Erro ao buscar logs de auditoria');
    }

    return logs;
  } catch (error) {
    logger.error('Get audit logs error', {
      error: error.message,
      userId
    });
    throw error;
  }
}

/**
 * Get changed fields between two objects
 * Helper function for data modification logging
 * 
 * @param {Object} before - Object before changes
 * @param {Object} after - Object after changes
 * @returns {Array} Array of changed field names
 */
function getChangedFields(before, after) {
  if (!before || !after) return [];

  const changes = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (before[key] !== after[key]) {
      changes.push(key);
    }
  }

  return changes;
}

/**
 * Middleware to automatically log data access
 * Attach to routes that access sensitive data
 * 
 * @param {string} resourceType - Type of resource being accessed
 * @returns {Function} Express middleware
 */
function auditMiddleware(resourceType) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = function(data) {
      // Only log successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log asynchronously without blocking response
        setImmediate(() => {
          logDataAccess({
            userId: req.user?.id,
            resourceType,
            resourceId: req.params.id || req.params.patientId || null,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode
            }
          });
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  logAction,
  logDataAccess,
  logSensitiveDataAccess,
  logDataModification,
  logDataDeletion,
  logLogin,
  logLogout,
  logPasswordChange,
  logConsentGranted,
  logConsentRevoked,
  logDataExport,
  getUserAuditLogs,
  auditMiddleware
};
