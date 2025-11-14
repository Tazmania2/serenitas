/**
 * Unit Tests for Authentication Service
 * 
 * Tests cover:
 * - User registration (happy path, edge cases, errors)
 * - User login (happy path, invalid credentials, errors)
 * - Token generation and verification
 * - Password change functionality
 * - Password reset flow
 * 
 * Requirements: 2.2, 2.3, 2.4, 12.8, 12.9
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../../services/authService');
const { supabase } = require('../../config/supabase');
const { constants } = require('../../config');

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('register', () => {
    /**
     * Test 1: Happy Path
     * Scenario: Valid user registration with all required fields
     * Expected: User created successfully with hashed password
     */
    it('should register a new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        phone: '(11) 98765-4321',
        role: 'patient'
      };

      const mockCreatedUser = {
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        created_at: new Date().toISOString()
      };

      // Mock: First call checks if user exists, second call creates user
      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check if user exists
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
        } else {
          // Second call: create user
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCreatedUser,
                  error: null
                })
              })
            })
          };
        }
      });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.role).toBe(userData.role);
      expect(result.password_hash).toBeUndefined(); // Password should not be returned
    });

    /**
     * Test 2: Error Case - Duplicate Email
     * Scenario: Attempting to register with an existing email
     * Expected: Should throw error with Portuguese message
     */
    it('should reject registration with duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'patient'
      };

      // Mock: User already exists
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-user-id', email: userData.email },
              error: null
            })
          })
        })
      });

      // Act & Assert
      await expect(authService.register(userData))
        .rejects
        .toThrow('Email já cadastrado');
    });

    /**
     * Test 3: Error Case - Invalid Role
     * Scenario: Registration with invalid role
     * Expected: Should throw validation error
     */
    it('should reject registration with invalid role', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'invalid_role'
      };

      // Act & Assert
      await expect(authService.register(userData))
        .rejects
        .toThrow(/Função inválida/);
    });

    /**
     * Test 4: Edge Case - Default Role
     * Scenario: Registration without specifying role
     * Expected: Should default to 'patient' role
     */
    it('should default to patient role when role not specified', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
        // No role specified
      };

      const mockCreatedUser = {
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        role: 'patient', // Default role
        created_at: new Date().toISOString()
      };

      // Mock: First call checks if user exists, second call creates user
      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
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
        } else {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCreatedUser,
                  error: null
                })
              })
            })
          };
        }
      });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.role).toBe('patient');
    });

    /**
     * Test 5: Security - Password Hashing
     * Scenario: Verify password is hashed with bcrypt
     * Expected: Password should be hashed with correct cost factor
     */
    it('should hash password with bcrypt cost factor 12', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'patient'
      };

      let capturedPasswordHash;

      // Mock: First call checks if user exists, second call creates user
      let callCount = 0;
      supabase.from = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
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
        } else {
          return {
            insert: jest.fn().mockImplementation((data) => {
              capturedPasswordHash = data[0].password_hash;
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'user-123', ...data[0] },
                    error: null
                  })
                })
              };
            })
          };
        }
      });

      // Act
      await authService.register(userData);

      // Assert
      expect(capturedPasswordHash).toBeDefined();
      expect(capturedPasswordHash).not.toBe(userData.password);
      
      // Verify it's a valid bcrypt hash
      const isValidHash = await bcrypt.compare(userData.password, capturedPasswordHash);
      expect(isValidHash).toBe(true);
    });
  });

  describe('login', () => {
    /**
     * Test 6: Happy Path
     * Scenario: Valid login with correct credentials
     * Expected: Returns user object and JWT token
     */
    it('should login user with valid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'SecurePass123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const mockUser = {
        id: 'user-123',
        email,
        password_hash: passwordHash,
        name: 'Test User',
        phone: '(11) 98765-4321',
        role: 'patient',
        last_login_at: null
      };

      // Mock: Find user
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.password_hash).toBeUndefined(); // Password should not be returned
      
      // Verify token is valid JWT
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe('patient');
    });

    /**
     * Test 7: Error Case - Invalid Email
     * Scenario: Login with non-existent email
     * Expected: Should throw error without revealing user doesn't exist
     */
    it('should reject login with invalid email', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'SecurePass123!';

      // Mock: User not found
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

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow('Email ou senha inválidos');
    });

    /**
     * Test 8: Error Case - Invalid Password
     * Scenario: Login with correct email but wrong password
     * Expected: Should throw error without revealing which field is wrong
     */
    it('should reject login with invalid password', async () => {
      // Arrange
      const email = 'test@example.com';
      const correctPassword = 'SecurePass123!';
      const wrongPassword = 'WrongPassword456!';
      const passwordHash = await bcrypt.hash(correctPassword, 12);

      const mockUser = {
        id: 'user-123',
        email,
        password_hash: passwordHash,
        name: 'Test User',
        role: 'patient'
      };

      // Mock: Find user
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

      // Act & Assert
      await expect(authService.login(email, wrongPassword))
        .rejects
        .toThrow('Email ou senha inválidos');
    });

    /**
     * Test 9: Business Logic - Last Login Update
     * Scenario: Successful login should update last_login_at
     * Expected: Database update called with current timestamp
     */
    it('should update last login timestamp on successful login', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'SecurePass123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const mockUser = {
        id: 'user-123',
        email,
        password_hash: passwordHash,
        name: 'Test User',
        role: 'patient',
        last_login_at: null
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      // Mock: Find user and update
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        }),
        update: mockUpdate
      });

      // Act
      await authService.login(email, password);

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall).toHaveProperty('last_login_at');
      expect(new Date(updateCall.last_login_at)).toBeInstanceOf(Date);
    });
  });

  describe('generateToken', () => {
    /**
     * Test 10: Token Generation
     * Scenario: Generate JWT token for user
     * Expected: Valid JWT with correct payload and expiration
     */
    it('should generate valid JWT token with user data', () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient'
      };

      // Act
      const token = authService.generateToken(user);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token contents
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
      expect(decoded.exp).toBeDefined(); // Expiration should be set
    });

    /**
     * Test 11: Token Expiration
     * Scenario: Token should have correct expiration time
     * Expected: Token expires in 7 days
     */
    it('should generate token with 7-day expiration', () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient'
      };

      // Act
      const token = authService.generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Assert
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const expectedExpiration = now + sevenDaysInSeconds;

      // Allow 10 seconds tolerance for test execution time
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 10);
    });
  });

  describe('verifyToken', () => {
    /**
     * Test 12: Token Verification
     * Scenario: Verify valid JWT token
     * Expected: Returns decoded payload
     */
    it('should verify valid token and return payload', async () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient'
      };
      const token = authService.generateToken(user);

      // Act
      const decoded = await authService.verifyToken(token);

      // Assert
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    /**
     * Test 13: Error Case - Invalid Token
     * Scenario: Verify malformed or invalid token
     * Expected: Should throw error with Portuguese message
     */
    it('should reject invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here';

      // Act & Assert
      await expect(authService.verifyToken(invalidToken))
        .rejects
        .toThrow('Token inválido');
    });

    /**
     * Test 14: Error Case - Expired Token
     * Scenario: Verify expired token
     * Expected: Should throw error indicating token expired
     */
    it('should reject expired token', async () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient'
      };

      // Create token that expires immediately
      const expiredToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act & Assert
      await expect(authService.verifyToken(expiredToken))
        .rejects
        .toThrow('Token expirado');
    });
  });

  describe('changePassword', () => {
    /**
     * Test 15: Happy Path
     * Scenario: Change password with valid old password
     * Expected: Password updated successfully
     */
    it('should change password with valid old password', async () => {
      // Arrange
      const userId = 'user-123';
      const oldPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';
      const oldPasswordHash = await bcrypt.hash(oldPassword, 12);

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: oldPasswordHash
      };

      // Mock: Get user
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      // Act
      const result = await authService.changePassword(userId, oldPassword, newPassword);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 16: Error Case - Wrong Old Password
     * Scenario: Attempt to change password with incorrect old password
     * Expected: Should throw error
     */
    it('should reject password change with wrong old password', async () => {
      // Arrange
      const userId = 'user-123';
      const oldPassword = 'OldPass123!';
      const wrongOldPassword = 'WrongPass123!';
      const newPassword = 'NewPass456!';
      const oldPasswordHash = await bcrypt.hash(oldPassword, 12);

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password_hash: oldPasswordHash
      };

      // Mock: Get user
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

      // Act & Assert
      await expect(authService.changePassword(userId, wrongOldPassword, newPassword))
        .rejects
        .toThrow('Senha atual incorreta');
    });

    /**
     * Test 17: Error Case - User Not Found
     * Scenario: Attempt to change password for non-existent user
     * Expected: Should throw error
     */
    it('should reject password change for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const oldPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';

      // Mock: User not found
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

      // Act & Assert
      await expect(authService.changePassword(userId, oldPassword, newPassword))
        .rejects
        .toThrow('Usuário não encontrado');
    });
  });

  describe('requestPasswordReset', () => {
    /**
     * Test 18: Happy Path
     * Scenario: Request password reset for existing user
     * Expected: Returns reset token
     */
    it('should generate reset token for existing user', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User'
      };

      // Mock: Find user
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
      const resetToken = await authService.requestPasswordReset(email);

      // Assert
      expect(resetToken).toBeDefined();
      expect(typeof resetToken).toBe('string');

      // Verify token is valid JWT
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(email);
      expect(decoded.purpose).toBe('password_reset');
    });

    /**
     * Test 19: Security - Non-Existent User
     * Scenario: Request password reset for non-existent email
     * Expected: Should not reveal user doesn't exist (returns null)
     */
    it('should not reveal if user does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      // Mock: User not found
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
      const resetToken = await authService.requestPasswordReset(email);

      // Assert
      expect(resetToken).toBeNull();
    });
  });

  describe('resetPassword', () => {
    /**
     * Test 20: Happy Path
     * Scenario: Reset password with valid reset token
     * Expected: Password updated successfully
     */
    it('should reset password with valid reset token', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const newPassword = 'NewSecurePass123!';

      // Generate valid reset token
      const resetToken = jwt.sign(
        { userId, email, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Mock: Update password
      supabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      // Act
      const result = await authService.resetPassword(resetToken, newPassword);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 21: Error Case - Invalid Token Purpose
     * Scenario: Attempt to reset password with regular JWT token
     * Expected: Should reject token
     */
    it('should reject token without password_reset purpose', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const newPassword = 'NewSecurePass123!';

      // Generate token without password_reset purpose
      const invalidToken = jwt.sign(
        { userId, email }, // Missing purpose
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Act & Assert
      await expect(authService.resetPassword(invalidToken, newPassword))
        .rejects
        .toThrow('Token inválido para redefinição de senha');
    });

    /**
     * Test 22: Error Case - Expired Reset Token
     * Scenario: Attempt to reset password with expired token
     * Expected: Should throw error indicating token expired
     */
    it('should reject expired reset token', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const newPassword = 'NewSecurePass123!';

      // Generate expired token
      const expiredToken = jwt.sign(
        { userId, email, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act & Assert
      await expect(authService.resetPassword(expiredToken, newPassword))
        .rejects
        .toThrow('Token de redefinição expirado');
    });
  });

  describe('getUserById', () => {
    /**
     * Test 23: Happy Path
     * Scenario: Get user by valid ID
     * Expected: Returns user object without password
     */
    it('should return user by ID without password', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        phone: '(11) 98765-4321',
        role: 'patient',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock: Find user
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
      const result = await authService.getUserById(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.email).toBe(mockUser.email);
      expect(result.password_hash).toBeUndefined();
    });

    /**
     * Test 24: Error Case - User Not Found
     * Scenario: Get user with non-existent ID
     * Expected: Should throw error
     */
    it('should throw error for non-existent user ID', async () => {
      // Arrange
      const userId = 'non-existent-user';

      // Mock: User not found
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

      // Act & Assert
      await expect(authService.getUserById(userId))
        .rejects
        .toThrow('Usuário não encontrado');
    });
  });
});
