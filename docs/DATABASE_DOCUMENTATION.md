# Database Documentation - Clínica Serenitas

## Overview

**Database:** PostgreSQL (via Supabase)  
**Version:** PostgreSQL 15+  
**Schema:** public  
**Timezone:** UTC (converted to America/Sao_Paulo in application)

## Architecture

The database uses:
- **Row-Level Security (RLS)** for data access control
- **Foreign keys** for referential integrity
- **Indexes** for query optimization
- **Triggers** for automatic timestamps
- **UUID** for primary keys

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
│  patients   │ │ doctors  │  │secretaries│  │  admins  │
└──────┬──────┘ └────┬─────┘  └──────────┘  └──────────┘
       │             │
       │             │
       ├─────────────┼──────────────┬──────────────┬──────────────┐
       │             │              │              │              │
┌──────▼──────┐ ┌───▼────────┐ ┌──▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
│appointments │ │prescriptions│ │  exams  │ │mood_entries│ │doctor_notes│
└─────────────┘ └──────┬──────┘ └─────────┘ └──────────┘ └─────────────┘
                       │
                ┌──────▼──────┐
                │medications  │
                └─────────────┘

┌─────────────┐  ┌─────────────┐
│ audit_logs  │  │  consents   │
└─────────────┘  └─────────────┘
```


## Tables

### users

Stores all user accounts (patients, doctors, secretaries, admins).

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email (login) |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| name | VARCHAR(255) | NOT NULL | Full name |
| phone | VARCHAR(20) | | Phone number |
| role | VARCHAR(20) | NOT NULL, CHECK (role IN ('patient', 'doctor', 'secretary', 'admin')) | User role |
| last_login_at | TIMESTAMPTZ | | Last login timestamp |
| deletion_scheduled | BOOLEAN | DEFAULT FALSE | Account deletion scheduled |
| deletion_date | TIMESTAMPTZ | | Scheduled deletion date |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_email` ON (email)
- `idx_users_role` ON (role)

**RLS Policies:**
- Users can view own profile
- Admins can view all users
- Secretaries can view basic user info

---

### patients

Patient-specific information and medical data.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Link to user account |
| doctor_id | UUID | REFERENCES doctors(id) | Assigned doctor |
| date_of_birth | DATE | | Birth date |
| cpf | VARCHAR(14) | UNIQUE | Brazilian tax ID |
| blood_type | VARCHAR(5) | | Blood type (A+, O-, etc) |
| height | DECIMAL(5,2) | | Height in cm |
| weight | DECIMAL(5,2) | | Weight in kg |
| emergency_contact_name | VARCHAR(255) | | Emergency contact name |
| emergency_contact_phone | VARCHAR(20) | | Emergency contact phone |
| emergency_contact_relationship | VARCHAR(100) | | Relationship to patient |
| medical_history | TEXT[] | | Array of medical conditions |
| allergies | TEXT[] | | Array of allergies |
| insurance_provider | VARCHAR(255) | | Health insurance provider |
| insurance_number | VARCHAR(100) | | Insurance policy number |
| health_status | TEXT | | Current health status notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_patients_user_id` ON (user_id)
- `idx_patients_doctor_id` ON (doctor_id)
- `idx_patients_cpf` ON (cpf)

**RLS Policies:**
- Patients can view/update own data
- Doctors can view assigned patients only
- Secretaries can view/update contact info (not medical data)
- Admins have full access

---

### doctors

Doctor-specific information.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Link to user account |
| specialization | VARCHAR(255) | NOT NULL | Medical specialization |
| license_number | VARCHAR(100) | UNIQUE, NOT NULL | CRM number |
| consultation_fee | DECIMAL(10,2) | | Consultation price |
| experience_years | INTEGER | | Years of experience |
| education | TEXT[] | | Array of education credentials |
| certifications | TEXT[] | | Array of certifications |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_doctors_user_id` ON (user_id)
- `idx_doctors_license` ON (license_number)

**RLS Policies:**
- Doctors can view/update own profile
- All authenticated users can view doctor list
- Admins have full access

---

### appointments

Appointment scheduling and management.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient |
| doctor_id | UUID | NOT NULL, REFERENCES doctors(id) ON DELETE CASCADE | Doctor |
| appointment_date | DATE | NOT NULL | Appointment date |
| appointment_time | TIME | NOT NULL | Appointment time |
| duration_minutes | INTEGER | DEFAULT 60 | Duration in minutes |
| type | VARCHAR(50) | CHECK (type IN ('consultation', 'follow-up', 'emergency')) | Appointment type |
| status | VARCHAR(50) | DEFAULT 'scheduled', CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')) | Status |
| notes | TEXT | | General notes |
| symptoms | TEXT[] | | Patient symptoms |
| diagnosis | TEXT | | Doctor's diagnosis |
| treatment | TEXT | | Treatment plan |
| cancellation_reason | TEXT | | Reason if cancelled |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_appointments_patient` ON (patient_id)
- `idx_appointments_doctor` ON (doctor_id)
- `idx_appointments_date` ON (appointment_date)
- `idx_appointments_status` ON (status)

**RLS Policies:**
- Patients can view own appointments
- Doctors can view appointments for assigned patients
- Secretaries can view/manage all appointments
- Admins have full access

---

### prescriptions

Medical prescriptions.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient |
| doctor_id | UUID | NOT NULL, REFERENCES doctors(id) ON DELETE CASCADE | Prescribing doctor |
| appointment_id | UUID | REFERENCES appointments(id) | Related appointment |
| prescription_date | DATE | DEFAULT CURRENT_DATE | Prescription date |
| duration_days | INTEGER | NOT NULL | Duration in days |
| status | VARCHAR(50) | DEFAULT 'active', CHECK (status IN ('active', 'completed', 'discontinued')) | Status |
| instructions | TEXT | | General instructions |
| doctor_notes | TEXT | | Internal doctor notes |
| patient_notes | TEXT | | Patient-visible notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_prescriptions_patient` ON (patient_id)
- `idx_prescriptions_doctor` ON (doctor_id)
- `idx_prescriptions_status` ON (status)

**RLS Policies:**
- Patients can view own prescriptions
- Doctors can view/create/update prescriptions for assigned patients
- Admins have full access

---

### medications

Medications within prescriptions.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| prescription_id | UUID | NOT NULL, REFERENCES prescriptions(id) ON DELETE CASCADE | Parent prescription |
| name | VARCHAR(255) | NOT NULL | Medication name |
| dosage | VARCHAR(100) | NOT NULL | Dosage (e.g., "50mg") |
| frequency | VARCHAR(100) | NOT NULL | Frequency (e.g., "1x ao dia") |
| quantity | INTEGER | NOT NULL | Total quantity |
| instructions | TEXT | | Specific instructions |
| is_taken | BOOLEAN | DEFAULT FALSE | Taken today |
| last_taken_at | TIMESTAMPTZ | | Last taken timestamp |
| next_dose_time | TIME | | Next scheduled dose |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_medications_prescription` ON (prescription_id)

**RLS Policies:**
- Inherits from prescriptions table


### exams

Medical examination records and files.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient |
| doctor_id | UUID | REFERENCES doctors(id) | Reviewing doctor |
| exam_date | DATE | DEFAULT CURRENT_DATE | Exam date |
| exam_type | VARCHAR(255) | NOT NULL | Type (Laboratorial, Imagem, etc) |
| exam_name | VARCHAR(255) | NOT NULL | Exam name |
| results | TEXT | | Exam results |
| status | VARCHAR(50) | DEFAULT 'pending', CHECK (status IN ('pending', 'completed', 'cancelled')) | Status |
| notes | TEXT | | Patient notes |
| doctor_notes | TEXT | | Doctor's observations |
| file_url | TEXT | | Supabase Storage URL |
| file_name | VARCHAR(255) | | Original filename |
| file_size | INTEGER | | File size in bytes |
| file_type | VARCHAR(50) | | MIME type |
| upload_date | TIMESTAMPTZ | | Upload timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_exams_patient` ON (patient_id)
- `idx_exams_doctor` ON (doctor_id)
- `idx_exams_status` ON (status)

**RLS Policies:**
- Patients can view/upload own exams
- Doctors can view exams for assigned patients
- Admins have full access

---

### mood_entries

Patient mood tracking entries.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient |
| entry_date | DATE | DEFAULT CURRENT_DATE | Entry date |
| mood_level | INTEGER | NOT NULL, CHECK (mood_level BETWEEN 1 AND 5) | Mood (1-5 scale) |
| stress_level | INTEGER | CHECK (stress_level BETWEEN 1 AND 5) | Stress (1-5 scale) |
| anxiety_level | INTEGER | CHECK (anxiety_level BETWEEN 1 AND 5) | Anxiety (1-5 scale) |
| depression_level | INTEGER | CHECK (depression_level BETWEEN 1 AND 5) | Depression (1-5 scale) |
| sleep_hours | DECIMAL(4,2) | CHECK (sleep_hours BETWEEN 0 AND 24) | Hours of sleep |
| exercise_minutes | INTEGER | | Exercise duration |
| social_interaction | VARCHAR(50) | CHECK (social_interaction IN ('none', 'minimal', 'moderate', 'high')) | Social interaction level |
| medication_taken | BOOLEAN | DEFAULT FALSE | Medication taken |
| notes | TEXT | | Additional notes |
| activities | TEXT[] | | Activities performed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_mood_entries_patient` ON (patient_id)
- `idx_mood_entries_date` ON (entry_date)

**RLS Policies:**
- Patients can create/view/update own entries
- Doctors can view entries for assigned patients
- Admins have full access

---

### doctor_notes

Clinical notes written by doctors.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient |
| doctor_id | UUID | NOT NULL, REFERENCES doctors(id) ON DELETE CASCADE | Author doctor |
| appointment_id | UUID | REFERENCES appointments(id) | Related appointment |
| note_date | DATE | DEFAULT CURRENT_DATE | Note date |
| title | VARCHAR(255) | | Note title |
| content | TEXT | NOT NULL | Note content |
| is_visible_to_patient | BOOLEAN | DEFAULT TRUE | Visibility flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_doctor_notes_patient` ON (patient_id)
- `idx_doctor_notes_doctor` ON (doctor_id)

**RLS Policies:**
- Patients can view notes where is_visible_to_patient = TRUE
- Doctors can create/view/update notes for assigned patients
- Admins have full access

---

### audit_logs

System audit trail for LGPD compliance.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | REFERENCES users(id) | User who performed action |
| action | VARCHAR(100) | NOT NULL | Action type |
| resource_type | VARCHAR(100) | | Resource type accessed |
| resource_id | UUID | | Resource identifier |
| ip_address | INET | | IP address |
| user_agent | TEXT | | Browser user agent |
| details | JSONB | | Additional details |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Action timestamp |

**Action Types:**
- DATA_ACCESS
- DATA_MODIFICATION
- DATA_DELETION
- DATA_EXPORT
- CONSENT_GRANTED
- CONSENT_REVOKED
- LOGIN
- LOGOUT
- FAILED_LOGIN
- PASSWORD_CHANGE
- SENSITIVE_DATA_ACCESS

**Indexes:**
- `idx_audit_logs_user` ON (user_id)
- `idx_audit_logs_action` ON (action)
- `idx_audit_logs_created` ON (created_at)

**RLS Policies:**
- Only admins can view audit logs
- System automatically creates entries (no user access)

---

### consents

LGPD consent management.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User |
| consent_type | VARCHAR(100) | NOT NULL | Consent type |
| granted | BOOLEAN | NOT NULL | Granted or revoked |
| granted_at | TIMESTAMPTZ | | Grant timestamp |
| revoked_at | TIMESTAMPTZ | | Revocation timestamp |
| ip_address | INET | | IP address |
| user_agent | TEXT | | Browser user agent |
| version | VARCHAR(50) | NOT NULL | Terms version |
| language | VARCHAR(10) | DEFAULT 'pt-BR' | Language |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Consent Types:**
- data_processing
- sensitive_health_data
- data_sharing_doctors
- data_retention
- marketing_communications

**Indexes:**
- `idx_consents_user` ON (user_id)
- `idx_consents_type` ON (consent_type)

**RLS Policies:**
- Users can view own consents
- Users can create consent records
- Admins have full access


## Row-Level Security (RLS) Policies

### Overview

RLS enforces data access control at the database level, ensuring LGPD compliance and medical confidentiality.

### Policy Structure

Each table has policies for:
- **SELECT**: Who can read data
- **INSERT**: Who can create data
- **UPDATE**: Who can modify data
- **DELETE**: Who can delete data

### Authentication Context

RLS policies use `auth.uid()` to identify the current user. This is set by the application using Supabase's authentication context.

### Example Policies

#### Patients Table

```sql
-- Patients can view own data
CREATE POLICY "Patients can view own data"
ON patients FOR SELECT
USING (user_id = auth.uid());

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
```

#### Prescriptions Table

```sql
-- Patients can view own prescriptions
CREATE POLICY "Patients can view own prescriptions"
ON prescriptions FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
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
```

### Policy Testing

Test RLS policies with different user contexts:

```sql
-- Set user context
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-uuid';

-- Test query
SELECT * FROM patients;

-- Reset
RESET role;
```

---

## Indexes

### Purpose

Indexes improve query performance for:
- Foreign key lookups
- Filtering and searching
- Sorting
- Join operations

### Index List

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| users | idx_users_email | email | Login lookup |
| users | idx_users_role | role | Role filtering |
| patients | idx_patients_user_id | user_id | User-patient join |
| patients | idx_patients_doctor_id | doctor_id | Doctor-patient join |
| patients | idx_patients_cpf | cpf | CPF lookup |
| doctors | idx_doctors_user_id | user_id | User-doctor join |
| doctors | idx_doctors_license | license_number | License lookup |
| appointments | idx_appointments_patient | patient_id | Patient appointments |
| appointments | idx_appointments_doctor | doctor_id | Doctor schedule |
| appointments | idx_appointments_date | appointment_date | Date filtering |
| appointments | idx_appointments_status | status | Status filtering |
| prescriptions | idx_prescriptions_patient | patient_id | Patient prescriptions |
| prescriptions | idx_prescriptions_doctor | doctor_id | Doctor prescriptions |
| prescriptions | idx_prescriptions_status | status | Status filtering |
| medications | idx_medications_prescription | prescription_id | Prescription medications |
| exams | idx_exams_patient | patient_id | Patient exams |
| exams | idx_exams_doctor | doctor_id | Doctor exams |
| exams | idx_exams_status | status | Status filtering |
| mood_entries | idx_mood_entries_patient | patient_id | Patient mood history |
| mood_entries | idx_mood_entries_date | entry_date | Date filtering |
| doctor_notes | idx_doctor_notes_patient | patient_id | Patient notes |
| doctor_notes | idx_doctor_notes_doctor | doctor_id | Doctor notes |
| audit_logs | idx_audit_logs_user | user_id | User activity |
| audit_logs | idx_audit_logs_action | action | Action filtering |
| audit_logs | idx_audit_logs_created | created_at | Time-based queries |
| consents | idx_consents_user | user_id | User consents |
| consents | idx_consents_type | consent_type | Consent type filtering |

### Index Maintenance

Indexes are automatically maintained by PostgreSQL. Monitor index usage:

```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```

---

## Data Retention Policies

### LGPD and CFM Compliance

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Medical Records | 20 years minimum | CFM Resolution 1.821/2007 |
| Audit Logs | 5 years | LGPD compliance |
| Personal Data | While relationship exists | LGPD Art. 16 |
| Inactive Accounts | 2 years | LGPD Art. 16 |
| Deleted Accounts | 30-day grace period | User rights |

### Automatic Cleanup

Scheduled jobs handle data retention:

```sql
-- Find inactive accounts (2+ years no login)
SELECT id, name, email, last_login_at
FROM users
WHERE last_login_at < NOW() - INTERVAL '2 years'
  AND deletion_scheduled = FALSE;

-- Schedule deletion
UPDATE users
SET deletion_scheduled = TRUE,
    deletion_date = NOW() + INTERVAL '30 days'
WHERE last_login_at < NOW() - INTERVAL '2 years'
  AND deletion_scheduled = FALSE;

-- Execute scheduled deletions
DELETE FROM users
WHERE deletion_scheduled = TRUE
  AND deletion_date < NOW();
```

### Medical Records Exception

Medical records (prescriptions, exams, doctor notes) are preserved for 20 years even after account deletion, as required by CFM regulations.

---

## Backup and Recovery

### Backup Strategy

**Supabase Automatic Backups:**
- Daily backups (retained for 7 days)
- Point-in-time recovery (PITR) available
- Backups stored in multiple regions

**Manual Backups:**

```bash
# Export database
pg_dump -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d).dump

# Export specific table
pg_dump -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -t patients \
  -F c \
  -f patients_backup.dump
```

### Recovery

```bash
# Restore full database
pg_restore -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup_20240115.dump

# Restore specific table
pg_restore -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -t patients \
  patients_backup.dump
```

### Disaster Recovery

1. **Identify Issue**: Check Supabase dashboard for errors
2. **Stop Application**: Prevent further data corruption
3. **Assess Damage**: Determine what data is affected
4. **Restore Backup**: Use most recent clean backup
5. **Verify Data**: Check data integrity
6. **Resume Application**: Bring system back online
7. **Post-Mortem**: Document incident and prevention

---

## Performance Optimization

### Query Optimization

**Use EXPLAIN ANALYZE:**

```sql
EXPLAIN ANALYZE
SELECT p.*, u.name, u.email
FROM patients p
JOIN users u ON p.user_id = u.id
WHERE p.doctor_id = 'doctor-uuid';
```

**Optimize Joins:**

```sql
-- Bad: Multiple queries (N+1 problem)
SELECT * FROM prescriptions WHERE patient_id = 'uuid';
-- Then for each prescription:
SELECT * FROM medications WHERE prescription_id = 'uuid';

-- Good: Single query with join
SELECT 
  p.*,
  json_agg(m.*) as medications
FROM prescriptions p
LEFT JOIN medications m ON m.prescription_id = p.id
WHERE p.patient_id = 'uuid'
GROUP BY p.id;
```

### Connection Pooling

Supabase provides connection pooling automatically:
- **Transaction mode**: For short-lived connections
- **Session mode**: For long-lived connections

Configure in application:

```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
  },
  global: {
    headers: { 'x-application-name': 'serenitas' },
  },
});
```

### Monitoring

Monitor database performance:

```sql
-- Active queries
SELECT 
  pid,
  now() - query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index hit rate (should be > 99%)
SELECT 
  sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100 AS index_hit_rate
FROM pg_statio_user_indexes;
```

---

## Security

### Encryption

- **At Rest**: Supabase encrypts all data at rest using AES-256
- **In Transit**: All connections use TLS 1.2+
- **Sensitive Fields**: Additional application-level encryption for sensitive health data

### Access Control

- **RLS Policies**: Enforce data access at database level
- **Service Role**: Used only by backend, never exposed to client
- **Anon Key**: Limited access for public endpoints
- **User Context**: Set via JWT claims

### Audit Trail

All sensitive data access is logged in `audit_logs` table:

```sql
-- Log data access
INSERT INTO audit_logs (
  user_id,
  action,
  resource_type,
  resource_id,
  ip_address,
  user_agent
) VALUES (
  auth.uid(),
  'SENSITIVE_DATA_ACCESS',
  'Prescription',
  'prescription-uuid',
  '192.168.1.1',
  'Mozilla/5.0...'
);
```

---

## Migrations

### Migration Files

Located in `serenitas_backend/supabase/migrations/`:

1. `01_create_tables.sql` - Create all tables
2. `02_create_indexes.sql` - Create indexes
3. `04_rls_policies.sql` - Set up RLS policies
4. `05_create_storage.sql` - Configure storage buckets

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and paste migration files
```

### Creating New Migrations

```bash
# Create new migration file
supabase migration new add_new_feature

# Edit the generated file
# Then push to database
supabase db push
```

---

## Troubleshooting

### Common Issues

**Issue: RLS Policy Blocking Query**
```sql
-- Check which policies apply
SELECT * FROM pg_policies WHERE tablename = 'patients';

-- Test with policy disabled (development only!)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
-- Run query
-- Re-enable
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
```

**Issue: Slow Queries**
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Issue: Connection Limit Reached**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes';
```

---

## Support

For database issues:
- **Supabase Dashboard**: https://app.supabase.com
- **Supabase Docs**: https://supabase.com/docs
- **Support**: support@supabase.com

---

**Last Updated:** January 2024  
**Database Version:** PostgreSQL 15.1
