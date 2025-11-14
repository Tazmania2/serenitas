-- Clínica Serenitas Database Schema
-- Migration 05: Create Storage Buckets and Policies
-- Requirements: 10.1, 10.2, 10.3

-- ============================================================================
-- CREATE STORAGE BUCKET FOR EXAMS
-- ============================================================================

-- Create the exams bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exams',
  'exams',
  false, -- Private bucket
  5242880, -- 5MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR EXAMS BUCKET
-- ============================================================================

-- Patients can upload files to their own folder
CREATE POLICY "Patients can upload own exam files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exams'
  AND auth.user_role() = 'patient'
  AND (storage.foldername(name))[1] = auth.patient_id()::TEXT
);

-- Patients can view their own exam files
CREATE POLICY "Patients can view own exam files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exams'
  AND auth.user_role() = 'patient'
  AND (storage.foldername(name))[1] = auth.patient_id()::TEXT
);

-- Patients can delete their own exam files
CREATE POLICY "Patients can delete own exam files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exams'
  AND auth.user_role() = 'patient'
  AND (storage.foldername(name))[1] = auth.patient_id()::TEXT
);

-- Doctors can view exam files for assigned patients
CREATE POLICY "Doctors can view assigned patient exam files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exams'
  AND auth.is_doctor()
  AND (storage.foldername(name))[1]::UUID IN (
    SELECT id::TEXT FROM patients WHERE doctor_id = auth.doctor_id()
  )
);

-- Admins have full access to exam files
CREATE POLICY "Admins have full access to exam files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'exams'
  AND auth.is_admin()
);

-- ============================================================================
-- NOTES
-- ============================================================================

-- File naming convention: {patient_id}/{timestamp}_{original_filename}
-- Example: 550e8400-e29b-41d4-a716-446655440000/1704067200000_blood_test.pdf
--
-- This structure ensures:
-- 1. Files are organized by patient
-- 2. RLS policies can easily check folder ownership
-- 3. Unique filenames prevent collisions
-- 4. Easy to implement cleanup policies
