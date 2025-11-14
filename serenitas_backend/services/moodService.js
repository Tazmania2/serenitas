/**
 * Mood Entry Service
 * 
 * Handles mood tracking business logic including entry creation,
 * retrieval by date range, and mood statistics calculation.
 * 
 * Requirements: 4.8, 4.9, 5.7
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');

/**
 * Create mood entry
 * 
 * @param {Object} moodData - Mood entry data
 * @param {string} moodData.patient_id - Patient UUID
 * @param {number} moodData.mood_level - Mood level (1-5)
 * @param {number} moodData.stress_level - Stress level (1-5, optional)
 * @param {number} moodData.anxiety_level - Anxiety level (1-5, optional)
 * @param {number} moodData.depression_level - Depression level (1-5, optional)
 * @param {number} moodData.sleep_hours - Sleep hours (optional)
 * @param {number} moodData.exercise_minutes - Exercise minutes (optional)
 * @param {string} moodData.social_interaction - Social interaction level (optional)
 * @param {boolean} moodData.medication_taken - Medication taken (optional)
 * @param {string} moodData.notes - Notes (optional)
 * @param {Array} moodData.activities - Activities (optional)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Created mood entry
 * @throws {Error} If creation fails or validation fails
 */
async function createMoodEntry(moodData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Creating mood entry', {
      patientId: moodData.patient_id,
      moodLevel: moodData.mood_level,
      requestingUserId
    });

    // Validate mood level (1-5 scale)
    if (moodData.mood_level < 1 || moodData.mood_level > 5) {
      throw new Error('Nível de humor deve estar entre 1 e 5');
    }

    // Validate optional levels if provided
    const optionalLevels = ['stress_level', 'anxiety_level', 'depression_level'];
    for (const level of optionalLevels) {
      if (moodData[level] !== undefined && moodData[level] !== null) {
        if (moodData[level] < 1 || moodData[level] > 5) {
          throw new Error(`${level} deve estar entre 1 e 5`);
        }
      }
    }

    // Validate sleep hours if provided
    if (moodData.sleep_hours !== undefined && moodData.sleep_hours !== null) {
      if (moodData.sleep_hours < 0 || moodData.sleep_hours > 24) {
        throw new Error('Horas de sono devem estar entre 0 e 24');
      }
    }

    // Validate social interaction if provided
    const validSocialInteractions = ['none', 'minimal', 'moderate', 'high'];
    if (moodData.social_interaction && !validSocialInteractions.includes(moodData.social_interaction)) {
      throw new Error(`Interação social deve ser: ${validSocialInteractions.join(', ')}`);
    }

    const { data: newMoodEntry, error } = await supabase
      .from('mood_entries')
      .insert([{
        ...moodData,
        entry_date: moodData.entry_date || new Date().toISOString().split('T')[0]
      }])
      .select(`
        *,
        patient:patients!mood_entries_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to create mood entry', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao criar registro de humor');
    }

    // Log data creation for audit
    await auditService.logDataModification(
      requestingUserId,
      'mood_entries',
      newMoodEntry.id,
      'CREATE',
      null,
      newMoodEntry
    );

    const duration = Date.now() - startTime;
    logger.info('Mood entry created successfully', {
      moodEntryId: newMoodEntry.id,
      duration
    });

    return newMoodEntry;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Create mood entry error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get mood entries by patient ID with optional date range
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} dateRange - Optional date range
 * @param {string} dateRange.startDate - Start date (ISO format)
 * @param {string} dateRange.endDate - End date (ISO format)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of mood entries
 */
async function getMoodEntriesByPatient(patientId, dateRange = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting mood entries by patient', {
      patientId,
      dateRange,
      requestingUserId
    });

    let query = supabase
      .from('mood_entries')
      .select(`
        *,
        patient:patients!mood_entries_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('entry_date', { ascending: false });

    // Apply date range filters if provided
    if (dateRange.startDate) {
      query = query.gte('entry_date', dateRange.startDate);
    }

    if (dateRange.endDate) {
      query = query.lte('entry_date', dateRange.endDate);
    }

    const { data: moodEntries, error } = await query;

    if (error) {
      logger.error('Failed to get mood entries', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar registros de humor');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'mood_entries',
      patientId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Mood entries retrieved', {
      patientId,
      count: moodEntries?.length || 0,
      duration
    });

    return moodEntries || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get mood entries by patient error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get mood entry by ID
 * 
 * @param {string} moodEntryId - Mood entry UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Mood entry
 * @throws {Error} If mood entry not found
 */
async function getMoodEntryById(moodEntryId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting mood entry by ID', {
      moodEntryId,
      requestingUserId
    });

    const { data: moodEntry, error } = await supabase
      .from('mood_entries')
      .select(`
        *,
        patient:patients!mood_entries_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        )
      `)
      .eq('id', moodEntryId)
      .single();

    if (error) {
      logger.error('Failed to get mood entry', {
        moodEntryId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar registro de humor');
    }

    if (!moodEntry) {
      logger.warn('Mood entry not found', { moodEntryId });
      throw new Error('Registro de humor não encontrado');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'mood_entries',
      moodEntryId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Mood entry retrieved', {
      moodEntryId,
      duration
    });

    return moodEntry;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get mood entry by ID error', {
      moodEntryId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update mood entry
 * 
 * @param {string} moodEntryId - Mood entry UUID
 * @param {Object} updateData - Data to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated mood entry
 * @throws {Error} If update fails
 */
async function updateMoodEntry(moodEntryId, updateData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating mood entry', {
      moodEntryId,
      requestingUserId,
      fields: Object.keys(updateData)
    });

    // Get current mood entry for audit
    const { data: oldMoodEntry } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('id', moodEntryId)
      .single();

    // Validate mood levels if being updated
    if (updateData.mood_level !== undefined) {
      if (updateData.mood_level < 1 || updateData.mood_level > 5) {
        throw new Error('Nível de humor deve estar entre 1 e 5');
      }
    }

    const optionalLevels = ['stress_level', 'anxiety_level', 'depression_level'];
    for (const level of optionalLevels) {
      if (updateData[level] !== undefined && updateData[level] !== null) {
        if (updateData[level] < 1 || updateData[level] > 5) {
          throw new Error(`${level} deve estar entre 1 e 5`);
        }
      }
    }

    const { data: updatedMoodEntry, error } = await supabase
      .from('mood_entries')
      .update(updateData)
      .eq('id', moodEntryId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update mood entry', {
        moodEntryId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar registro de humor');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'mood_entries',
      moodEntryId,
      'UPDATE',
      oldMoodEntry,
      updatedMoodEntry
    );

    const duration = Date.now() - startTime;
    logger.info('Mood entry updated', {
      moodEntryId,
      duration
    });

    return updatedMoodEntry;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update mood entry error', {
      moodEntryId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Delete mood entry
 * 
 * @param {string} moodEntryId - Mood entry UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteMoodEntry(moodEntryId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Deleting mood entry', {
      moodEntryId,
      requestingUserId
    });

    // Get mood entry for audit
    const { data: moodEntry, error: getError } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('id', moodEntryId)
      .single();

    if (getError || !moodEntry) {
      logger.warn('Mood entry not found for deletion', { moodEntryId });
      throw new Error('Registro de humor não encontrado');
    }

    const { error: deleteError } = await supabase
      .from('mood_entries')
      .delete()
      .eq('id', moodEntryId);

    if (deleteError) {
      logger.error('Failed to delete mood entry', {
        moodEntryId,
        error: deleteError.message,
        code: deleteError.code
      });
      throw new Error('Erro ao excluir registro de humor');
    }

    // Log data deletion for audit
    await auditService.logDataModification(
      requestingUserId,
      'mood_entries',
      moodEntryId,
      'DELETE',
      moodEntry,
      null
    );

    const duration = Date.now() - startTime;
    logger.info('Mood entry deleted successfully', {
      moodEntryId,
      duration
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Delete mood entry error', {
      moodEntryId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Calculate mood statistics for a patient
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} dateRange - Optional date range
 * @param {string} dateRange.startDate - Start date (ISO format)
 * @param {string} dateRange.endDate - End date (ISO format)
 * @returns {Promise<Object>} Mood statistics
 */
async function calculateMoodStatistics(patientId, dateRange = {}) {
  const startTime = Date.now();
  
  try {
    logger.info('Calculating mood statistics', {
      patientId,
      dateRange
    });

    const moodEntries = await getMoodEntriesByPatient(patientId, dateRange, patientId);

    if (moodEntries.length === 0) {
      return {
        totalEntries: 0,
        averageMood: null,
        averageStress: null,
        averageAnxiety: null,
        averageDepression: null,
        averageSleep: null,
        averageExercise: null
      };
    }

    // Calculate averages
    const stats = {
      totalEntries: moodEntries.length,
      averageMood: 0,
      averageStress: 0,
      averageAnxiety: 0,
      averageDepression: 0,
      averageSleep: 0,
      averageExercise: 0,
      moodTrend: []
    };

    let stressCount = 0;
    let anxietyCount = 0;
    let depressionCount = 0;
    let sleepCount = 0;
    let exerciseCount = 0;

    for (const entry of moodEntries) {
      stats.averageMood += entry.mood_level;
      
      if (entry.stress_level !== null) {
        stats.averageStress += entry.stress_level;
        stressCount++;
      }
      
      if (entry.anxiety_level !== null) {
        stats.averageAnxiety += entry.anxiety_level;
        anxietyCount++;
      }
      
      if (entry.depression_level !== null) {
        stats.averageDepression += entry.depression_level;
        depressionCount++;
      }
      
      if (entry.sleep_hours !== null) {
        stats.averageSleep += entry.sleep_hours;
        sleepCount++;
      }
      
      if (entry.exercise_minutes !== null) {
        stats.averageExercise += entry.exercise_minutes;
        exerciseCount++;
      }

      // Add to trend (last 30 entries)
      if (stats.moodTrend.length < 30) {
        stats.moodTrend.push({
          date: entry.entry_date,
          mood: entry.mood_level
        });
      }
    }

    stats.averageMood = (stats.averageMood / moodEntries.length).toFixed(2);
    stats.averageStress = stressCount > 0 ? (stats.averageStress / stressCount).toFixed(2) : null;
    stats.averageAnxiety = anxietyCount > 0 ? (stats.averageAnxiety / anxietyCount).toFixed(2) : null;
    stats.averageDepression = depressionCount > 0 ? (stats.averageDepression / depressionCount).toFixed(2) : null;
    stats.averageSleep = sleepCount > 0 ? (stats.averageSleep / sleepCount).toFixed(2) : null;
    stats.averageExercise = exerciseCount > 0 ? (stats.averageExercise / exerciseCount).toFixed(2) : null;

    const duration = Date.now() - startTime;
    logger.info('Mood statistics calculated', {
      patientId,
      totalEntries: stats.totalEntries,
      duration
    });

    return stats;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Calculate mood statistics error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get all mood entries (filtered by role via RLS)
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.patientId - Filter by patient
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of mood entries
 */
async function getAllMoodEntries(filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all mood entries', { filters, requestingUserId });

    let query = supabase
      .from('mood_entries')
      .select(`
        *,
        patient:patients!mood_entries_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        )
      `)
      .order('entry_date', { ascending: false });

    // Apply filters
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    const { data: moodEntries, error } = await query;

    if (error) {
      logger.error('Failed to get mood entries', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar registros de humor');
    }

    const duration = Date.now() - startTime;
    logger.info('Mood entries retrieved', {
      count: moodEntries?.length || 0,
      duration
    });

    return moodEntries || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all mood entries error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

module.exports = {
  createMoodEntry,
  getMoodEntriesByPatient,
  getMoodEntryById,
  updateMoodEntry,
  deleteMoodEntry,
  calculateMoodStatistics,
  getAllMoodEntries
};
