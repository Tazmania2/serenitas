/**
 * Patient Service
 * 
 * Handles patient-related business logic including profile management,
 * health status updates, and doctor assignments.
 * 
 * Requirements: 4.1, 4.10
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');

/**
 * Get patient profile by patient ID
 * 
 * @param {string} patientId - Patient UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Patient profile with user information
 * @throws {Error} If patient not found
 */
async function getPatientProfile(patientId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting patient profile', { patientId, requestingUserId });

    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        user:users!patients_user_id_fkey (
          id,
          email,
          name,
          phone,
          role
        ),
        doctor:doctors!patients_doctor_id_fkey (
          id,
          specialization,
          license_number,
          user:users!doctors_user_id_fkey (
            name,
            email,
            phone
          )
        )
      `)
      .eq('id', patientId)
      .single();

    if (error) {
      logger.error('Failed to get patient profile', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar perfil do paciente');
    }

    if (!patient) {
      logger.warn('Patient not found', { patientId });
      throw new Error('Paciente não encontrado');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'patients',
      patientId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Patient profile retrieved', {
      patientId,
      duration
    });

    return patient;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get patient profile error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get all patients (filtered by role via RLS)
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.doctorId - Filter by assigned doctor
 * @param {string} filters.search - Search by name or email
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of patients
 */
async function getAllPatients(filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all patients', { filters, requestingUserId });

    let query = supabase
      .from('patients')
      .select(`
        *,
        user:users!patients_user_id_fkey (
          id,
          email,
          name,
          phone
        ),
        doctor:doctors!patients_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }

    if (filters.search) {
      // Note: This is a simplified search. For production, consider full-text search
      query = query.ilike('user.name', `%${filters.search}%`);
    }

    const { data: patients, error } = await query;

    if (error) {
      logger.error('Failed to get patients', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar pacientes');
    }

    const duration = Date.now() - startTime;
    logger.info('Patients retrieved', {
      count: patients?.length || 0,
      duration
    });

    return patients || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all patients error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update patient profile
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} updateData - Data to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated patient profile
 * @throws {Error} If update fails
 */
async function updatePatientProfile(patientId, updateData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating patient profile', {
      patientId,
      requestingUserId,
      fields: Object.keys(updateData)
    });

    // Get current patient data for audit log
    const { data: oldPatient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    // Prepare update data (remove fields that shouldn't be updated directly)
    const allowedFields = [
      'date_of_birth',
      'cpf',
      'blood_type',
      'height',
      'weight',
      'emergency_contact_name',
      'emergency_contact_phone',
      'emergency_contact_relationship',
      'medical_history',
      'allergies',
      'insurance_provider',
      'insurance_number',
      'health_status'
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Add updated_at timestamp
    filteredData.updated_at = new Date().toISOString();

    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(filteredData)
      .eq('id', patientId)
      .select(`
        *,
        user:users!patients_user_id_fkey (
          id,
          email,
          name,
          phone
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to update patient profile', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar perfil do paciente');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'patients',
      patientId,
      'UPDATE',
      oldPatient,
      updatedPatient
    );

    const duration = Date.now() - startTime;
    logger.info('Patient profile updated', {
      patientId,
      duration
    });

    return updatedPatient;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update patient profile error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update patient health status
 * 
 * @param {string} patientId - Patient UUID
 * @param {string} healthStatus - New health status text
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated patient profile
 * @throws {Error} If update fails
 */
async function updateHealthStatus(patientId, healthStatus, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating patient health status', {
      patientId,
      requestingUserId
    });

    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update({
        health_status: healthStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .select('id, health_status, updated_at')
      .single();

    if (error) {
      logger.error('Failed to update health status', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar status de saúde');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'patients',
      patientId,
      'UPDATE',
      { field: 'health_status' },
      { health_status: healthStatus }
    );

    const duration = Date.now() - startTime;
    logger.info('Health status updated', {
      patientId,
      duration
    });

    return updatedPatient;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update health status error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get patient's assigned doctor
 * 
 * @param {string} patientId - Patient UUID
 * @returns {Promise<Object|null>} Doctor information or null if no doctor assigned
 * @throws {Error} If query fails
 */
async function getPatientDoctor(patientId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting patient doctor', { patientId });

    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        doctor_id,
        doctor:doctors!patients_doctor_id_fkey (
          id,
          specialization,
          license_number,
          consultation_fee,
          experience_years,
          user:users!doctors_user_id_fkey (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .eq('id', patientId)
      .single();

    if (error) {
      logger.error('Failed to get patient doctor', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar médico do paciente');
    }

    const duration = Date.now() - startTime;
    logger.info('Patient doctor retrieved', {
      patientId,
      hasDoctorAssigned: !!patient?.doctor,
      duration
    });

    return patient?.doctor || null;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get patient doctor error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Create new patient profile
 * 
 * @param {Object} patientData - Patient data
 * @param {string} patientData.user_id - User ID (UUID)
 * @param {string} patientData.doctor_id - Doctor ID (UUID, optional)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Created patient profile
 * @throws {Error} If creation fails
 */
async function createPatient(patientData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Creating patient profile', {
      userId: patientData.user_id,
      requestingUserId
    });

    // Check if patient profile already exists for this user
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', patientData.user_id)
      .single();

    if (existingPatient) {
      logger.warn('Patient profile already exists', {
        userId: patientData.user_id
      });
      throw new Error('Perfil de paciente já existe para este usuário');
    }

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select(`
        *,
        user:users!patients_user_id_fkey (
          id,
          email,
          name,
          phone
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to create patient', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao criar perfil de paciente');
    }

    // Log data creation for audit
    await auditService.logDataModification(
      requestingUserId,
      'patients',
      newPatient.id,
      'CREATE',
      null,
      newPatient
    );

    const duration = Date.now() - startTime;
    logger.info('Patient profile created', {
      patientId: newPatient.id,
      duration
    });

    return newPatient;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Create patient error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

module.exports = {
  getPatientProfile,
  getAllPatients,
  updatePatientProfile,
  updateHealthStatus,
  getPatientDoctor,
  createPatient
};
