const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');

/**
 * Doctor Service
 * Handles business logic for doctor-related operations
 */

/**
 * Get all doctors
 * @returns {Promise<Array>} List of doctors with user information
 */
async function getAllDoctors() {
  logger.info('Fetching all doctors');

  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      user:users!doctors_user_id_fkey (
        id,
        name,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching doctors', { error: error.message });
    throw new Error(`Erro ao buscar médicos: ${error.message}`);
  }

  return data;
}

/**
 * Get doctor by ID
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<Object>} Doctor with user information
 */
async function getDoctorById(doctorId) {
  logger.info('Fetching doctor by ID', { doctorId });

  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      user:users!doctors_user_id_fkey (
        id,
        name,
        email,
        phone,
        role
      )
    `)
    .eq('id', doctorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      logger.warn('Doctor not found', { doctorId });
      throw new Error('Médico não encontrado');
    }
    logger.error('Error fetching doctor', { doctorId, error: error.message });
    throw new Error(`Erro ao buscar médico: ${error.message}`);
  }

  return data;
}

/**
 * Get patients assigned to a doctor
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<Array>} List of assigned patients
 */
async function getAssignedPatients(doctorId) {
  logger.info('Fetching assigned patients for doctor', { doctorId });

  // First verify doctor exists
  await getDoctorById(doctorId);

  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      user:users!patients_user_id_fkey (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching assigned patients', { doctorId, error: error.message });
    throw new Error(`Erro ao buscar pacientes: ${error.message}`);
  }

  return data;
}

/**
 * Get patient detail with full medical history
 * @param {string} doctorId - Doctor UUID
 * @param {string} patientId - Patient UUID
 * @returns {Promise<Object>} Patient with complete medical information
 */
async function getPatientDetail(doctorId, patientId) {
  logger.info('Fetching patient detail for doctor', { doctorId, patientId });

  // Verify doctor-patient relationship
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`
      *,
      user:users!patients_user_id_fkey (
        id,
        name,
        email,
        phone,
        created_at
      )
    `)
    .eq('id', patientId)
    .single();

  if (patientError) {
    if (patientError.code === 'PGRST116') {
      throw new Error('Paciente não encontrado');
    }
    throw new Error(`Erro ao buscar paciente: ${patientError.message}`);
  }

  // Verify doctor is assigned to this patient
  if (patient.doctor_id !== doctorId) {
    logger.warn('Doctor not authorized for patient', { doctorId, patientId });
    throw new Error('Acesso negado: Médico não autorizado para este paciente');
  }

  // Fetch prescriptions
  const { data: prescriptions, error: prescError } = await supabase
    .from('prescriptions')
    .select(`
      *,
      medications (*)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (prescError) {
    logger.error('Error fetching prescriptions', { patientId, error: prescError.message });
  }

  // Fetch exams
  const { data: exams, error: examsError } = await supabase
    .from('exams')
    .select('*')
    .eq('patient_id', patientId)
    .order('exam_date', { ascending: false });

  if (examsError) {
    logger.error('Error fetching exams', { patientId, error: examsError.message });
  }

  // Fetch mood entries
  const { data: moodEntries, error: moodError } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('patient_id', patientId)
    .order('entry_date', { ascending: false })
    .limit(30); // Last 30 entries

  if (moodError) {
    logger.error('Error fetching mood entries', { patientId, error: moodError.message });
  }

  // Fetch doctor notes
  const { data: doctorNotes, error: notesError } = await supabase
    .from('doctor_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('note_date', { ascending: false });

  if (notesError) {
    logger.error('Error fetching doctor notes', { patientId, error: notesError.message });
  }

  // Fetch appointments
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('appointment_date', { ascending: false });

  if (apptError) {
    logger.error('Error fetching appointments', { patientId, error: apptError.message });
  }

  return {
    ...patient,
    prescriptions: prescriptions || [],
    exams: exams || [],
    moodEntries: moodEntries || [],
    doctorNotes: doctorNotes || [],
    appointments: appointments || []
  };
}

/**
 * Update doctor profile
 * @param {string} doctorId - Doctor UUID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User ID making the update (for audit)
 * @returns {Promise<Object>} Updated doctor
 */
async function updateDoctorProfile(doctorId, updateData, userId) {
  logger.info('Updating doctor profile', { doctorId, userId });

  // Remove fields that shouldn't be updated directly
  const { id, user_id, created_at, ...allowedUpdates } = updateData;

  const { data, error } = await supabase
    .from('doctors')
    .update({
      ...allowedUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', doctorId)
    .select(`
      *,
      user:users!doctors_user_id_fkey (
        id,
        name,
        email,
        phone
      )
    `)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Médico não encontrado');
    }
    logger.error('Error updating doctor profile', { doctorId, error: error.message });
    throw new Error(`Erro ao atualizar perfil do médico: ${error.message}`);
  }

  // Audit log
  await auditService.logAction({
    userId,
    action: 'UPDATE_DOCTOR_PROFILE',
    resourceType: 'doctor',
    resourceId: doctorId,
    details: { updatedFields: Object.keys(allowedUpdates) }
  });

  return data;
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  getAssignedPatients,
  getPatientDetail,
  updateDoctorProfile
};
