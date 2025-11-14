/**
 * Unit Tests for Authentication Middleware
 * 
 * Tests cover:
 * - Token extraction from Authorization header
 * - Token verification
 * - User fetching from database
 * - Error handling (missing token, invalid token, expired token)
 * - Optional authentication
 * 
 * Requirements: 2.5
 */

const { auth, optionalAuth } = require('../../middleware/auth');
const authService = require('../../services/authService');
const { supabase } = require('../../config/supabase');
const { constants } = require('../../config');

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request object
    req = {
      header: jest.fn(),
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('auth middleware', () => {
    /**
     * Test 1: Happy Path
     * Scenario: Valid token with existing user
     * Expected: User attached to request, next() called
     */
    it('should authenticate user with valid token', async () => {
      // Arrange
      const token = 'valid-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '(11) 98765-4321',
        role: 'patient',
        last_login_at: new Date().toISOString()
      };

      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockResolvedValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });

      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      // Act
      await auth(req, res, next);

      // Assert
      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe(token);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 2: Error Case - No Authorization Header
     * Scenario: Request without Authorization header
     * Expected: 401 error with Portuguese message
     */
    it('should reject request without Authorization header', async () => {
      // Arrange
      req.header.mockReturnValue(undefined);

      // Act
      await auth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Autenticação necessária',
          error: 'Token não fornecido',
          code: constants.ERROR_CODES.AUTH_UNAUTHORIZED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 3: Error Case - Empty Token
     * Scenario: Authorization header without token
     * Expected: 401 error
     */
    it('should reject request with empty token', async () => {
      // Arrange
      req.header.mockReturnValue('Bearer ');

      // Act
      await auth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Token não fornecido'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 4: Error Case - Invalid Token
     * Scenario: Token verification fails
     * Expected: 401 error with appropriate message
     */
    it('should reject request with invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockRejectedValue(
        new Error('Token inválido')
      );

      // Act
      await auth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Autenticação falhou',
          code: constants.ERROR_CODES.AUTH_TOKEN_INVALID
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 5: Error Case - Expired Token
     * Scenario: Token has expired
     * Expected: 401 error indicating token expired
     */
    it('should reject request with expired token', async () => {
      // Arrange
      const token = 'expired-token';
      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockRejectedValue(
        new Error('Token expirado. Faça login novamente.')
      );

      // Act
      await auth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expirado',
          error: 'Faça login novamente',
          code: constants.ERROR_CODES.AUTH_TOKEN_EXPIRED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 6: Error Case - User Not Found
     * Scenario: Token is valid but user doesn't exist in database
     * Expected: 401 error
     */
    it('should reject request when user not found', async () => {
      // Arrange
      const token = 'valid-token';
      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockResolvedValue({
        userId: 'non-existent-user',
        email: 'test@example.com',
        role: 'patient'
      });

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

      // Act
      await auth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token inválido',
          error: 'Usuário não encontrado',
          code: constants.ERROR_CODES.AUTH_TOKEN_INVALID
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test 7: Edge Case - Token Without Bearer Prefix
     * Scenario: Authorization header has token but no "Bearer " prefix
     * Expected: Should still work (token extraction handles this)
     */
    it('should handle token without Bearer prefix', async () => {
      // Arrange
      const token = 'valid-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient'
      };

      req.header.mockReturnValue(token); // No "Bearer " prefix
      
      authService.verifyToken.mockResolvedValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });

      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      // Act
      await auth(req, res, next);

      // Assert
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    /**
     * Test 8: Happy Path - Valid Token
     * Scenario: Valid token provided
     * Expected: User attached to request, next() called
     */
    it('should attach user when valid token provided', async () => {
      // Arrange
      const token = 'valid-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'patient'
      };

      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockResolvedValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });

      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      // Act
      await optionalAuth(req, res, next);

      // Assert
      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe(token);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 9: No Token - Should Continue
     * Scenario: No Authorization header provided
     * Expected: next() called without user, no error
     */
    it('should continue without user when no token provided', async () => {
      // Arrange
      req.header.mockReturnValue(undefined);

      // Act
      await optionalAuth(req, res, next);

      // Assert
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 10: Invalid Token - Should Continue
     * Scenario: Invalid token provided
     * Expected: next() called without user, no error
     */
    it('should continue without user when token is invalid', async () => {
      // Arrange
      const token = 'invalid-token';
      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockRejectedValue(
        new Error('Token inválido')
      );

      // Act
      await optionalAuth(req, res, next);

      // Assert
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    /**
     * Test 11: User Not Found - Should Continue
     * Scenario: Token valid but user doesn't exist
     * Expected: next() called without user, no error
     */
    it('should continue without user when user not found', async () => {
      // Arrange
      const token = 'valid-token';
      req.header.mockReturnValue(`Bearer ${token}`);
      
      authService.verifyToken.mockResolvedValue({
        userId: 'non-existent-user',
        email: 'test@example.com',
        role: 'patient'
      });

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

      // Act
      await optionalAuth(req, res, next);

      // Assert
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
