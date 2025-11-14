const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const auditService = require('./auditService');

/**
 * Appointment Service
 * Handles business logic for appointment-related operations
 */

/**
 * Get appointments filtered by user role
 * @param {Object} user - User object with id and role
 * @param {Object} filters - Optional filters (date, status, doctorId, patientId)
 * @returns {Promise<Array>} List of appointments
 */
async function getAppointments(user, filters = {}) {
  logger.info('Fetching appointments', { userId: user.id, role: user.role, filters });

  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients!appointments_patient_id_fkey (
        id,
        user:users!patients_user_id_fkey (
          id,
          name,
          email,
          phone
        )
      ),
      doctor:doctors!appointments_doctor_id_fkey (
        id,
        user:users!doctors_user_id_fkey (
          id,
          name,
          email
        ),
        specialization
      )
    `);

  // Role-based filtering
  if (user.role === 'patient') {
    // Get patient record for this user
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientRecord) {
      query = query.eq('patient_id', patientRecord.id);
    }
  } else if (user.role === 'doctor') {
    // Get doctor record for this user
    const { data: doctorRecord } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (doctorRecord) {
      query = query.eq('doctor_id', doctorRecord.id);
    }
  }
  // Secretary and admin can see all appointments

  // Apply additional filters
  if (filters.date) {
    query = query.eq('appointment_date', filters.date);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.doctorId) {
    query = query.eq('doctor_id', filters.doctorId);
  }
  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }

  query = query.order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching appointments', { error: error.message });
    throw new Error(`Erro ao buscar consultas: ${error.message}`);
  }

  return data;
}

/**
 * Get appointment by ID
 * @param {string} appointmentId - Appointment UUID
 * @param {Object} user - User object for authorization
 * @returns {Promise<Object>} Appointment details
 */
async function getAppointmentById(appointmentId, user) {
  logger.info('Fetching appointment by ID', { appointmentId, userId: user.id });

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients!appointments_patient_id_fkey (
        id,
        user:users!patients_user_id_fkey (
          id,
          name,
          email,
          phone
        )
      ),
      doctor:doctors!appointments_doctor_id_fkey (
        id,
        user:users!doctors_user_id_fkey (
          id,
          name,
          email
        ),
        specialization
      )
    `)
    .eq('id', appointmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Consulta não encontrada');
    }
    logger.error('Error fetching appointment', { appointmentId, error: error.message });
    throw new Error(`Erro ao buscar consulta: ${error.message}`);
  }

  // Authorization check
  if (user.role === 'patient') {
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientRecord || data.patient_id !== patientRecord.id) {
      throw new Error('Acesso negado: Você só pode visualizar suas próprias consultas');
    }
  } else if (user.role === 'doctor') {
    const { data: doctorRecord } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorRecord || data.doctor_id !== doctorRecord.id) {
      throw new Error('Acesso negado: Você só pode visualizar consultas dos seus pacientes');
    }
  }

  return data;
}

/**
 * Check doctor availability for a specific date and time
 * @param {string} doctorId - Doctor UUID
 * @param {string} date - Appointment date (YYYY-MM-DD)
 * @param {string} time - Appointment time (HH:MM)
 * @param {number} duration - Duration in minutes
 * @param {string} excludeAppointmentId - Appointment ID to exclude (for updates)
 * @returns {Promise<boolean>} True if available
 */
async function checkDoctorAvailability(doctorId, date, time, duration = 60, excludeAppointmentId = null) {
  logger.info('Checking doctor availability', { doctorId, date, time, duration });

  // Calculate time range
  const [hours, minutes] = time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  // Query for conflicting appointments
  let query = supabase
    .from('appointments')
    .select('id, appointment_time, duration_minutes')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .in('status', ['scheduled', 'confirmed']);

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data: existingAppointments, error } = await query;

  if (error) {
    logger.error('Error checking availability', { error: error.message });
    throw new Error(`Erro ao verificar disponibilidade: ${error.message}`);
  }

  // Check for time conflicts
  for (const appt of existingAppointments) {
    const [apptHours, apptMinutes] = appt.appointment_time.split(':').map(Number);
    const apptStart = apptHours * 60 + apptMinutes;
    const apptEnd = apptStart + (appt.duration_minutes || 60);

    // Check if times overlap
    if (
      (startMinutes >= apptStart && startMinutes < apptEnd) ||
      (endMinutes > apptStart && endMinutes <= apptEnd) ||
      (startMinutes <= apptStart && endMinutes >= apptEnd)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Create a new appointment
 * @param {Object} appointmentData - Appointment data
 * @param {string} userId - User ID creating the appointment
 * @returns {Promise<Object>} Created appointment
 */
async function createAppointment(appointmentData, userId) {
  logger.info('Creating appointment', { userId, appointmentData });

  const {
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    duration_minutes = 60,
    type = 'consultation',
    notes
  } = appointmentData;

  // Validate required fields
  if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
    throw new Error('Campos obrigatórios faltando: patient_id, doctor_id, appointment_date, appointment_time');
  }

  // Check doctor availability
  const isAvailable = await checkDoctorAvailability(
    doctor_id,
    appointment_date,
    appointment_time,
    duration_minutes
  );

  if (!isAvailable) {
    throw new Error('Horário não disponível. O médico já possui uma consulta agendada neste horário.');
  }

  // Verify patient exists
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patient_id)
    .single();

  if (patientError || !patient) {
    throw new Error('Paciente não encontrado');
  }

  // Verify doctor exists
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', doctor_id)
    .single();

  if (doctorError || !doctor) {
    throw new Error('Médico não encontrado');
  }

  // Create appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration_minutes,
      type,
      status: 'scheduled',
      notes
    })
    .select(`
      *,
      patient:patients!appointments_patient_id_fkey (
        id,
        user:users!patients_user_id_fkey (
          id,
          name,
          email
        )
      ),
      doctor:doctors!appointments_doctor_id_fkey (
        id,
        user:users!doctors_user_id_fkey (
          id,
          name,
          email
        )
      )
    `)
    .single();

  if (error) {
    logger.error('Error creating appointment', { error: error.message });
    throw new Error(`Erro ao criar consulta: ${error.message}`);
  }

  // Audit log
  await auditService.logAction({
    userId,
    action: 'CREATE_APPOINTMENT',
    resourceType: 'appointment',
    resourceId: data.id,
    details: { patient_id, doctor_id, appointment_date, appointment_time }
  });

  return data;
}

/**
 * Update appointment
 * @param {string} appointmentId - Appointment UUID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User ID making the update
 * @returns {Promise<Object>} Updated appointment
 */
async function updateAppointment(appointmentId, updateData, userId) {
  logger.info('Updating appointment', { appointmentId, userId });

  // Get existing appointment
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Consulta não encontrada');
    }
    throw new Error(`Erro ao buscar consulta: ${fetchError.message}`);
  }

  // If updating time/date, check availability
  if (updateData.appointment_date || updateData.appointment_time || updateData.duration_minutes) {
    const date = updateData.appointment_date || existing.appointment_date;
    const time = updateData.appointment_time || existing.appointment_time;
    const duration = updateData.duration_minutes || existing.duration_minutes || 60;

    const isAvailable = await checkDoctorAvailability(
      existing.doctor_id,
      date,
      time,
      duration,
      appointmentId
    );

    if (!isAvailable) {
      throw new Error('Horário não disponível. O médico já possui uma consulta agendada neste horário.');
    }
  }

  // Remove fields that shouldn't be updated directly
  const { id, patient_id, doctor_id, created_at, ...allowedUpdates } = updateData;

  const { data, error } = await supabase
    .from('appointments')
    .update({
      ...allowedUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
    .select(`
      *,
      patient:patients!appointments_patient_id_fkey (
        id,
        user:users!patients_user_id_fkey (
          id,
          name,
          email
        )
      ),
      doctor:doctors!appointments_doctor_id_fkey (
        id,
        user:users!doctors_user_id_fkey (
          id,
          name,
          email
        )
      )
    `)
    .single();

  if (error) {
    logger.error('Error updating appointment', { appointmentId, error: error.message });
    throw new Error(`Erro ao atualizar consulta: ${error.message}`);
  }

  // Audit log
  await auditService.logAction({
    userId,
    action: 'UPDATE_APPOINTMENT',
    resourceType: 'appointment',
    resourceId: appointmentId,
    details: { updatedFields: Object.keys(allowedUpdates) }
  });

  return data;
}

/**
 * Cancel appointment
 * @param {string} appointmentId - Appointment UUID
 * @param {string} cancellationReason - Reason for cancellation
 * @param {string} userId - User ID making the cancellation
 * @returns {Promise<Object>} Updated appointment
 */
async function cancelAppointment(appointmentId, cancellationReason, userId) {
  logger.info('Cancelling appointment', { appointmentId, userId });

  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason: cancellationReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
    .select(`
      *,
      patient:patients!appointments_patient_id_fkey (
        id,
        user:users!patients_user_id_fkey (
          id,
          name,
          email
        )
      ),
      doctor:doctors!appointments_doctor_id_fkey (
        id,
        user:users!doctors_user_id_fkey (
          id,
          name,
          email
        )
      )
    `)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Consulta não encontrada');
    }
    logger.error('Error cancelling appointment', { appointmentId, error: error.message });
    throw new Error(`Erro ao cancelar consulta: ${error.message}`);
  }

  // Audit log
  await auditService.logAction({
    userId,
    action: 'CANCEL_APPOINTMENT',
    resourceType: 'appointment',
    resourceId: appointmentId,
    details: { cancellationReason }
  });

  return data;
}

/**
 * Delete appointment
 * @param {string} appointmentId - Appointment UUID
 * @param {string} userId - User ID making the deletion
 * @returns {Promise<void>}
 */
async function deleteAppointment(appointmentId, userId) {
  logger.info('Deleting appointment', { appointmentId, userId });

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);

  if (error) {
    logger.error('Error deleting appointment', { appointmentId, error: error.message });
    throw new Error(`Erro ao excluir consulta: ${error.message}`);
  }

  // Audit log
  await auditService.logAction({
    userId,
    action: 'DELETE_APPOINTMENT',
    resourceType: 'appointment',
    resourceId: appointmentId,
    details: {}
  });
}

module.exports = {
  getAppointments,
  getAppointmentById,
  checkDoctorAvailability,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment
};
