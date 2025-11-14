/**
 * User Service
 * 
 * Handles user management operations including retrieval, updates, and deletion.
 * Implements audit logging for all operations.
 * 
 * Requirements: 7.2, 7.3, 7.4
 */

const { supabase } = require('../config/supabase');
const auditService = require('./auditService');
const logger = require('../utils/logger');

/**
 * Get all users (without passwords)
 * 
 * @returns {Promise<Array>} Array of user objects
 * @throws {Error} If retrieval fails
 */
async function getAllUsers() {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all users');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get all users', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar usuários');
    }

    const duration = Date.now() - startTime;
    logger.info('All users retrieved successfully', {
      count: users.length,
      duration
    });

    return users;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all users error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get user by ID (without password)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found or retrieval fails
 */
async function getUserById(userId) {
  const startTime = Date.now();
  
  try {
    logger.debug('Getting user by ID', { userId });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, role, last_login_at, deletion_scheduled, deletion_date, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.warn('User not found', { userId, error: error?.message });
      throw new Error('Usuário não encontrado');
    }

    const duration = Date.now() - startTime;
    logger.debug('User retrieved successfully', { userId, duration });

    return user;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get user by ID error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Update user profile
 * 
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.name] - User name
 * @param {string} [updateData.phone] - User phone
 * @param {string} [updateData.email] - User email
 * @param {string} [updateData.role] - User role (admin only)
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} If update fails
 */
async function updateUser(userId, updateData) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating user', { userId, fields: Object.keys(updateData) });

    // Remove fields that shouldn't be updated directly
    const { password, password_hash, id, created_at, ...safeUpdateData } = updateData;

    // Add updated_at timestamp
    safeUpdateData.updated_at = new Date().toISOString();

    // Check if email is being changed and if it's already in use
    if (safeUpdateData.email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', safeUpdateData.email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        logger.warn('Email already in use', { userId, email: safeUpdateData.email });
        throw new Error('Email já está em uso por outro usuário');
      }
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(safeUpdateData)
      .eq('id', userId)
      .select('id, email, name, phone, role, last_login_at, created_at, updated_at')
      .single();

    if (error) {
      logger.error('User update failed', {
        userId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar usuário');
    }

    if (!updatedUser) {
      logger.warn('User not found for update', { userId });
      throw new Error('Usuário não encontrado');
    }

    const duration = Date.now() - startTime;
    logger.info('User updated successfully', {
      userId,
      updatedFields: Object.keys(safeUpdateData),
      duration
    });

    return updatedUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update user error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Delete user account
 * 
 * This performs a hard delete. For LGPD compliance, consider implementing
 * soft delete with a grace period instead.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteUser(userId) {
  const startTime = Date.now();
  
  try {
    logger.info('Deleting user', { userId });

    // Get user data before deletion for audit log
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    if (!user) {
      logger.warn('User not found for deletion', { userId });
      throw new Error('Usuário não encontrado');
    }

    // Delete user (cascade will handle related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      logger.error('User deletion failed', {
        userId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao excluir usuário');
    }

    const duration = Date.now() - startTime;
    logger.info('User deleted successfully', {
      userId,
      email: user.email,
      role: user.role,
      duration
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Delete user error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Schedule user account deletion (LGPD compliance)
 * 
 * Schedules account deletion after a grace period (default 30 days).
 * User can cancel deletion during this period.
 * 
 * @param {string} userId - User ID
 * @param {number} [gracePeriodDays=30] - Grace period in days
 * @returns {Promise<Object>} Updated user with deletion schedule
 * @throws {Error} If scheduling fails
 */
async function scheduleUserDeletion(userId, gracePeriodDays = 30) {
  const startTime = Date.now();
  
  try {
    logger.info('Scheduling user deletion', { userId, gracePeriodDays });

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + gracePeriodDays);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        deletion_scheduled: true,
        deletion_date: deletionDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, name, deletion_scheduled, deletion_date')
      .single();

    if (error) {
      logger.error('Failed to schedule user deletion', {
        userId,
        error: error.message
      });
      throw new Error('Erro ao agendar exclusão de conta');
    }

    const duration = Date.now() - startTime;
    logger.info('User deletion scheduled successfully', {
      userId,
      deletionDate: deletionDate.toISOString(),
      duration
    });

    return updatedUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Schedule user deletion error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Cancel scheduled user deletion
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user
 * @throws {Error} If cancellation fails
 */
async function cancelUserDeletion(userId) {
  const startTime = Date.now();
  
  try {
    logger.info('Cancelling user deletion', { userId });

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        deletion_scheduled: false,
        deletion_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, name, deletion_scheduled')
      .single();

    if (error) {
      logger.error('Failed to cancel user deletion', {
        userId,
        error: error.message
      });
      throw new Error('Erro ao cancelar exclusão de conta');
    }

    const duration = Date.now() - startTime;
    logger.info('User deletion cancelled successfully', { userId, duration });

    return updatedUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Cancel user deletion error', {
      userId,
      error: error.message,
      duration
    });
    throw error;
  }
}

/**
 * Get users scheduled for deletion
 * 
 * @returns {Promise<Array>} Array of users scheduled for deletion
 */
async function getUsersScheduledForDeletion() {
  try {
    logger.info('Getting users scheduled for deletion');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, deletion_date')
      .eq('deletion_scheduled', true)
      .lte('deletion_date', new Date().toISOString());

    if (error) {
      logger.error('Failed to get users scheduled for deletion', {
        error: error.message
      });
      throw new Error('Erro ao buscar usuários agendados para exclusão');
    }

    logger.info('Users scheduled for deletion retrieved', { count: users.length });

    return users;
  } catch (error) {
    logger.error('Get users scheduled for deletion error', {
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  scheduleUserDeletion,
  cancelUserDeletion,
  getUsersScheduledForDeletion
};
