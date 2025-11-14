-- Clínica Serenitas Database Schema
-- Migration 01: Create all tables
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'secretary', 'admin')),
  last_login_at TIMESTAMPTZ,
  deletion_scheduled BOOLEAN DEFAULT FALSE,
  deletion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts for all system roles';
COMMENT ON COLUMN users.role IS 'User role: patient, doctor, secretary, or admin';
COMMENT ON COLUMN users.deletion_scheduled IS 'LGPD compliance: account scheduled for deletion';
COMMENT ON COLUMN users.deletion_date IS 'LGPD compliance: date when account will be deleted';

-- ============================================================================
-- DOCTORS TABLE
-- ============================================================================
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  consultation_fee DECIMAL(10,2),
  experience_years INTEGER,
  education TEXT[],
  certifications TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doctors IS 'Doctor-specific profile information';
COMMENT ON COLUMN doctors.license_number IS 'CRM (Conselho Regional de Medicina) number';

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  date_of_birth DATE,
  cpf VARCHAR(14) UNIQUE,
  blood_type VARCHAR(5),
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  medical_history TEXT[],
  allergies TEXT[],
  insurance_provider VARCHAR(255),
  insurance_number VARCHAR(100),
  health_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'Patient-specific profile and medical information';
COMMENT ON COLUMN patients.doctor_id IS 'Assigned doctor for this patient';
COMMENT ON COLUMN patients.cpf IS 'CPF (Cadastro de Pessoas Físicas) - Brazilian tax ID';

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  type VARCHAR(50) CHECK (type IN ('consultation', 'follow-up', 'emergency')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  symptoms TEXT[],
  diagnosis TEXT,
  treatment TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE appointments IS 'Appointment scheduling and records';
COMMENT ON COLUMN appointments.status IS 'Appointment status: scheduled, confirmed, completed, or cancelled';

-- ============================================================================
-- PRESCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  prescription_date DATE DEFAULT CURRENT_DATE,
  duration_days INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  instructions TEXT,
  doctor_notes TEXT,
  patient_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prescriptions IS 'Medical prescriptions';
COMMENT ON COLUMN prescriptions.status IS 'Prescription status: active, completed, or discontinued';

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  instructions TEXT,
  is_taken BOOLEAN DEFAULT FALSE,
  last_taken_at TIMESTAMPTZ,
  next_dose_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medications IS 'Medications within prescriptions';
COMMENT ON COLUMN medications.frequency IS 'e.g., "Once daily", "Twice daily", "Every 8 hours"';

-- ============================================================================
-- EXAMS TABLE
-- ============================================================================
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  exam_date DATE DEFAULT CURRENT_DATE,
  exam_type VARCHAR(255) NOT NULL,
  exam_name VARCHAR(255) NOT NULL,
  results TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  doctor_notes TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(50),
  upload_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE exams IS 'Medical examination records and results';
COMMENT ON COLUMN exams.file_url IS 'Supabase Storage path to exam file';

-- ============================================================================
-- MOOD ENTRIES TABLE
-- ============================================================================
CREATE TABLE mood_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  entry_date DATE DEFAULT CURRENT_DATE,
  mood_level INTEGER NOT NULL CHECK (mood_level BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  anxiety_level INTEGER CHECK (anxiety_level BETWEEN 1 AND 5),
  depression_level INTEGER CHECK (depression_level BETWEEN 1 AND 5),
  sleep_hours DECIMAL(4,2) CHECK (sleep_hours BETWEEN 0 AND 24),
  exercise_minutes INTEGER,
  social_interaction VARCHAR(50) CHECK (social_interaction IN ('none', 'minimal', 'moderate', 'high')),
  medication_taken BOOLEAN DEFAULT FALSE,
  notes TEXT,
  activities TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE mood_entries IS 'Patient daily mood and mental health tracking';
COMMENT ON COLUMN mood_entries.mood_level IS 'Mood scale: 1 (very bad) to 5 (very good)';

-- ============================================================================
-- DOCTOR NOTES TABLE
-- ============================================================================
CREATE TABLE doctor_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  note_date DATE DEFAULT CURRENT_DATE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  is_visible_to_patient BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doctor_notes IS 'Clinical notes written by doctors';
COMMENT ON COLUMN doctor_notes.is_visible_to_patient IS 'Whether patient can view this note';

-- ============================================================================
-- AUDIT LOGS TABLE (LGPD Compliance)
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'LGPD compliance: audit trail for all data access and modifications';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: LOGIN, DATA_ACCESS, DATA_MODIFICATION, etc.';

-- ============================================================================
-- CONSENTS TABLE (LGPD Compliance)
-- ============================================================================
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(50) NOT NULL,
  language VARCHAR(10) DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE consents IS 'LGPD compliance: user consent management';
COMMENT ON COLUMN consents.consent_type IS 'Type: data_processing, sensitive_health_data, data_sharing_doctors, etc.';
COMMENT ON COLUMN consents.version IS 'Version of terms/policy accepted';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_notes_updated_at BEFORE UPDATE ON doctor_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
