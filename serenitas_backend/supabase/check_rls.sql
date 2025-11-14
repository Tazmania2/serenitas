-- Quick check to verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'doctors', 'patients', 'appointments',
    'prescriptions', 'medications', 'exams',
    'mood_entries', 'doctor_notes', 'audit_logs', 'consents'
  )
ORDER BY tablename;
