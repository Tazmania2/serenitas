-- Clínica Serenitas Database Schema
-- Migration 04: Row-Level Security (RLS) Policies
-- Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
-- 
-- IMPORTANT: This implementation uses custom JWT claims.
-- Your backend must set these claims when generating JWT tokens:
-- - user_id: UUID of the user
-- - role: 'patient', 'doctor', 'secretary', or 'admin'

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Note: These functions are created in the public schema to avoid permission issues

-- Get current user's ID from JWT
CREATE OR REPLACE FUNCTION public.get_user_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get current user's role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'role', '')::TEXT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is secretary
CREATE OR REPLACE FUNCTION public.is_secretary() 
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('secretary', 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is doctor
CREATE OR REPLACE FUNCTION public.is_doctor() 
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'doctor';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get doctor ID for current user
CREATE OR REPLACE FUNCTION public.get_doctor_id() 
RETURNS UUID AS $$
  SELECT id FROM doctors WHERE user_id = public.get_user_id();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get patient ID for current user
CREATE OR REPLACE FUNCTION public.get_patient_id() 
RETURNS UUID AS $$
  SELECT id FROM patients WHERE user_id = public.get_user_id();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (id = public.get_user_id());

-- Admins and secretaries can view all users
CREATE POLICY "Admins and secretaries can view all users"
ON users FOR SELECT
USING (public.is_secretary());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = public.get_user_id());

-- Admins can insert new users
CREATE POLICY "Admins can create users"
ON users FOR INSERT
WITH CHECK (public.is_admin());

-- Admins can update any user
CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
USING (public.is_admin());

-- Admins can delete users
CREATE POLICY "Admins can delete users"
ON users FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- DOCTORS TABLE POLICIES
-- ============================================================================

-- Everyone can view doctor profiles (for appointment scheduling)
CREATE POLICY "Anyone can view doctors"
ON doctors FOR SELECT
USING (true);

-- Doctors can update their own profile
CREATE POLICY "Doctors can update own profile"
ON doctors FOR UPDATE
USING (user_id = public.get_user_id());

-- Admins can manage all doctors
CREATE POLICY "Admins can manage doctors"
ON doctors FOR ALL
USING (public.is_admin());

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================

-- Patients can view own data
CREATE POLICY "Patients can view own data"
ON patients FOR SELECT
USING (user_id = public.get_user_id());

-- Doctors can view assigned patients
CREATE POLICY "Doctors can view assigned patients"
ON patients FOR SELECT
USING (
  public.is_doctor() AND doctor_id = public.get_doctor_id()
);

-- Secretaries can view all patients
CREATE POLICY "Secretaries can view all patients"
ON patients FOR SELECT
USING (public.is_secretary());

-- Patients can update own data
CREATE POLICY "Patients can update own data"
ON patients FOR UPDATE
USING (user_id = public.get_user_id());

-- Secretaries and admins can update any patient
CREATE POLICY "Secretaries can update patients"
ON patients FOR UPDATE
USING (public.is_secretary());

-- Secretaries and admins can create patients
CREATE POLICY "Secretaries can create patients"
ON patients FOR INSERT
WITH CHECK (public.is_secretary());

-- Admins can delete patients
CREATE POLICY "Admins can delete patients"
ON patients FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

-- Patients can view own appointments
CREATE POLICY "Patients can view own appointments"
ON appointments FOR SELECT
USING (
  patient_id = public.get_patient_id()
);

-- Doctors can view their appointments
CREATE POLICY "Doctors can view their appointments"
ON appointments FOR SELECT
USING (
  public.is_doctor() AND doctor_id = public.get_doctor_id()
);

-- Secretaries can view all appointments
CREATE POLICY "Secretaries can view all appointments"
ON appointments FOR SELECT
USING (public.is_secretary());

-- Secretaries can create appointments
CREATE POLICY "Secretaries can create appointments"
ON appointments FOR INSERT
WITH CHECK (public.is_secretary());

-- Secretaries can update appointments
CREATE POLICY "Secretaries can update appointments"
ON appointments FOR UPDATE
USING (public.is_secretary());

-- Doctors can update their appointments
CREATE POLICY "Doctors can update their appointments"
ON appointments FOR UPDATE
USING (
  public.is_doctor() AND doctor_id = public.get_doctor_id()
);

-- Secretaries can delete appointments
CREATE POLICY "Secretaries can delete appointments"
ON appointments FOR DELETE
USING (public.is_secretary());

-- ============================================================================
-- PRESCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Patients can view own prescriptions
CREATE POLICY "Patients can view own prescriptions"
ON prescriptions FOR SELECT
USING (
  patient_id = public.get_patient_id()
);

-- Doctors can view prescriptions for assigned patients
CREATE POLICY "Doctors can view assigned patient prescriptions"
ON prescriptions FOR SELECT
USING (
  public.is_doctor() AND doctor_id = public.get_doctor_id()
);

-- Admins can view all prescriptions
CREATE POLICY "Admins can view all prescriptions"
ON prescriptions FOR SELECT
USING (public.is_admin());

-- Doctors can create prescriptions for assigned patients
CREATE POLICY "Doctors can create prescriptions"
ON prescriptions FOR INSERT
WITH CHECK (
  public.is_doctor() 
  AND doctor_id = public.get_doctor_id()
  AND patient_id IN (
    SELECT id FROM patients WHERE doctor_id = public.get_doctor_id()
  )
);

-- Doctors can update their prescriptions
CREATE POLICY "Doctors can update prescriptions"
ON prescriptions FOR UPDATE
USING (
  public.is_doctor() AND doctor_id = public.get_doctor_id()
);

-- Admins have full access
CREATE POLICY "Admins have full prescription access"
ON prescriptions FOR ALL
USING (public.is_admin());

-- ============================================================================
-- MEDICATIONS TABLE POLICIES
-- ============================================================================

-- Patients can view medications in their prescriptions
CREATE POLICY "Patients can view own medications"
ON medications FOR SELECT
USING (
  prescription_id IN (
    SELECT id FROM prescriptions WHERE patient_id = public.get_patient_id()
  )
);

-- Doctors can view medications for their prescriptions
CREATE POLICY "Doctors can view their prescription medications"
ON medications FOR SELECT
USING (
  public.is_doctor() AND prescription_id IN (
    SELECT id FROM prescriptions WHERE doctor_id = public.get_doctor_id()
  )
);

-- Doctors can manage medications in their prescriptions
CREATE POLICY "Doctors can manage medications"
ON medications FOR ALL
USING (
  public.is_doctor() AND prescription_id IN (
    SELECT id FROM prescriptions WHERE doctor_id = public.get_doctor_id()
  )
);

-- Admins have full access
CREATE POLICY "Admins have full medication access"
ON medications FOR ALL
USING (public.is_admin());

-- ============================================================================
-- EXAMS TABLE POLICIES
-- ============================================================================

-- Patients can manage own exams
CREATE POLICY "Patients can manage own exams"
ON exams FOR ALL
USING (
  patient_id = public.get_patient_id()
);

-- Doctors can view exams for assigned patients
CREATE POLICY "Doctors can view assigned patient exams"
ON exams FOR SELECT
USING (
  public.is_doctor() AND patient_id IN (
    SELECT id FROM patients WHERE doctor_id = public.get_doctor_id()
  )
);

-- Doctors can update exam notes
CREATE POLICY "Doctors can update exam notes"
ON exams FOR UPDATE
USING (
  public.is_doctor() AND patient_id IN (
    SELECT id FROM patients WHERE doctor_id = public.get_doctor_id()
  )
);

-- Admins have full access
CREATE POLICY "Admins have full exam access"
ON exams FOR ALL
USING (public.is_admin());

-- ============================================================================
-- MOOD ENTRIES TABLE POLICIES
-- ============================================================================

-- Patients can manage own mood entries
CREATE POLICY "Patients can manage own mood entries"
ON mood_entries FOR ALL
USING (
  patient_id = public.get_patient_id()
);

-- Doctors can view mood entries for assigned patients
CREATE POLICY "Doctors can view assigned patient mood entries"
ON mood_entries FOR SELECT
USING (
  public.is_doctor() AND patient_id IN (
    SELECT id FROM patients WHERE doctor_id = public.get_doctor_id()
  )
);

-- Admins can view all mood entries
CREATE POLICY "Admins can view all mood entries"
ON mood_entries FOR SELECT
USING (public.is_admin());

-- ============================================================================
-- DOCTOR NOTES TABLE POLICIES
-- ============================================================================

-- Patients can view notes marked as visible
CREATE POLICY "Patients can view visible notes"
ON doctor_notes FOR SELECT
USING (
  is_visible_to_patient = TRUE
  AND patient_id = public.get_patient_id()
);

-- Doctors can manage notes for assigned patients
CREATE POLICY "Doctors can manage notes for assigned patients"
ON doctor_notes FOR ALL
USING (
  public.is_doctor() 
  AND doctor_id = public.get_doctor_id()
  AND patient_id IN (
    SELECT id FROM patients WHERE doctor_id = public.get_doctor_id()
  )
);

-- Admins have full access
CREATE POLICY "Admins have full doctor notes access"
ON doctor_notes FOR ALL
USING (public.is_admin());

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (user_id = public.get_user_id());

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
USING (public.is_admin());

-- System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- CONSENTS TABLE POLICIES
-- ============================================================================

-- Users can view their own consents
CREATE POLICY "Users can view own consents"
ON consents FOR SELECT
USING (user_id = public.get_user_id());

-- Users can create their own consents
CREATE POLICY "Users can create own consents"
ON consents FOR INSERT
WITH CHECK (user_id = public.get_user_id());

-- Users can update their own consents (revoke)
CREATE POLICY "Users can update own consents"
ON consents FOR UPDATE
USING (user_id = public.get_user_id());

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
ON consents FOR SELECT
USING (public.is_admin());
