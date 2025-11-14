/**
 * Unit Tests for RBAC Middleware
 * 
 * Tests cover:
 * - Role-based access control
 * - Self-or-admin access patterns
 * - Doctor-patient relationship validation
 * - Multiple role permissions
 * - Error handling
 * 
 * Requirements: 2.6, 2.7, 2.8, 2.9, 2.10
 */

const { requireRole, requireSelfOrAdmin, requireAssignedPatient } = require('../../middleware/rbac');
const { supabase } = require('../../config/supabase');
const { constants } = require('../../config');

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: null,
      params: {},
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('requireRole', () => {
    /**
     * Test 1: Happy Path - Single Role Match
     * Scenario: User has required role
     * Expected: next() called
     */
    it('should allow access when user has required role', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'admin'
      };

      const middleware = requireRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 2: Happy Path - Multiple Roles
     * Scenario: User has one of multiple allowed roles
     * Expected: next() called
     */
    it('should allow access when user has one of multiple allowed roles', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'doctor@example.com',
        role: 'doctor'
      };

      const middleware = requireRole('doctor', 'secretary', 'admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 3: Error Case - No User
     * Scenario: Request without authenticated user
     * Expected: 401 error
     */
    it('should reject request without authenticated user', () => {
      // Arrange
      req.user = null;
      const middleware = requireRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Autenticação necessária',
          code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 4: Error Case - Insufficient Permissions
     * Scenario: User doesn't have required role
     * Expected: 403 error
     */
    it('should reject request when user lacks required role', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient'
      };

      const middleware = requireRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Acesso negado',
          error: 'Permissões insuficientes',
          code: constants.ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 5: Edge Case - Patient Trying Admin Endpoint
     * Scenario: Patient role attempting admin-only endpoint
     * Expected: 403 error
     */
    it('should reject patient accessing admin endpoint', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient'
      };

      const middleware = requireRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 6: Edge Case - Secretary Trying Doctor Endpoint
     * Scenario: Secretary attempting doctor-only endpoint
     * Expected: 403 error
     */
    it('should reject secretary accessing doctor-only endpoint', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'secretary@example.com',
        role: 'secretary'
      };

      const middleware = requireRole('doctor');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireSelfOrAdmin', () => {
    /**
     * Test 7: Happy Path - User Accessing Own Data
     * Scenario: User accessing their own profile
     * Expected: next() called
     */
    it('should allow user to access own data', () => {
      // Arrange
      const userId = 'user-123';
      req.user = {
        id: userId,
        email: 'user@example.com',
        role: 'patient'
      };
      req.params = { userId };

      const middleware = requireSelfOrAdmin();

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 8: Happy Path - Admin Accessing Any User
     * Scenario: Admin accessing another user's data
     * Expected: next() called
     */
    it('should allow admin to access any user data', () => {
      // Arrange
      req.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      };
      req.params = { userId: 'other-user-456' };

      const middleware = requireSelfOrAdmin();

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 9: Error Case - User Accessing Other User's Data
     * Scenario: Non-admin user trying to access another user's data
     * Expected: 403 error
     */
    it('should reject user accessing other user data', () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'patient'
      };
      req.params = { userId: 'other-user-456' };

      const middleware = requireSelfOrAdmin();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Acesso negado',
          error: 'Você só pode acessar seus próprios dados',
          code: constants.ERROR_CODES.AUTHZ_FORBIDDEN
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 10: Error Case - No User
     * Scenario: Unauthenticated request
     * Expected: 401 error
     */
    it('should reject unauthenticated request', () => {
      // Arrange
      req.user = null;
      req.params = { userId: 'user-123' };

      const middleware = requireSelfOrAdmin();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 11: Edge Case - Custom Parameter Name
     * Scenario: Using custom parameter name for user ID
     * Expected: Should work with custom parameter
     */
    it('should work with custom parameter name', () => {
      // Arrange
      const userId = 'user-123';
      req.user = {
        id: userId,
        email: 'user@example.com',
        role: 'patient'
      };
      req.params = { customId: userId };

      const middleware = requireSelfOrAdmin('customId');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAssignedPatient', () => {
    /**
     * Test 12: Happy Path - Admin Access
     * Scenario: Admin accessing any patient
     * Expected: next() called immediately
     */
    it('should allow admin to access any patient', async () => {
      // Arrange
      req.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      };
      req.params = { patientId: 'patient-456' };

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 13: Happy Path - Patient Accessing Own Data
     * Scenario: Patient accessing their own medical records
     * Expected: next() called
     */
    it('should allow patient to access own data', async () => {
      // Arrange
      const patientId = 'patient-123';
      req.user = {
        id: 'user-123',
        email: 'patient@example.com',
        role: 'patient'
      };
      req.params = { patientId };

      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: patientId, user_id: req.user.id },
              error: null
            })
          })
        })
      });

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 14: Happy Path - Assigned Doctor
     * Scenario: Doctor accessing assigned patient
     * Expected: next() called
     */
    it('should allow doctor to access assigned patient', async () => {
      // Arrange
      const doctorId = 'doctor-123';
      const patientId = 'patient-456';
      
      req.user = {
        id: 'user-123',
        email: 'doctor@example.com',
        role: 'doctor'
      };
      req.params = { patientId };

      // Mock doctor lookup
      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get doctor record
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: doctorId, user_id: req.user.id },
                  error: null
                })
              })
            })
          };
        } else {
          // Second call: check patient assignment
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: patientId, doctor_id: doctorId },
                  error: null
                })
              })
            })
          };
        }
      });

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 15: Error Case - Doctor Not Assigned
     * Scenario: Doctor trying to access unassigned patient
     * Expected: 403 error
     */
    it('should reject doctor accessing unassigned patient', async () => {
      // Arrange
      const doctorId = 'doctor-123';
      const patientId = 'patient-456';
      const otherDoctorId = 'doctor-789';
      
      req.user = {
        id: 'user-123',
        email: 'doctor@example.com',
        role: 'doctor'
      };
      req.params = { patientId };

      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: doctorId, user_id: req.user.id },
                  error: null
                })
              })
            })
          };
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: patientId, doctor_id: otherDoctorId }, // Different doctor
                  error: null
                })
              })
            })
          };
        }
      });

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Acesso negado',
          error: 'Médico não autorizado para este paciente',
          code: constants.ERROR_CODES.AUTHZ_DOCTOR_NOT_ASSIGNED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 16: Error Case - Patient Not Found
     * Scenario: Accessing non-existent patient
     * Expected: 404 error
     */
    it('should return 404 when patient not found', async () => {
      // Arrange
      const doctorId = 'doctor-123';
      const patientId = 'non-existent-patient';
      
      req.user = {
        id: 'user-123',
        email: 'doctor@example.com',
        role: 'doctor'
      };
      req.params = { patientId };

      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: doctorId, user_id: req.user.id },
                  error: null
                })
              })
            })
          };
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          };
        }
      });

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Paciente não encontrado',
          code: constants.ERROR_CODES.BUSINESS_PATIENT_NOT_FOUND
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 17: Error Case - Doctor Record Not Found
     * Scenario: User has doctor role but no doctor record
     * Expected: 403 error
     */
    it('should reject when doctor record not found', async () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'doctor@example.com',
        role: 'doctor'
      };
      req.params = { patientId: 'patient-456' };

      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Registro de médico não encontrado'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 18: Happy Path - Secretary Access
     * Scenario: Secretary accessing patient administrative data
     * Expected: next() called (route-level restrictions apply)
     */
    it('should allow secretary access for administrative tasks', async () => {
      // Arrange
      req.user = {
        id: 'user-123',
        email: 'secretary@example.com',
        role: 'secretary'
      };
      req.params = { patientId: 'patient-456' };

      const middleware = requireAssignedPatient();

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
