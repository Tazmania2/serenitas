/**
 * Authentication Service
 * 
 * Handles user registration, login, token generation, and password management.
 * Uses bcrypt for password hashing and JWT for token generation.
 * 
 * Requirements: 2.2, 2.3, 2.4, 12.8, 12.9
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { constants } = require('../config');
const logger = require('../utils/logger');

/**
 * Register a new user
 * 
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password (plain text)
 * @param {string} userData.name - User full name
 * @param {string} userData.phone - User phone number (optional)
 * @param {string} userData.role - User role (patient, doctor, secretary, admin)
 * @returns {Promise<Object>} Created user object (without password)
 * @throws {Error} If registration fails
 */
async function register(userData) {
  const startTime = Date.now();
  
  try {
    const { email, password, name, phone, role = constants.ROLES.PATIENT } = userData;

    logger.info('User registration attempt', { email, role });

    // Validate role
    const validRoles = Object.values(constants.ROLES);
    if (!validRoles.includes(role)) {
      throw new Error(`Função inválida. Deve ser: ${validRoles.join(', ')}`);
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      logger.warn('Registration failed - email already exists', { email });
      throw new Error('Email já cadastrado');
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(constants.PASSWORD.BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user in database
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          name,
          phone,
          role
        }
      ])
      .select('id, email, name, phone, role, created_at')
      .single();

    if (createError) {
      logger.error('User registration failed', {
        error: createError.message,
        code: createError.code
      });
      throw new Error('Erro ao criar usuário');
    }

    const duration = Date.now() - startTime;
    logger.info('User registered successfully', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      duration
    });

    return newUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Login user with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password (plain text)
 * @returns {Promise<Object>} Object containing user and JWT token
 * @throws {Error} If login fails
 */
async function login(email, password) {
  const startTime = Date.now();
  
  try {
    logger.info('Login attempt', { email });

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, phone, role, last_login_at')
      .eq('email', email)
      .single();

    if (findError || !user) {
      logger.warn('Login failed - user not found', { email });
      throw new Error('Email ou senha inválidos');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Login failed - invalid password', { email, userId: user.id });
      throw new Error('Email ou senha inválidos');
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = generateToken(user);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    const duration = Date.now() - startTime;
    logger.info('Login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      duration
    });

    return {
      user: userWithoutPassword,
      token
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Login error', {
      email,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Generate JWT token for user
 * 
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: constants.JWT.EXPIRATION,
      algorithm: constants.JWT.ALGORITHM
    }
  );

  logger.debug('JWT token generated', {
    userId: user.id,
    expiresIn: constants.JWT.EXPIRATION
  });

  return token;
}

/**
 * Verify JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [constants.JWT.ALGORITHM]
    });

    logger.debug('Token verified', { userId: decoded.userId });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', { error: error.message });
      throw new Error('Token expirado. Faça login novamente.');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', { error: error.message });
      throw new Error('Token inválido');
    } else {
      logger.error('Token verification error', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('Erro ao verificar token');
    }
  }
}

/**
 * Change user password
 * 
 * @param {string} userId - User ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if password changed successfully
 * @throws {Error} If password change fails
 */
async function changePassword(userId, oldPassword, newPassword) {
  const startTime = Date.now();
  
  try {
    logger.info('Password change attempt', { userId });

    // Get user with password hash
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('id', userId)
      .single();

    if (findError || !user) {
      throw new Error('Usuário não encontrado');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

    if (!isOldPasswordValid) {
      logger.warn('Password change failed - invalid old password', { userId });
      throw new Error('Senha atual incorreta');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(constants.PASSWORD.BCRYPT_ROUNDS);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) {
      logger.error('Password update failed', {
        userId,
        error: updateError.message
      });
      throw new Error('Erro ao atualizar senha');
    }

    const duration = Date.now() - startTime;
    logger.info('Password changed successfully', { userId, duration });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Password change error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Request password reset (generates reset token)
 * 
 * @param {string} email - User email
 * @returns {Promise<string>} Password reset token
 * @throws {Error} If user not found
 */
async function requestPasswordReset(email) {
  try {
    logger.info('Password reset requested', { email });

    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (findError || !user) {
      // Don't reveal if user exists for security
      logger.warn('Password reset requested for non-existent email', { email });
      return null;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info('Password reset token generated', { userId: user.id });

    // TODO: Send reset token via email
    // For now, return the token (in production, this should be sent via email)
    return resetToken;
  } catch (error) {
    logger.error('Password reset request error', {
      email,
      error: error.message
    });
    throw error;
  }
}

/**
 * Reset password using reset token
 * 
 * @param {string} resetToken - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if password reset successfully
 * @throws {Error} If reset fails
 */
async function resetPassword(resetToken, newPassword) {
  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    if (decoded.purpose !== 'password_reset') {
      throw new Error('Token inválido para redefinição de senha');
    }

    logger.info('Password reset attempt', { userId: decoded.userId });

    // Hash new password
    const salt = await bcrypt.genSalt(constants.PASSWORD.BCRYPT_ROUNDS);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', decoded.userId);

    if (updateError) {
      logger.error('Password reset failed', {
        userId: decoded.userId,
        error: updateError.message
      });
      throw new Error('Erro ao redefinir senha');
    }

    logger.info('Password reset successfully', { userId: decoded.userId });

    return true;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Password reset token expired');
      throw new Error('Token de redefinição expirado. Solicite um novo.');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid password reset token');
      throw new Error('Token de redefinição inválido');
    }
    
    logger.error('Password reset error', { error: error.message });
    throw error;
  }
}

/**
 * Get user by ID
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object (without password)
 * @throws {Error} If user not found
 */
async function getUserById(userId) {
  try {
    logger.debug('Getting user by ID', { userId });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.warn('User not found', { userId });
      throw new Error('Usuário não encontrado');
    }

    return user;
  } catch (error) {
    logger.error('Get user by ID error', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update user's last login timestamp
 * 
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateLastLogin(userId) {
  try {
    logger.debug('Updating last login', { userId });

    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update last login', {
        userId,
        error: error.message
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Update last login error', {
      userId,
      error: error.message
    });
    return false;
  }
}

module.exports = {
  register,
  login,
  generateToken,
  verifyToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getUserById,
  updateLastLogin
};
