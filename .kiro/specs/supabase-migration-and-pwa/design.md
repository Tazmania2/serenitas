# Design Document - Clínica Serenitas System

## Overview

This document outlines the technical design for migrating the Clínica Serenitas system from MongoDB to Supabase and building a Progressive Web App with role-based dashboards. The design prioritizes LGPD compliance, security, and user experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (PWA)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Patient  │  │  Doctor  │  │Secretary │  │  Admin   │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │Dashboard │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         React + Vite + TailwindCSS                    │  │
│  │         Service Worker + PWA Manifest                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Layer (Node.js)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Express.js API Server                         │  │
│  │  - Authentication Middleware                          │  │
│  │  - Authorization Middleware                           │  │
│  │  - Validation Middleware                              │  │
│  │  - Audit Logging Middleware                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Client SDK
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Platform (BaaS)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Storage   │  │     Auth     │     │
│  │  + RLS       │  │  (Files)     │  │   (JWT)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ (UI framework)
- Vite (build tool)
- TailwindCSS (styling)
- React Router (routing)
- React Query (data fetching)
- Zustand (state management)
- PWA with Workbox (service worker)

**Backend:**
- Node.js 18+
- Express.js 4.x
- Supabase JS Client
- bcryptjs (password hashing)
- jsonwebtoken (JWT)
- helmet (security headers)
- express-rate-limit (rate limiting)
- express-validator (input validation)

**Database & Services:**
- Supabase PostgreSQL
- Supabase Storage
- Supabase Auth (optional, using custom JWT)
- Supabase Realtime (future feature)


## Data Models

### PostgreSQL Schema Design

#### Users Table
```sql
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Patients Table
```sql
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

CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX idx_patients_cpf ON patients(cpf);
```

#### Doctors Table
```sql
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

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_license ON doctors(license_number);
```

#### Appointments Table
```sql
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

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
```

#### Prescriptions Table
```sql
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

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
```

#### Medications Table (nested in Prescriptions)
```sql
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

CREATE INDEX idx_medications_prescription ON medications(prescription_id);
```

#### Exams Table
```sql
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

CREATE INDEX idx_exams_patient ON exams(patient_id);
CREATE INDEX idx_exams_doctor ON exams(doctor_id);
CREATE INDEX idx_exams_status ON exams(status);
```

#### Mood Entries Table
```sql
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

CREATE INDEX idx_mood_entries_patient ON mood_entries(patient_id);
CREATE INDEX idx_mood_entries_date ON mood_entries(entry_date);
```

#### Doctor Notes Table
```sql
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

CREATE INDEX idx_doctor_notes_patient ON doctor_notes(patient_id);
CREATE INDEX idx_doctor_notes_doctor ON doctor_notes(doctor_id);
```

#### Audit Logs Table
```sql
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

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

#### Consents Table (LGPD)
```sql
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

CREATE INDEX idx_consents_user ON consents(user_id);
CREATE INDEX idx_consents_type ON consents(consent_type);
```


## Row-Level Security (RLS) Policies

### Patients Table RLS

```sql
-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Patients can view own data
CREATE POLICY "Patients can view own data"
ON patients FOR SELECT
USING (
  user_id = auth.uid()
);

-- Doctors can view assigned patients
CREATE POLICY "Doctors can view assigned patients"
ON patients FOR SELECT
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- Secretaries can view all patients
CREATE POLICY "Secretaries can view all patients"
ON patients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'secretary'
  )
);

-- Admins can view all patients
CREATE POLICY "Admins can view all patients"
ON patients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Patients can update own data
CREATE POLICY "Patients can update own data"
ON patients FOR UPDATE
USING (user_id = auth.uid());

-- Secretaries and Admins can update any patient
CREATE POLICY "Secretaries and Admins can update patients"
ON patients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('secretary', 'admin')
  )
);
```

### Prescriptions Table RLS

```sql
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Patients can view own prescriptions
CREATE POLICY "Patients can view own prescriptions"
ON prescriptions FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Doctors can view prescriptions for assigned patients
CREATE POLICY "Doctors can view assigned patient prescriptions"
ON prescriptions FOR SELECT
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- Doctors can create prescriptions for assigned patients
CREATE POLICY "Doctors can create prescriptions"
ON prescriptions FOR INSERT
WITH CHECK (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
  AND patient_id IN (
    SELECT id FROM patients 
    WHERE doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);

-- Admins have full access
CREATE POLICY "Admins have full prescription access"
ON prescriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### Exams Table RLS

```sql
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- Patients can view and upload own exams
CREATE POLICY "Patients can manage own exams"
ON exams FOR ALL
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Doctors can view exams for assigned patients
CREATE POLICY "Doctors can view assigned patient exams"
ON exams FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);

-- Doctors can update exam notes
CREATE POLICY "Doctors can update exam notes"
ON exams FOR UPDATE
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);
```

### Mood Entries Table RLS

```sql
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Patients can manage own mood entries
CREATE POLICY "Patients can manage own mood entries"
ON mood_entries FOR ALL
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Doctors can view mood entries for assigned patients
CREATE POLICY "Doctors can view assigned patient mood entries"
ON mood_entries FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);
```

### Doctor Notes Table RLS

```sql
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;

-- Patients can view notes marked as visible
CREATE POLICY "Patients can view visible notes"
ON doctor_notes FOR SELECT
USING (
  is_visible_to_patient = TRUE
  AND patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Doctors can manage notes for assigned patients
CREATE POLICY "Doctors can manage notes for assigned patients"
ON doctor_notes FOR ALL
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
  AND patient_id IN (
    SELECT id FROM patients 
    WHERE doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  )
);
```


## Components and Interfaces

### Backend API Structure

```
serenitas_backend/
├── config/
│   ├── supabase.js          # Supabase client configuration
│   ├── constants.js         # Business constants
│   └── index.js             # Main config loader
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── rbac.js              # Role-based access control
│   ├── validation.js        # Input validation
│   ├── audit.js             # Audit logging
│   └── rateLimit.js         # Rate limiting
├── services/
│   ├── authService.js       # Authentication logic
│   ├── patientService.js    # Patient business logic
│   ├── doctorService.js     # Doctor business logic
│   ├── prescriptionService.js
│   ├── examService.js
│   ├── moodService.js
│   ├── auditService.js
│   └── lgpdService.js       # LGPD compliance functions
├── routes/
│   ├── auth.js              # /api/auth/*
│   ├── patients.js          # /api/patients/*
│   ├── doctors.js           # /api/doctors/*
│   ├── appointments.js      # /api/appointments/*
│   ├── prescriptions.js     # /api/prescriptions/*
│   ├── exams.js             # /api/exams/*
│   ├── moodEntries.js       # /api/mood-entries/*
│   ├── doctorNotes.js       # /api/doctor-notes/*
│   ├── users.js             # /api/users/*
│   └── lgpd.js              # /api/lgpd/*
├── utils/
│   ├── logger.js            # Structured logging
│   ├── encryption.js        # Data encryption
│   ├── validation.js        # Validation helpers
│   └── formatters.js        # Brazilian formatters
├── migrations/
│   └── mongodb-to-supabase.js  # Migration script
└── index.js                 # Express app entry
```

### Frontend Application Structure

```
serenitas_app/
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   └── icons/               # App icons
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Loading.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   ├── patient/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Prescriptions.jsx
│   │   │   ├── Exams.jsx
│   │   │   ├── MoodTracker.jsx
│   │   │   └── DoctorNotes.jsx
│   │   ├── doctor/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientList.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   ├── CreatePrescription.jsx
│   │   │   └── WriteNote.jsx
│   │   ├── secretary/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AppointmentManager.jsx
│   │   │   └── PatientRegistration.jsx
│   │   └── admin/
│   │       ├── Dashboard.jsx
│   │       ├── UserManagement.jsx
│   │       └── AuditLogs.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── usePatient.js
│   │   ├── useDoctor.js
│   │   └── useLGPD.js
│   ├── services/
│   │   ├── api.js           # Axios instance
│   │   ├── authService.js
│   │   ├── patientService.js
│   │   └── storageService.js
│   ├── store/
│   │   ├── authStore.js     # Zustand auth store
│   │   └── uiStore.js       # UI state
│   ├── utils/
│   │   ├── formatters.js    # Brazilian formatters
│   │   ├── validators.js    # CPF, phone validation
│   │   └── constants.js
│   ├── styles/
│   │   └── globals.css      # Tailwind + custom styles
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### Key Interfaces

#### Authentication Service Interface

```typescript
interface AuthService {
  register(userData: RegisterData): Promise<AuthResponse>;
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
  getCurrentUser(): Promise<User>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'secretary' | 'admin';
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}
```

#### Patient Service Interface

```typescript
interface PatientService {
  getProfile(patientId: string): Promise<Patient>;
  updateProfile(patientId: string, data: Partial<Patient>): Promise<Patient>;
  getPrescriptions(patientId: string): Promise<Prescription[]>;
  getExams(patientId: string): Promise<Exam[]>;
  uploadExam(patientId: string, file: File, metadata: ExamMetadata): Promise<Exam>;
  getMoodEntries(patientId: string, dateRange?: DateRange): Promise<MoodEntry[]>;
  createMoodEntry(patientId: string, data: MoodEntryData): Promise<MoodEntry>;
  getDoctorNotes(patientId: string): Promise<DoctorNote[]>;
  updateHealthStatus(patientId: string, status: string): Promise<Patient>;
}
```

#### Doctor Service Interface

```typescript
interface DoctorService {
  getAssignedPatients(doctorId: string): Promise<Patient[]>;
  getPatientDetail(patientId: string): Promise<PatientDetail>;
  createPrescription(data: PrescriptionData): Promise<Prescription>;
  updatePrescription(prescriptionId: string, data: Partial<Prescription>): Promise<Prescription>;
  writeDoctorNote(data: DoctorNoteData): Promise<DoctorNote>;
  getAppointments(doctorId: string, date?: Date): Promise<Appointment[]>;
  updateAppointment(appointmentId: string, data: Partial<Appointment>): Promise<Appointment>;
}
```

#### LGPD Service Interface

```typescript
interface LGPDService {
  exportUserData(userId: string): Promise<UserDataExport>;
  requestAccountDeletion(userId: string): Promise<DeletionRequest>;
  revokeConsent(userId: string, consentType: string): Promise<void>;
  getDataUsageInfo(userId: string): Promise<DataUsageInfo>;
  getAuditLogs(userId: string): Promise<AuditLog[]>;
}
```


## Error Handling

### Error Response Format

All API errors follow this structure:

```javascript
{
  success: false,
  message: "Mensagem de erro em português",
  error: "Detalhes técnicos do erro",
  code: "ERROR_CODE",
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Error Codes

```javascript
const ErrorCodes = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_UNAUTHORIZED: 'AUTH_004',
  
  // Authorization
  AUTHZ_FORBIDDEN: 'AUTHZ_001',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',
  AUTHZ_DOCTOR_NOT_ASSIGNED: 'AUTHZ_003',
  
  // Validation
  VALIDATION_REQUIRED_FIELD: 'VAL_001',
  VALIDATION_INVALID_FORMAT: 'VAL_002',
  VALIDATION_CPF_INVALID: 'VAL_003',
  VALIDATION_FILE_TOO_LARGE: 'VAL_004',
  VALIDATION_FILE_TYPE_INVALID: 'VAL_005',
  
  // Business Logic
  BUSINESS_APPOINTMENT_CONFLICT: 'BUS_001',
  BUSINESS_PRESCRIPTION_EXPIRED: 'BUS_002',
  BUSINESS_PATIENT_NOT_FOUND: 'BUS_003',
  
  // LGPD
  LGPD_CONSENT_REQUIRED: 'LGPD_001',
  LGPD_DATA_RETENTION_VIOLATION: 'LGPD_002',
  
  // System
  SYSTEM_DATABASE_ERROR: 'SYS_001',
  SYSTEM_STORAGE_ERROR: 'SYS_002',
  SYSTEM_INTERNAL_ERROR: 'SYS_003'
};
```

### Error Handling Middleware

```javascript
// Global error handler
app.use((err, req, res, next) => {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    ip: req.ip
  });

  // Determine error type and response
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || ErrorCodes.SYSTEM_INTERNAL_ERROR;
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Erro interno do servidor'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    code: errorCode,
    timestamp: new Date().toISOString()
  });
});
```

## Testing Strategy

### Unit Tests

**Coverage Target:** 80% minimum

**Test Framework:** Jest + Supertest

**Areas to Test:**
- Service layer business logic
- Validation functions
- Utility functions (formatters, validators)
- Middleware (auth, RBAC, validation)
- LGPD compliance functions

**Example Test Structure:**

```javascript
describe('PrescriptionService', () => {
  describe('createPrescription', () => {
    it('should create prescription with valid data', async () => {
      // Arrange
      const prescriptionData = {
        patientId: 'uuid-patient',
        doctorId: 'uuid-doctor',
        medications: [{ name: 'Sertraline', dosage: '50mg', frequency: 'Daily', quantity: 30 }],
        duration: 30
      };

      // Act
      const result = await prescriptionService.createPrescription(prescriptionData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('active');
    });

    it('should reject prescription with empty medications', async () => {
      // Test implementation
    });

    it('should reject prescription for unassigned patient', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

**Areas to Test:**
- API endpoints with authentication
- Database operations with RLS
- File upload/download flows
- LGPD data export/deletion

### E2E Tests

**Tool:** Playwright or Cypress

**Critical Flows:**
- User registration and login
- Patient viewing prescriptions
- Doctor creating prescription
- Secretary scheduling appointment
- Admin managing users
- LGPD data export

### Security Tests

- SQL injection attempts
- XSS attempts
- CSRF protection
- Rate limiting
- Authentication bypass attempts
- Authorization bypass attempts


## Migration Strategy

### Phase 1: Database Setup

1. Create Supabase project
2. Run SQL migrations to create tables
3. Set up RLS policies
4. Configure storage buckets
5. Test database connectivity

### Phase 2: Data Migration

```javascript
// Migration script structure
async function migrateFromMongoDBToSupabase() {
  // 1. Export MongoDB data
  const mongoUsers = await User.find({});
  const mongoPatients = await Patient.find({});
  const mongoDoctors = await Doctor.find({});
  // ... other collections

  // 2. Transform data to PostgreSQL format
  const pgUsers = mongoUsers.map(transformUser);
  const pgPatients = mongoPatients.map(transformPatient);
  // ... other transformations

  // 3. Import to Supabase
  await supabase.from('users').insert(pgUsers);
  await supabase.from('patients').insert(pgPatients);
  // ... other inserts

  // 4. Verify data integrity
  await verifyMigration();
}

function transformUser(mongoUser) {
  return {
    id: mongoUser._id.toString(),
    email: mongoUser.email,
    password_hash: mongoUser.password,
    name: mongoUser.name,
    phone: mongoUser.phone,
    role: mongoUser.role,
    created_at: mongoUser.createdAt,
    updated_at: mongoUser.updatedAt
  };
}
```

### Phase 3: Backend Migration

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Replace Mongoose models with Supabase queries
3. Update authentication to use JWT with Supabase
4. Implement RLS-aware queries
5. Update file storage to use Supabase Storage

### Phase 4: Testing

1. Unit test all services
2. Integration test all API endpoints
3. Test RLS policies
4. Test file upload/download
5. Performance testing

### Phase 5: Deployment

1. Deploy Supabase database (already hosted)
2. Deploy backend to Vercel/Railway
3. Deploy frontend PWA to Vercel/Netlify
4. Configure environment variables
5. Run smoke tests
6. Monitor for errors

## Security Considerations

### Authentication Flow

```
1. User submits credentials
   ↓
2. Backend validates credentials
   ↓
3. Backend queries Supabase for user
   ↓
4. Backend verifies password with bcrypt
   ↓
5. Backend generates JWT with user ID and role
   ↓
6. Backend returns JWT to client
   ↓
7. Client stores JWT in localStorage
   ↓
8. Client includes JWT in Authorization header
   ↓
9. Backend middleware verifies JWT
   ↓
10. Backend attaches user to request
   ↓
11. RLS policies enforce data access
```

### Password Security

- Hash with bcrypt, cost factor 12
- Minimum 8 characters
- Require uppercase, lowercase, number, special character
- Implement password reset with time-limited tokens
- Invalidate all tokens on password change

### File Upload Security

```javascript
// File validation
function validateFileUpload(file) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError('Tipo de arquivo inválido');
  }

  if (file.size > maxSize) {
    throw new ValidationError('Arquivo muito grande (máximo 5MB)');
  }

  // Sanitize filename
  const sanitizedName = file.originalname
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255);

  return sanitizedName;
}

// Upload to Supabase Storage
async function uploadExamFile(patientId, file) {
  const fileName = `${patientId}/${Date.now()}_${validateFileUpload(file)}`;
  
  const { data, error } = await supabase.storage
    .from('exams')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw error;

  // Generate signed URL (expires in 1 hour)
  const { data: urlData } = await supabase.storage
    .from('exams')
    .createSignedUrl(fileName, 3600);

  return {
    fileName,
    fileUrl: urlData.signedUrl,
    fileSize: file.size,
    fileType: file.mimetype
  };
}
```

### Rate Limiting Configuration

```javascript
const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Auth limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

## Performance Optimization

### Database Indexing

All foreign keys and frequently queried columns have indexes (see Data Models section).

### Query Optimization

```javascript
// Bad - N+1 query problem
const prescriptions = await supabase
  .from('prescriptions')
  .select('*');

for (const prescription of prescriptions) {
  const medications = await supabase
    .from('medications')
    .select('*')
    .eq('prescription_id', prescription.id);
}

// Good - Single query with join
const { data: prescriptions } = await supabase
  .from('prescriptions')
  .select(`
    *,
    medications (*),
    patient:patients (
      user:users (name, email)
    ),
    doctor:doctors (
      user:users (name, email)
    )
  `);
```

### Caching Strategy

```javascript
// Cache user profile for 5 minutes
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    res.sendResponse = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  };
};

router.get('/profile', auth, cacheMiddleware(300), getProfile);
```

### Frontend Optimization

- Code splitting by route
- Lazy loading images
- React Query for data caching
- Debounce search inputs
- Virtualize long lists
- Compress images before upload
- Use WebP format where supported

## Monitoring and Logging

### Structured Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.info('User login', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  timestamp: new Date().toISOString()
});
```

### Health Check Endpoint

```javascript
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                        │
│                  (SSL/TLS, DDoS Protection)              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Vercel/Netlify                          │
│              (Frontend PWA Hosting)                      │
│  - Automatic HTTPS                                       │
│  - Global CDN                                            │
│  - Automatic deployments from Git                        │
└─────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel/Railway/Render                       │
│              (Backend API Hosting)                       │
│  - Node.js Express server                                │
│  - Environment variables                                 │
│  - Automatic scaling                                     │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Client
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase Platform                     │
│  - PostgreSQL Database (with RLS)                        │
│  - Storage (for exam files)                              │
│  - Automatic backups                                     │
│  - Connection pooling                                    │
└─────────────────────────────────────────────────────────┘
```

### Environment Variables

**Backend (.env):**
```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret-256-bits
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your-encryption-key-hex
DPO_EMAIL=dpo@clinicaserenitas.com.br
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app
LOG_LEVEL=info
```

**Frontend (.env):**
```
VITE_API_URL=https://api.serenitas.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=Clínica Serenitas
VITE_APP_VERSION=1.0.0
```

