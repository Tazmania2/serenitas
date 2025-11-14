-- Clínica Serenitas Database Schema
-- Migration 02: Create indexes for performance optimization

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deletion_scheduled ON users(deletion_scheduled) WHERE deletion_scheduled = TRUE;

-- ============================================================================
-- DOCTORS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_license ON doctors(license_number);

-- ============================================================================
-- PATIENTS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_cpf ON patients(cpf);

-- ============================================================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

-- ============================================================================
-- PRESCRIPTIONS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_appointment ON prescriptions(appointment_id);

-- ============================================================================
-- MEDICATIONS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_medications_prescription ON medications(prescription_id);

-- ============================================================================
-- EXAMS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_exams_patient ON exams(patient_id);
CREATE INDEX idx_exams_doctor ON exams(doctor_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_date ON exams(exam_date);

-- ============================================================================
-- MOOD ENTRIES TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_mood_entries_patient ON mood_entries(patient_id);
CREATE INDEX idx_mood_entries_date ON mood_entries(entry_date);
CREATE INDEX idx_mood_entries_patient_date ON mood_entries(patient_id, entry_date DESC);

-- ============================================================================
-- DOCTOR NOTES TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_doctor_notes_patient ON doctor_notes(patient_id);
CREATE INDEX idx_doctor_notes_doctor ON doctor_notes(doctor_id);
CREATE INDEX idx_doctor_notes_appointment ON doctor_notes(appointment_id);
CREATE INDEX idx_doctor_notes_visible ON doctor_notes(is_visible_to_patient) WHERE is_visible_to_patient = TRUE;

-- ============================================================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- CONSENTS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_consents_user ON consents(user_id);
CREATE INDEX idx_consents_type ON consents(consent_type);
CREATE INDEX idx_consents_granted ON consents(granted);
CREATE INDEX idx_consents_user_type ON consents(user_id, consent_type);
