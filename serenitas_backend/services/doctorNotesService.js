/**
 * Doctor Notes Service
 * 
 * Handles doctor notes business logic including creation, retrieval,
 * updates, and doctor-patient relationship validation.
 * 
 * Requirements: 4.7, 5.6
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const prescriptionService = require('./prescriptionService');

/**
 * Write doctor note
 * 
 * @param {Object} noteData - Note data
 * @param {string} noteData.patient_id - Patient UUID
 * @param {string} noteData.doctor_id - Doctor UUID
 * @param {string} noteData.appointment_id - Appointment UUID (optional)
 * @param {string} noteData.title - Note title (optional)
 * @param {string} noteData.content - Note content
 * @param {boolean} noteData.is_visible_to_patient - Visibility to patient (default: true)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Created doctor note
 * @throws {Error} If creation fails or doctor not assigned to patient
 */
async function writeDoctorNote(noteData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    const { patient_id, doctor_id, ...noteFields } = noteData;

    logger.info('Writing doctor note', {
      patientId: patient_id,
      doctorId: doctor_id,
      requestingUserId
    });

    // Validate that doctor is assigned to patient
    const isAssigned = await prescriptionService.validateDoctorPatientRelationship(
      doctor_id,
      patient_id
    );

    if (!isAssigned) {
      logger.warn('Doctor not assigned to patient', {
        doctorId: doctor_id,
        patientId: patient_id
      });
      throw new Error('Médico não autorizado para este paciente');
    }

    // Validate content is not empty
    if (!noteFields.content || noteFields.content.trim() === '') {
      throw new Error('Conteúdo da nota é obrigatório');
    }

    const { data: newNote, error } = await supabase
      .from('doctor_notes')
      .insert([
        {
          patient_id,
          doctor_id,
          ...noteFields,
          note_date: noteFields.note_date || new Date().toISOString().split('T')[0],
          is_visible_to_patient: noteFields.is_visible_to_patient !== undefined 
            ? noteFields.is_visible_to_patient 
            : true
        }
      ])
      .select(`
        *,
        patient:patients!doctor_notes_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!doctor_notes_doctor_id_fkey (
          id,
          specialization,
          user:users!doctors_user_id_fkey (
            name,
            email
          )
        ),
        appointment:appointments!doctor_notes_appointment_id_fkey (
          id,
          appointment_date,
          appointment_time
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to create doctor note', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao criar nota médica');
    }

    // Log data creation for audit
    await auditService.logDataModification(
      requestingUserId,
      'doctor_notes',
      newNote.id,
      'CREATE',
      null,
      newNote
    );

    const duration = Date.now() - startTime;
    logger.info('Doctor note created successfully', {
      noteId: newNote.id,
      duration
    });

    return newNote;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Write doctor note error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get notes for patient (filtered by visibility)
 * 
 * @param {string} patientId - Patient UUID
 * @param {boolean} includeHidden - Include hidden notes (for doctors/admin)
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of doctor notes
 */
async function getNotesForPatient(patientId, includeHidden = false, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting notes for patient', {
      patientId,
      includeHidden,
      requestingUserId
    });

    let query = supabase
      .from('doctor_notes')
      .select(`
        *,
        patient:patients!doctor_notes_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!doctor_notes_doctor_id_fkey (
          id,
          specialization,
          user:users!doctors_user_id_fkey (
            name,
            email
          )
        ),
        appointment:appointments!doctor_notes_appointment_id_fkey (
          id,
          appointment_date,
          appointment_time
        )
      `)
      .eq('patient_id', patientId)
      .order('note_date', { ascending: false });

    // Filter by visibility if not including hidden notes
    if (!includeHidden) {
      query = query.eq('is_visible_to_patient', true);
    }

    const { data: notes, error } = await query;

    if (error) {
      logger.error('Failed to get doctor notes', {
        patientId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar notas médicas');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'doctor_notes',
      patientId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Doctor notes retrieved', {
      patientId,
      count: notes?.length || 0,
      duration
    });

    return notes || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get notes for patient error', {
      patientId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get doctor note by ID
 * 
 * @param {string} noteId - Note UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Doctor note
 * @throws {Error} If note not found
 */
async function getDoctorNoteById(noteId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting doctor note by ID', {
      noteId,
      requestingUserId
    });

    const { data: note, error } = await supabase
      .from('doctor_notes')
      .select(`
        *,
        patient:patients!doctor_notes_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!doctor_notes_doctor_id_fkey (
          id,
          specialization,
          user:users!doctors_user_id_fkey (
            name,
            email
          )
        ),
        appointment:appointments!doctor_notes_appointment_id_fkey (
          id,
          appointment_date,
          appointment_time
        )
      `)
      .eq('id', noteId)
      .single();

    if (error) {
      logger.error('Failed to get doctor note', {
        noteId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar nota médica');
    }

    if (!note) {
      logger.warn('Doctor note not found', { noteId });
      throw new Error('Nota médica não encontrada');
    }

    // Log data access for audit
    await auditService.logDataAccess(
      requestingUserId,
      'doctor_notes',
      noteId,
      'READ'
    );

    const duration = Date.now() - startTime;
    logger.info('Doctor note retrieved', {
      noteId,
      duration
    });

    return note;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get doctor note by ID error', {
      noteId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Update doctor note
 * 
 * @param {string} noteId - Note UUID
 * @param {Object} updateData - Data to update
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Object>} Updated doctor note
 * @throws {Error} If update fails
 */
async function updateDoctorNote(noteId, updateData, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Updating doctor note', {
      noteId,
      requestingUserId,
      fields: Object.keys(updateData)
    });

    // Get current note for audit
    const { data: oldNote } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    // Allowed fields to update
    const allowedFields = [
      'title',
      'content',
      'is_visible_to_patient'
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Validate content if being updated
    if (filteredData.content !== undefined && filteredData.content.trim() === '') {
      throw new Error('Conteúdo da nota não pode estar vazio');
    }

    filteredData.updated_at = new Date().toISOString();

    const { data: updatedNote, error } = await supabase
      .from('doctor_notes')
      .update(filteredData)
      .eq('id', noteId)
      .select(`
        *,
        patient:patients!doctor_notes_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!doctor_notes_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .single();

    if (error) {
      logger.error('Failed to update doctor note', {
        noteId,
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao atualizar nota médica');
    }

    // Log data modification for audit
    await auditService.logDataModification(
      requestingUserId,
      'doctor_notes',
      noteId,
      'UPDATE',
      oldNote,
      updatedNote
    );

    const duration = Date.now() - startTime;
    logger.info('Doctor note updated', {
      noteId,
      duration
    });

    return updatedNote;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Update doctor note error', {
      noteId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Delete doctor note
 * 
 * @param {string} noteId - Note UUID
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<boolean>} True if deleted successfully
 * @throws {Error} If deletion fails
 */
async function deleteDoctorNote(noteId, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Deleting doctor note', {
      noteId,
      requestingUserId
    });

    // Get note for audit
    const { data: note, error: getError } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (getError || !note) {
      logger.warn('Doctor note not found for deletion', { noteId });
      throw new Error('Nota médica não encontrada');
    }

    const { error: deleteError } = await supabase
      .from('doctor_notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      logger.error('Failed to delete doctor note', {
        noteId,
        error: deleteError.message,
        code: deleteError.code
      });
      throw new Error('Erro ao excluir nota médica');
    }

    // Log data deletion for audit
    await auditService.logDataModification(
      requestingUserId,
      'doctor_notes',
      noteId,
      'DELETE',
      note,
      null
    );

    const duration = Date.now() - startTime;
    logger.info('Doctor note deleted successfully', {
      noteId,
      duration
    });

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Delete doctor note error', {
      noteId,
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

/**
 * Get all doctor notes (filtered by role via RLS)
 * 
 * @param {Object} filters - Optional filters
 * @param {string} filters.patientId - Filter by patient
 * @param {string} filters.doctorId - Filter by doctor
 * @param {string} requestingUserId - ID of user making the request
 * @returns {Promise<Array>} List of doctor notes
 */
async function getAllDoctorNotes(filters = {}, requestingUserId) {
  const startTime = Date.now();
  
  try {
    logger.info('Getting all doctor notes', { filters, requestingUserId });

    let query = supabase
      .from('doctor_notes')
      .select(`
        *,
        patient:patients!doctor_notes_patient_id_fkey (
          id,
          user:users!patients_user_id_fkey (
            name,
            email
          )
        ),
        doctor:doctors!doctor_notes_doctor_id_fkey (
          id,
          user:users!doctors_user_id_fkey (
            name
          )
        )
      `)
      .order('note_date', { ascending: false });

    // Apply filters
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }

    const { data: notes, error } = await query;

    if (error) {
      logger.error('Failed to get doctor notes', {
        error: error.message,
        code: error.code
      });
      throw new Error('Erro ao buscar notas médicas');
    }

    const duration = Date.now() - startTime;
    logger.info('Doctor notes retrieved', {
      count: notes?.length || 0,
      duration
    });

    return notes || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get all doctor notes error', {
      error: error.message,
      stack: error.stack,
      duration
    });
    throw error;
  }
}

module.exports = {
  writeDoctorNote,
  getNotesForPatient,
  getDoctorNoteById,
  updateDoctorNote,
  deleteDoctorNote,
  getAllDoctorNotes
};
