# Supabase Migration Guide

This directory contains all files needed to migrate from MongoDB to Supabase and set up the new database infrastructure.

## Directory Structure

```
supabase/
├── README.md                    # This file
├── SETUP_GUIDE.md              # Step-by-step setup instructions
├── migrations/                  # SQL migration scripts
│   ├── 01_create_tables.sql    # Create all database tables
│   ├── 02_create_indexes.sql   # Create performance indexes
│   ├── 03_enable_rls.sql       # Enable Row-Level Security
│   ├── 04_rls_policies.sql     # RLS policies for data access control
│   └── 05_create_storage.sql   # Storage buckets and policies
└── migration/                   # Data migration scripts
    ├── migrate.js              # MongoDB to Supabase migration
    └── verify.js               # Verification script
```

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- MongoDB instance with existing data (optional)
- Supabase account (free tier is fine)

### 2. Create Supabase Project

Follow the instructions in `SETUP_GUIDE.md` section "Task 1.1"

### 3. Install Dependencies

```bash
cd serenitas_backend
npm install
```

This will install `@supabase/supabase-js` and other required packages.

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp env.example .env
```

Edit `.env` and add:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 5. Execute SQL Migrations

In Supabase Dashboard > SQL Editor, execute these files in order:

1. `migrations/01_create_tables.sql` - Creates all tables
2. `migrations/02_create_indexes.sql` - Creates indexes
3. `migrations/03_enable_rls.sql` - Enables RLS
4. `migrations/04_rls_policies.sql` - Creates RLS policies
5. `migrations/05_create_storage.sql` - Creates storage bucket

### 6. Migrate Data (Optional)

If you have existing MongoDB data:

```bash
npm run migrate
```

This will:
- Connect to MongoDB
- Export all data
- Transform to PostgreSQL format
- Import to Supabase
- Maintain relationships

### 7. Verify Migration

```bash
npm run verify
```

This checks:
- All tables exist
- Data integrity
- Foreign key relationships
- RLS is enabled
- Storage bucket is configured

## Important Notes

### Row-Level Security (RLS)

The RLS policies use custom JWT claims. Your backend must include these claims when generating JWT tokens:

```javascript
const token = jwt.sign(
  {
    user_id: user.id,  // UUID from Supabase users table
    role: user.role    // 'patient', 'doctor', 'secretary', or 'admin'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

### Service Role Key

The `SUPABASE_SERVICE_KEY` bypasses RLS and should:
- Only be used server-side
- Never be exposed to clients
- Be used for admin operations and migrations

### Anon Key

The `SUPABASE_ANON_KEY` respects RLS and should:
- Be used for client-side operations
- Be safe to expose in frontend code
- Require valid JWT for authenticated operations

## Testing RLS Policies

After migration, test RLS policies manually:

1. Create test users with different roles
2. Generate JWT tokens with appropriate claims
3. Test data access with each role:
   - Patient should only see own data
   - Doctor should only see assigned patients
   - Secretary should see all patients (no medical data)
   - Admin should see everything

## Troubleshooting

### Migration Fails

- Check MongoDB connection string
- Verify Supabase credentials
- Ensure tables are created before migration
- Check logs for specific errors

### RLS Blocks All Access

- Verify JWT includes `user_id` and `role` claims
- Check policy conditions match your JWT structure
- Use service_role key for debugging (bypasses RLS)

### Storage Upload Fails

- Verify bucket exists and is private
- Check file size limits (5MB max)
- Ensure MIME type is allowed (PDF, JPEG, PNG)
- Verify storage policies are created

## Next Steps

After successful migration:

1. Update backend code to use Supabase client
2. Test all API endpoints
3. Update authentication to include JWT claims
4. Test RLS policies with different user roles
5. Deploy to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [LGPD Compliance](../../.kiro/steering/compliance-lgpd.md)

## Support

For issues or questions:
- Check `SETUP_GUIDE.md` for detailed instructions
- Review Supabase logs in Dashboard > Logs
- Check migration script output for errors
- Verify environment variables are correct
