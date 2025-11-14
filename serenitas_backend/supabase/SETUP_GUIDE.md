# Supabase Setup Guide - Clínica Serenitas

## Task 1.1: Create Supabase Project

### Steps:

1. **Sign up for Supabase**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub, Google, or email

2. **Create New Project**
   - Click "New Project"
   - Organization: Select or create "Clínica Serenitas"
   - Project Name: `clinica-serenitas`
   - Database Password: Generate a strong password (save it securely!)
   - Region: Choose closest to Brazil (e.g., `South America (São Paulo)` if available, otherwise `US East`)
   - Pricing Plan: Start with Free tier for development

3. **Note Your Credentials**
   After project creation, go to Settings > API:
   
   ```
   Project URL: https://[your-project-ref].supabase.co
   anon/public key: [your-anon-key]
   service_role key: [your-service-role-key] (keep secret!)
   ```

4. **Save to .env file**
   Create/update `serenitas_backend/.env`:
   ```
   SUPABASE_URL=https://[your-project-ref].supabase.co
   SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_KEY=[your-service-role-key]
   ```

## Task 1.2: Execute SQL Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor (left sidebar)
3. Execute the migration scripts in order:
   - `01_create_tables.sql`
   - `02_create_indexes.sql`

## Task 1.3: Implement RLS Policies

1. In SQL Editor, execute:
   - `03_enable_rls.sql`
   - `04_rls_policies.sql`

2. Test RLS policies with different user contexts

## Task 1.4: Set up Storage Buckets

1. Navigate to Storage (left sidebar)
2. Click "Create a new bucket"
3. Bucket name: `exams`
4. Public bucket: **No** (private)
5. File size limit: 5242880 (5MB in bytes)
6. Allowed MIME types: `application/pdf,image/jpeg,image/png`

Or execute `05_create_storage.sql` in SQL Editor

## Task 1.5: Run Migration Script

After completing tasks 1.1-1.4:

```bash
cd serenitas_backend
node supabase/migration/migrate.js
```

## Verification

Run the verification script:
```bash
node supabase/migration/verify.js
```

## Troubleshooting

### Connection Issues
- Verify SUPABASE_URL and keys in .env
- Check if project is active in Supabase dashboard
- Ensure IP is not blocked (Supabase allows all IPs by default)

### RLS Policy Issues
- Test with service_role key (bypasses RLS) vs anon key
- Check policy conditions match your auth.uid()
- Review Supabase logs in Dashboard > Logs

### Storage Issues
- Verify bucket exists and is private
- Check bucket policies allow authenticated uploads
- Ensure file size and MIME type restrictions are set
