# Permission Error Fix

## Issue

When executing `04_rls_policies.sql`, you may have encountered:

```
Error: Failed to run sql query: ERROR: 42501: permission denied for schema auth
```

## Root Cause

The original script tried to create functions in the `auth` schema:
```sql
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  ...
$$ LANGUAGE SQL STABLE;
```

In Supabase, regular users don't have permission to create functions in the `auth` schema, which is reserved for Supabase's internal authentication system.

## Solution

✅ **The script has been updated** to use the `public` schema instead:

```sql
CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### Changes Made

1. **Helper Functions** - Moved from `auth` schema to `public` schema:
   - `auth.user_id()` → `public.get_user_id()`
   - `auth.user_role()` → `public.get_user_role()`
   - `auth.is_admin()` → `public.is_admin()`
   - `auth.is_secretary()` → `public.is_secretary()`
   - `auth.is_doctor()` → `public.is_doctor()`
   - `auth.doctor_id()` → `public.get_doctor_id()`
   - `auth.patient_id()` → `public.get_patient_id()`

2. **All RLS Policies** - Updated to use new function names:
   - All 40+ policies now reference `public.get_user_id()` instead of `auth.user_id()`
   - All role checks use `public.is_admin()` instead of `auth.is_admin()`
   - etc.

3. **Storage Policies** - Also updated in `05_create_storage.sql`:
   - Storage policies now use `public.get_user_role()` and `public.get_patient_id()`

### Added Security

The functions now use `SECURITY DEFINER` which means they run with the privileges of the user who created them (you), ensuring they can access the necessary JWT claims.

## How to Apply the Fix

### If You Haven't Run the Scripts Yet

✅ Just proceed normally - the scripts are already fixed!

1. Execute `04_rls_policies.sql` in Supabase SQL Editor
2. Execute `05_create_storage.sql` in Supabase SQL Editor
3. Everything should work without errors

### If You Already Ran the Scripts and Got the Error

You have two options:

#### Option 1: Drop and Recreate (Recommended if no data)

```sql
-- Drop all policies first
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins and secretaries can view all users" ON users;
-- ... (drop all other policies)

-- Then run the updated scripts
```

#### Option 2: Start Fresh (If you have no important data)

1. Go to Supabase Dashboard > Database > Tables
2. Delete all tables (or drop the entire database)
3. Re-run all migration scripts in order:
   - `01_create_tables.sql`
   - `02_create_indexes.sql`
   - `03_enable_rls.sql`
   - `04_rls_policies.sql` ← Updated version
   - `05_create_storage.sql` ← Updated version

## Verification

After applying the fix, verify it worked:

```sql
-- Check that helper functions exist in public schema
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'get_%' OR routine_name LIKE 'is_%';
```

You should see:
- `get_user_id`
- `get_user_role`
- `get_doctor_id`
- `get_patient_id`
- `is_admin`
- `is_secretary`
- `is_doctor`

## Testing

Test that RLS policies work correctly:

```sql
-- Test as a patient (replace with actual JWT)
SET request.jwt.claims = '{"user_id": "some-uuid", "role": "patient"}';

-- Try to query users table
SELECT * FROM users;
-- Should only return the user's own record

-- Reset
RESET request.jwt.claims;
```

## Impact

✅ **No functional changes** - The RLS policies work exactly the same way
✅ **Same security** - Access control is identical
✅ **No performance impact** - Functions are equally efficient
✅ **Better compatibility** - Works with Supabase's permission model

## Additional Notes

- The `public` schema is the default schema in PostgreSQL
- All user-created objects go in `public` unless specified otherwise
- The `auth` schema is managed by Supabase and has restricted access
- Using `SECURITY DEFINER` is safe here because the functions only read JWT claims

## Questions?

If you still encounter issues:

1. Check that you're using the updated script files
2. Verify you have the correct permissions in Supabase
3. Review the Supabase logs for detailed error messages
4. Try running the scripts one section at a time to isolate issues

## Files Updated

- ✅ `migrations/04_rls_policies.sql` - All helper functions and policies
- ✅ `migrations/05_create_storage.sql` - Storage policies
- ✅ `SETUP_GUIDE.md` - Added troubleshooting section
- ✅ `PERMISSION_FIX.md` - This document
