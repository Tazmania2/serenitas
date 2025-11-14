/**
 * Prescription Service
 * 
 * Handles prescription-related business logic including creation,
 * updates, and medication management with doctor-patient validation.
 * 
 * Requirements: 4.2, 4.3, 5.4, 5.5
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');

/**
 * Get prescriptions by patient ID
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status (active, completed, discontinued)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of prescriptions with medications
 */
async function getPrescriptionsByPatient(patientId, filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting prescriptions by patient', {
      patientId,
      filters,
      requestingUserId
    });

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients!prescriptions_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!prescriptions_doctor_id_fkey (
          id,
          specialization,
          user:users!doctors_user_id_fkey (
            name,
            email
          )
        ),
        medications (*)
      `)
      .eq('patient_id', patientId)
      .order('prescription_date', { ascending: false });

    // Apply status filter if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: prescriptions, error } = await query;

    if (error) {
      logger.error('Failed to get prescriptions', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar prescrições');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'prescriptions',
      patientId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Prescriptions retrieved', {
      patientId,
      count: prescriptions?.length || 0,
      duration
    });

    return prescriptions || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get prescriptions by patient error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get prescription by ID
 * 
 * @param {string} prescriptionId - Prescription UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Prescription with medications
 * @throws {Error} If prescription not found
 */
async function getPrescriptionById(prescriptionId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting prescription by ID', {
      prescriptionId,
      requestingUserId
    });

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients!prescriptions_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!prescriptions_doctor_id_fkey (
          id,
          specialization,
          user:users!doctors_user_id_fkey (
            name,
            email
          )
        ),
        medications (*)
      `)
      .eq('id', prescriptionId)
      .single();

    if (error) {
      logger.error('Failed to get prescription', {
        prescriptionId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar prescrição');
    }

    if (!prescription) {
      logger.warn('Prescription not found', { prescriptionId });
      throw new Error('Prescrição não encontrada');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'prescriptions',
      prescriptionId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Prescription retrieved', {
      prescriptionId,
      duration
    });

    return prescription;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get prescription by ID error', {
      prescriptionId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Create prescription with medications
 * Validates that doctor is assigned to patient
 * 
 * @param {Object} prescriptionData - Prescription data
 * @param {string} prescriptionData.patient_id - Patient UUID
 * @param {string} prescriptionData.doctor_id - Doctor UUID
 * @param {number} prescriptionData.duration_days - Duration in days
 * @param {string} prescriptionData.instructions - Instructions (optional)
 * @param {string} prescriptionData.doctor_notes - Doctor notes (optional)
 * @param {Array} prescriptionData.medications - Array of medication objects
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Created prescription with medications
 * @throws {Error} If creation fails or doctor not assigned to patient
 */
async function createPrescription(prescriptionData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    const { patient_id, doctor_id, medications, ...prescriptionFields } = prescriptionData;

    logger.info('Creating prescription', {
      patientId: patient_id,
      doctorId: doctor_id,
      medicationCount: medications?.length || 0,
      requestingUserId
    });

    // Validate that doctor is assigned to patient
    const isAssigned = await validateDoctorPatientRelationship(doctor_id, patient_id);
    if (!isAssigned) {
      logger.warn('Doctor not assigned to patient', {
        doctorId: doctor_id,
        patientId: patient_id
      });
      throw new Error('Médico não autorizado para este paciente');
    }

    // Validate medications array
    if (!medications || medications.length === 0) {
      throw new Error('Pelo menos um medicamento é obrigatório');
    }

    // Create prescription
    const { data: newPrescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert([
        {
          patient_id,
          doctor_id,
          ...prescriptionFields,
          prescription_date: new Date().toISOString().split('T')[0],
          status: 'active'
        }
      ])
      .select()
      .single();

    if (prescriptionError) {
      logger.error('Failed to create prescription', {
        error: prescriptionError.message,
        code: prescriptionError.code
      });
      throw new Error('Erro ao criar prescrição');
    }

    // Create medications
    const medicationsWithPrescriptionId = medications.map(med => ({
      prescription_id: newPrescription.id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      quantity: med.quantity,
      instructions: med.instructions || null
    }));

    const { data: createdMedications, error: medicationsError } = await supabase
      .from('medications')
      .insert(medicationsWithPrescriptionId)
      .select();

    if (medicationsError) {
      // Rollback prescription if medications fail
      await supabase
        .from('prescriptions')
        .delete()
        .eq('id', newPrescription.id);

      logger.error('Failed to create medications', {
        prescriptionId: newPrescription.id,
        error: medicationsError.message
      });
      throw new Error('Erro ao criar medicamentos');
    }

    // Attach medications to prescription
    newPrescription.medications = createdMedications;

    // Log data creation for audit
    await auditService.logDataModification(
      requestingUserId,
      'prescriptions',
      newPrescription.id,
      'CREATE',
      null,
      newPrescription
    );

    const duration = Date.now() - startTime;
    logger.info('Prescription created successfully', {
      prescriptionId: newPrescription.id,
      medicationCount: createdMedications.length,
      duration
    });

    return newPrescription;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Create prescription error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update prescription status
 * 
 * @param {string} prescriptionId - Prescription UUID
 * @param {string} status - New status (active, completed, discontinued)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated prescription
 * @throws {Error} If update fails
 */
async function updatePrescriptionStatus(prescriptionId, status, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating prescription status', {
      prescriptionId,
      status,
      requestingUserId
    });

    // Validate status
    const validStatuses = ['active', 'completed', 'discontinued'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Status inválido. Deve ser: ${validStatuses.join(', ')}`);
    }

    // Get current prescription for audit
    const { data: oldPrescription } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    const { data: updatedPrescription, error } = await supabase
      .from('prescriptions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', prescriptionId)
      .select(`
        *,
        medications (*)
      `)
      .single();

    if (error) {
      logger.error('Failed to update prescription status', {
        prescriptionId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar status da prescrição');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'prescriptions',
      prescriptionId,
      'UPDATE',
      oldPrescription,
      updatedPrescription
    );

    const duration = Date.now() - startTime;
    logger.info('Prescription status updated', {
      prescriptionId,
      newStatus: status,
      duration
    });

    return updatedPrescription;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update prescription status error', {
      prescriptionId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update prescription details
 * 
 * @param {string} prescriptionId - Prescription UUID
 * @param {Object} updateData - Data to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated prescription
 * @throws {Error} If update fails
 */
async function updatePrescription(prescriptionId, updateData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating prescription', {
      prescriptionId,
      requestingUserId,
      fields: Object.keys(updateData)
    });

    // Get current prescription for audit
    const { data: oldPrescription } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    // Allowed fields to update
    const allowedFields = [
      'duration_days',
      'status',
      'instructions',
      'doctor_notes',
      'patient_notes'
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    filteredData.updated_at = new Date().toISOString();

    const { data: updatedPrescription, error } = await supabase
      .from('prescriptions')
      .update(filteredData)
      .eq('id', prescriptionId)
      .select(`
        *,
        medications (*)
      `)
      .single();

    if (error) {
      logger.error('Failed to update prescription', {
        prescriptionId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar prescrição');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'prescriptions',
      prescriptionId,
      'UPDATE',
      oldPrescription,
      updatedPrescription
    );

    const duration = Date.now() - startTime;
    logger.info('Prescription updated', {
      prescriptionId,
      duration
    });

    return updatedPrescription;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update prescription error', {
      prescriptionId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Validate doctor-patient relationship
 * 
 * @param {string} doctorId - Doctor UUID
 * @param {string} patientId - Patient UUID
 * @returns {Promise<boolean>} True if doctor is assigned to patient
 */
async function validateDoctorPatientRelationship(doctorId, patientId) {
  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('doctor_id')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      logger.warn('Patient not found for validation', { patientId });
      return false;
    }

    const isAssigned = patient.doctor_id === doctorId;
    
    logger.debug('Doctor-patient relationship validation', {
      doctorId,
      patientId,
      isAssigned
    });

    return isAssigned;
  } catch (error) {
    logger.error('Validate doctor-patient relationship error', {
      doctorId,
      patientId,
      error: error.message
    });
    return false;
  }
}

/**
 * Get all prescriptions (filtered by role via RLS)
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.patientId - Filter by patient
 * @param {string} filters.doctorId - Filter by doctor
 * @param {string} filters.status - Filter by status
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of prescriptions
 */
async function getAllPrescriptions(filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all prescriptions', { filters, requestingUserId });

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients!prescriptions_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!prescriptions_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        ),
        medications (*)
      `)
      .order('prescription_date', { ascending: false });

    // Apply filters
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: prescriptions, error } = await query;

    if (error) {
      logger.error('Failed to get prescriptions', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar prescrições');
    }

    const duration = Date.now() - startTime;
    logger.info('Prescriptions retrieved', {
      count: prescriptions?.length || 0,
      duration
    });

    return prescriptions || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all prescriptions error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

module.exports = {
  getPrescriptionsByPatient,
  getPrescriptionById,
  createPrescription,
  updatePrescriptionStatus,
  updatePrescription,
  validateDoctorPatientRelationship,
  getAllPrescriptions
};
