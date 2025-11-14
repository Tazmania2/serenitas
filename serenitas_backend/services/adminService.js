/**
 * Admin Service
 * 
 * Business logic for admin operations including system statistics,
 * audit log queries, user management, and compliance data export.
 * 
 * Requirements: 7.1, 7.8, 7.9
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { formatDate, formatDateTime } = require('../utils/formatters');

/**
 * Get system statistics
 * 
 * @returns {Promise<Object>} System statistics
 */
async function getSystemStatistics() {
  try {
    logger.info('Getting system statistics');

    // Get user counts by role
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role');

    if (usersError) throw usersError;

    const userStats = {
      total: users.length,
      patients: users.filter(u => u.role === 'patient').length,
      doctors: users.filter(u => u.role === 'doctor').length,
      secretaries: users.filter(u => u.role === 'secretary').length,
      admins: users.filter(u => u.role === 'admin').length
    };

    // Get appointment counts by status
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('status');

    if (appointmentsError) throw appointmentsError;

    const appointmentStats = {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    // Get prescription counts by status
    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('status');

    if (prescriptionsError) throw prescriptionsError;

    const prescriptionStats = {
      total: prescriptions.length,
      active: prescriptions.filter(p => p.status === 'active').length,
      completed: prescriptions.filter(p => p.status === 'completed').length,
      discontinued: prescriptions.filter(p => p.status === 'discontinued').length
    };

    // Get exam counts by status
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('status');

    if (examsError) throw examsError;

    const examStats = {
      total: exams.length,
      pending: exams.filter(e => e.status === 'pending').length,
      completed: exams.filter(e => e.status === 'completed').length,
      cancelled: exams.filter(e => e.status === 'cancelled').length
    };

    // Get mood entry count
    const { count: moodEntryCount, error: moodError } = await supabase
      .from('mood_entries')
      .select('*', { count: 'exact', head: true });

    if (moodError) throw moodError;

    // Get doctor notes count
    const { count: doctorNotesCount, error: notesError } = await supabase
      .from('doctor_notes')
      .select('*', { count: 'exact', head: true });

    if (notesError) throw notesError;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentAppointments, error: recentError } = await supabase
      .from('appointments')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentError) throw recentError;

    const stats = {
      users: userStats,
      appointments: appointmentStats,
      prescriptions: prescriptionStats,
      exams: examStats,
      moodEntries: moodEntryCount || 0,
      doctorNotes: doctorNotesCount || 0,
      recentActivity: {
        newAppointments: recentAppointments.length,
        period: 'last_7_days'
      },
      timestamp: new Date().toISOString()
    };

    logger.info('System statistics retrieved successfully', { stats });
    return stats;
  } catch (error) {
    logger.error('Get system statistics error', { error: error.message });
    throw new Error('Erro ao obter estatísticas do sistema: ' + error.message);
  }
}

/**
 * Query audit logs with filters
 * 
 * @param {Object} filters - Filter parameters
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.startDate - Filter by start date
 * @param {string} filters.endDate - Filter by end date
 * @param {string} filters.resourceType - Filter by resource type
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<Object>} Paginated audit logs
 */
async function queryAuditLogs(filters) {
  try {
    const { userId, action, startDate, endDate, resourceType, page = 1, limit = 50 } = filters;

    logger.info('Querying audit logs', { filters });

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) throw error;

    // Get user information for each log
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        if (log.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('name, email, role')
            .eq('id', log.user_id)
            .single();

          return {
            ...log,
            user: user || null
          };
        }
        return log;
      })
    );

    const totalPages = Math.ceil(count / limit);

    logger.info('Audit logs retrieved successfully', {
      count,
      page,
      totalPages
    });

    return {
      logs: logsWithUsers,
      page,
      limit,
      total: count,
      totalPages
    };
  } catch (error) {
    logger.error('Query audit logs error', { error: error.message });
    throw new Error('Erro ao consultar logs de auditoria: ' + error.message);
  }
}

/**
 * Get all users with filters
 * 
 * @param {Object} filters - Filter parameters
 * @param {string} filters.role - Filter by role
 * @param {string} filters.search - Search term for name or email
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<Object>} Paginated users
 */
async function getAllUsersWithFilters(filters) {
  try {
    const { role, search, page = 1, limit = 50 } = filters;

    logger.info('Getting all users with filters', { filters });

    // Build query
    let query = supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at, created_at, updated_at', { count: 'exact' });

    // Apply role filter
    if (role) {
      query = query.eq('role', role);
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil(count / limit);

    logger.info('Users retrieved successfully', {
      count,
      page,
      totalPages
    });

    return {
      users,
      page,
      limit,
      total: count,
      totalPages
    };
  } catch (error) {
    logger.error('Get all users with filters error', { error: error.message });
    throw new Error('Erro ao obter usuários: ' + error.message);
  }
}

/**
 * Export compliance data
 * 
 * @param {Object} options - Export options
 * @param {string} options.exportType - Type of data to export (users, audit_logs, all, compliance)
 * @param {string} options.format - Export format (json or csv)
 * @param {string} options.startDate - Start date for filtering
 * @param {string} options.endDate - End date for filtering
 * @returns {Promise<Object>} Exported data
 */
async function exportComplianceData(options) {
  try {
    const { exportType, format = 'json', startDate, endDate } = options;

    logger.info('Exporting compliance data', { exportType, format });

    let exportData = {};

    switch (exportType) {
      case 'users':
        exportData = await exportUsersData();
        break;

      case 'audit_logs':
        exportData = await exportAuditLogsData(startDate, endDate);
        break;

      case 'compliance':
        exportData = await exportComplianceReport(startDate, endDate);
        break;

      case 'all':
        exportData = await exportAllData(startDate, endDate);
        break;

      default:
        throw new Error('Tipo de exportação inválido');
    }

    // Format data based on requested format
    if (format === 'csv') {
      return convertToCSV(exportData, exportType);
    }

    logger.info('Compliance data exported successfully', { exportType });
    return exportData;
  } catch (error) {
    logger.error('Export compliance data error', { error: error.message });
    throw new Error('Erro ao exportar dados de conformidade: ' + error.message);
  }
}

/**
 * Export users data
 * 
 * @returns {Promise<Object>} Users data
 */
async function exportUsersData() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, phone, role, created_at, last_login_at');

  if (error) throw error;

  return {
    exportType: 'users',
    exportDate: new Date().toISOString(),
    count: users.length,
    data: users
  };
}

/**
 * Export audit logs data
 * 
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Audit logs data
 */
async function exportAuditLogsData(startDate, endDate) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: logs, error } = await query;

  if (error) throw error;

  return {
    exportType: 'audit_logs',
    exportDate: new Date().toISOString(),
    period: {
      startDate: startDate || 'all',
      endDate: endDate || 'all'
    },
    count: logs.length,
    data: logs
  };
}

/**
 * Export compliance report
 * 
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Compliance report
 */
async function exportComplianceReport(startDate, endDate) {
  // Get consent data
  let consentQuery = supabase
    .from('consents')
    .select('*');

  if (startDate) {
    consentQuery = consentQuery.gte('created_at', startDate);
  }

  if (endDate) {
    consentQuery = consentQuery.lte('created_at', endDate);
  }

  const { data: consents, error: consentError } = await consentQuery;
  if (consentError) throw consentError;

  // Get audit logs for sensitive data access
  let auditQuery = supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'SENSITIVE_DATA_ACCESS');

  if (startDate) {
    auditQuery = auditQuery.gte('created_at', startDate);
  }

  if (endDate) {
    auditQuery = auditQuery.lte('created_at', endDate);
  }

  const { data: sensitiveAccess, error: auditError } = await auditQuery;
  if (auditError) throw auditError;

  // Get data deletion requests
  const { data: deletionRequests, error: deletionError } = await supabase
    .from('users')
    .select('id, email, deletion_scheduled, deletion_date')
    .eq('deletion_scheduled', true);

  if (deletionError) throw deletionError;

  return {
    exportType: 'compliance',
    exportDate: new Date().toISOString(),
    period: {
      startDate: startDate || 'all',
      endDate: endDate || 'all'
    },
    summary: {
      totalConsents: consents.length,
      grantedConsents: consents.filter(c => c.granted).length,
      revokedConsents: consents.filter(c => !c.granted).length,
      sensitiveDataAccess: sensitiveAccess.length,
      pendingDeletions: deletionRequests.length
    },
    data: {
      consents,
      sensitiveDataAccess,
      deletionRequests
    }
  };
}

/**
 * Export all data
 * 
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} All data
 */
async function exportAllData(startDate, endDate) {
  const [users, auditLogs, compliance] = await Promise.all([
    exportUsersData(),
    exportAuditLogsData(startDate, endDate),
    exportComplianceReport(startDate, endDate)
  ]);

  return {
    exportType: 'all',
    exportDate: new Date().toISOString(),
    period: {
      startDate: startDate || 'all',
      endDate: endDate || 'all'
    },
    users,
    auditLogs,
    compliance
  };
}

/**
 * Convert data to CSV format
 * 
 * @param {Object} data - Data to convert
 * @param {string} exportType - Type of export
 * @returns {string} CSV string
 */
function convertToCSV(data, exportType) {
  // Simple CSV conversion for users
  if (exportType === 'users' && data.data) {
    const headers = ['ID', 'Email', 'Nome', 'Telefone', 'Função', 'Criado em', 'Último login'];
    const rows = data.data.map(user => [
      user.id,
      user.email,
      user.name,
      user.phone || '',
      user.role,
      formatDateTime(user.created_at),
      user.last_login_at ? formatDateTime(user.last_login_at) : 'Nunca'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  // For other types, return JSON string
  return JSON.stringify(data, null, 2);
}

/**
 * Generate system report
 * 
 * @returns {Promise<Object>} System report
 */
async function generateSystemReport() {
  try {
    logger.info('Generating system report');

    const stats = await getSystemStatistics();

    // Get additional metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (usersError) throw usersError;

    const { data: recentAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (appointmentsError) throw appointmentsError;

    const report = {
      generatedAt: new Date().toISOString(),
      period: 'last_30_days',
      statistics: stats,
      growth: {
        newUsers: recentUsers.length,
        newAppointments: recentAppointments.length
      }
    };

    logger.info('System report generated successfully');
    return report;
  } catch (error) {
    logger.error('Generate system report error', { error: error.message });
    throw new Error('Erro ao gerar relatório do sistema: ' + error.message);
  }
}

module.exports = {
  getSystemStatistics,
  queryAuditLogs,
  getAllUsersWithFilters,
  exportComplianceData,
  generateSystemReport
};
