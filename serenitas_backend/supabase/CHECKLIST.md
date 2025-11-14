# Supabase Setup Checklist

Use this checklist to track your progress through the Supabase setup process.

## Phase 1: Account & Project Setup

- [ ] **1.1** Sign up for Supabase account at https://supabase.com
- [ ] **1.2** Create new organization "Clínica Serenitas"
- [ ] **1.3** Create new project named "clinica-serenitas"
- [ ] **1.4** Choose region closest to Brazil (São Paulo if available)
- [ ] **1.5** Save database password securely
- [ ] **1.6** Wait for project to finish provisioning (~2 minutes)

## Phase 2: Get Credentials

- [ ] **2.1** Go to Settings > API in Supabase dashboard
- [ ] **2.2** Copy Project URL
- [ ] **2.3** Copy `anon` public key
- [ ] **2.4** Copy `service_role` secret key (keep secure!)
- [ ] **2.5** Save all credentials in password manager

## Phase 3: Configure Environment

- [ ] **3.1** Navigate to `serenitas_backend` directory
- [ ] **3.2** Copy `env.example` to `.env`
- [ ] **3.3** Add `SUPABASE_URL` to `.env`
- [ ] **3.4** Add `SUPABASE_ANON_KEY` to `.env`
- [ ] **3.5** Add `SUPABASE_SERVICE_KEY` to `.env`
- [ ] **3.6** Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] **3.7** Add `ENCRYPTION_KEY` to `.env`
- [ ] **3.8** Update `DPO_EMAIL` with actual email
- [ ] **3.9** Verify all required variables are set

## Phase 4: Install Dependencies

- [ ] **4.1** Run `npm install` in `serenitas_backend`
- [ ] **4.2** Verify `@supabase/supabase-js` is installed
- [ ] **4.3** Check for any installation errors

## Phase 5: Execute SQL Migrations

Go to Supabase Dashboard > SQL Editor and execute these files **in order**:

- [ ] **5.1** Execute `migrations/01_create_tables.sql`
  - Should see: "Success. No rows returned"
  - Verify: Check Tables in sidebar (should see 11 tables)

- [ ] **5.2** Execute `migrations/02_create_indexes.sql`
  - Should see: "Success. No rows returned"
  - Verify: Indexes created (check table details)

- [ ] **5.3** Execute `migrations/03_enable_rls.sql`
  - Should see: "Success. No rows returned"
  - Verify: RLS enabled on all tables

- [ ] **5.4** Execute `migrations/04_rls_policies.sql`
  - Should see: "Success. No rows returned"
  - Verify: Policies tab shows multiple policies per table

- [ ] **5.5** Execute `migrations/05_create_storage.sql`
  - Should see: "Success. No rows returned"
  - Verify: Storage > Buckets shows "exams" bucket

## Phase 6: Verify Database Setup

- [ ] **6.1** Check Tables tab - should see 11 tables
- [ ] **6.2** Check each table has RLS enabled (shield icon)
- [ ] **6.3** Check Storage > Buckets shows "exams" (private)
- [ ] **6.4** Check SQL Editor history shows all migrations

## Phase 7: Data Migration (Optional)

**Only if you have existing MongoDB data:**

- [ ] **7.1** Verify MongoDB connection in `.env`
- [ ] **7.2** Run `npm run migrate`
- [ ] **7.3** Review migration output for errors
- [ ] **7.4** Check migration statistics
- [ ] **7.5** Verify data in Supabase Table Editor

## Phase 8: Verification

- [ ] **8.1** Run `npm run verify`
- [ ] **8.2** All tests should pass
- [ ] **8.3** Review any warnings
- [ ] **8.4** Check verification summary

## Phase 9: Test RLS Policies

- [ ] **9.1** Create test user (patient role)
- [ ] **9.2** Create test user (doctor role)
- [ ] **9.3** Create test user (secretary role)
- [ ] **9.4** Create test user (admin role)
- [ ] **9.5** Generate JWT tokens with proper claims
- [ ] **9.6** Test patient can only see own data
- [ ] **9.7** Test doctor can only see assigned patients
- [ ] **9.8** Test secretary cannot see medical data
- [ ] **9.9** Test admin can see everything

## Phase 10: Storage Testing

- [ ] **10.1** Test file upload to "exams" bucket
- [ ] **10.2** Verify file size limit (5MB max)
- [ ] **10.3** Verify MIME type restrictions (PDF, JPEG, PNG)
- [ ] **10.4** Test signed URL generation
- [ ] **10.5** Test file download with signed URL
- [ ] **10.6** Test file deletion

## Phase 11: Documentation Review

- [ ] **11.1** Read `README.md` completely
- [ ] **11.2** Review `QUICK_REFERENCE.md`
- [ ] **11.3** Bookmark important Supabase dashboard pages
- [ ] **11.4** Save credentials securely
- [ ] **11.5** Document any custom changes

## Phase 12: Backend Integration

- [ ] **12.1** Update authentication to include JWT claims
- [ ] **12.2** Replace Mongoose with Supabase client
- [ ] **12.3** Update all API endpoints
- [ ] **12.4** Test each endpoint with Postman/Insomnia
- [ ] **12.5** Update file upload/download logic
- [ ] **12.6** Test error handling

## Phase 13: Final Checks

- [ ] **13.1** All API endpoints working
- [ ] **13.2** RLS policies enforced correctly
- [ ] **13.3** File uploads/downloads working
- [ ] **13.4** Audit logs being created
- [ ] **13.5** No sensitive data in logs
- [ ] **13.6** Environment variables secured
- [ ] **13.7** Service role key not exposed

## Phase 14: Production Preparation

- [ ] **14.1** Review security settings
- [ ] **14.2** Set up database backups
- [ ] **14.3** Configure monitoring/alerts
- [ ] **14.4** Document deployment process
- [ ] **14.5** Create rollback plan
- [ ] **14.6** Test disaster recovery

## Troubleshooting

If you encounter issues, check:

- [ ] Environment variables are correct
- [ ] SQL migrations executed in order
- [ ] No syntax errors in SQL files
- [ ] Supabase project is active
- [ ] Network connectivity to Supabase
- [ ] JWT tokens include required claims
- [ ] Service role key used for admin operations

## Resources

- 📖 [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed instructions
- 📖 [README.md](./README.md) - Complete guide
- 📖 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference
- 📖 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What was built
- 🌐 [Supabase Dashboard](https://app.supabase.com)
- 🌐 [Supabase Docs](https://supabase.com/docs)

## Completion

When all checkboxes are checked:

✅ **Supabase setup is complete!**

You can now proceed to **Task 2: Backend Core Infrastructure**

---

**Notes:**
- Keep this checklist updated as you progress
- Mark items complete only after verification
- Document any issues or deviations
- Save credentials securely
- Never commit `.env` file to git
