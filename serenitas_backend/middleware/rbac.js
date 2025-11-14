/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Enforces role-based permissions for API endpoints.
 * Supports multiple allowed roles per endpoint.
 * 
 * Requirements: 2.6, 2.7, 2.8, 2.9, 2.10
 */

const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Require specific role(s) to access endpoint
 * 
 * @param {...string} allowedRoles - One or more allowed roles
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Single role
 * router.get('/admin/users', auth, requireRole('admin'), getUsers);
 * 
 * @example
 * // Multiple roles
 * router.get('/patients', auth, requireRole('doctor', 'secretary', 'admin'), getPatients);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('RBAC check failed - no user in request', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Autenticação necessária',
          error: 'Usuário não autenticado',
          code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
        });
      }

      const userRole = req.user.role;

      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        const duration = Date.now() - startTime;
        
        logger.warn('RBAC check failed - insufficient permissions', {
          userId: req.user.id,
          userRole,
          allowedRoles,
          path: req.path,
          method: req.method,
          ip: req.ip,
          duration
        });

        return res.status(403).json({
          success: false,
          message: 'Acesso negado',
          error: 'Permissões insuficientes',
          code: constants.ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS
        });
      }

      const duration = Date.now() - startTime;
      
      logger.debug('RBAC check passed', {
        userId: req.user.id,
        userRole,
        allowedRoles,
        path: req.path,
        method: req.method,
        duration
      });

      next();
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('RBAC check error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        path: req.path,
        method: req.method,
        duration
      });

      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões',
        error: error.message,
        code: constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  };
}

/**
 * Require patient role or accessing own data
 * Allows patients to access their own data, or admins to access any data
 * 
 * @param {string} userIdParam - Name of the URL parameter containing user ID (default: 'userId')
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/users/:userId/profile', auth, requireSelfOrAdmin(), getProfile);
 */
function requireSelfOrAdmin(userIdParam = 'userId') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticação necessária',
          code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
        });
      }

      const requestedUserId = req.params[userIdParam];
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      // Admin can access any user's data
      if (userRole === constants.ROLES.ADMIN) {
        logger.debug('RBAC - admin accessing user data', {
          adminId: currentUserId,
          targetUserId: requestedUserId
        });
        return next();
      }

      // User can access their own data
      if (requestedUserId === currentUserId) {
        logger.debug('RBAC - user accessing own data', {
          userId: currentUserId
        });
        return next();
      }

      logger.warn('RBAC check failed - not self or admin', {
        userId: currentUserId,
        requestedUserId,
        userRole,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
        error: 'Você só pode acessar seus próprios dados',
        code: constants.ERROR_CODES.AUTHZ_FORBIDDEN
      });
    } catch (error) {
      logger.error('RBAC self-or-admin check error', {
        error: error.message,
        userId: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões',
        code: constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  };
}

/**
 * Require doctor to be assigned to patient
 * Validates doctor-patient relationship before allowing access
 * 
 * @param {string} patientIdParam - Name of the URL parameter containing patient ID (default: 'patientId')
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/patients/:patientId/prescriptions', auth, requireRole('doctor'), requireAssignedPatient(), getPrescriptions);
 */
function requireAssignedPatient(patientIdParam = 'patientId') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticação necessária',
          code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
        });
      }

      const patientId = req.params[patientIdParam];
      const userRole = req.user.role;

      // Admin can access any patient
      if (userRole === constants.ROLES.ADMIN) {
        return next();
      }

      // Patient can access their own data
      if (userRole === constants.ROLES.PATIENT) {
        // Get patient record for this user
        const { supabase } = require('../config/supabase');
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', req.user.id)
          .single();

        if (patient && patient.id === patientId) {
          return next();
        }
      }

      // Doctor must be assigned to patient
      if (userRole === constants.ROLES.DOCTOR) {
        const { supabase } = require('../config/supabase');
        
        // Get doctor record
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', req.user.id)
          .single();

        if (!doctor) {
          logger.warn('Doctor record not found', { userId: req.user.id });
          return res.status(403).json({
            success: false,
            message: 'Registro de médico não encontrado',
            code: constants.ERROR_CODES.AUTHZ_FORBIDDEN
          });
        }

        // Check if doctor is assigned to patient
        const { data: patient } = await supabase
          .from('patients')
          .select('id, doctor_id')
          .eq('id', patientId)
          .single();

        if (!patient) {
          logger.warn('Patient not found', { patientId });
          return res.status(404).json({
            success: false,
            message: 'Paciente não encontrado',
            code: constants.ERROR_CODES.BUSINESS_PATIENT_NOT_FOUND
          });
        }

        if (patient.doctor_id !== doctor.id) {
          logger.warn('Doctor not assigned to patient', {
            doctorId: doctor.id,
            patientId,
            assignedDoctorId: patient.doctor_id
          });
          
          return res.status(403).json({
            success: false,
            message: 'Acesso negado',
            error: 'Médico não autorizado para este paciente',
            code: constants.ERROR_CODES.AUTHZ_DOCTOR_NOT_ASSIGNED
          });
        }

        logger.debug('Doctor-patient relationship verified', {
          doctorId: doctor.id,
          patientId
        });
        
        return next();
      }

      // Secretary has limited access (no medical data)
      if (userRole === constants.ROLES.SECRETARY) {
        // Secretaries can access patient administrative data but not medical records
        // This should be handled at the route level
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Acesso negado',
        code: constants.ERROR_CODES.AUTHZ_FORBIDDEN
      });
    } catch (error) {
      logger.error('RBAC assigned patient check error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        patientId: req.params[patientIdParam]
      });

      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões',
        code: constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  };
}

module.exports = {
  requireRole,
  requireSelfOrAdmin,
  requireAssignedPatient
};
