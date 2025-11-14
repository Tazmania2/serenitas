# Supabase Quick Reference

## Essential Commands

```bash
# Install dependencies
npm install

# Run migration from MongoDB to Supabase
npm run migrate

# Verify migration
npm run verify
```

## Environment Variables

```bash
# Required for Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Required for migration
MONGODB_URI=mongodb://...

# Required for JWT
JWT_SECRET=your-secret-key

# Required for LGPD
DPO_EMAIL=dpo@clinicaserenitas.com.br
ENCRYPTION_KEY=your-hex-key
```

## SQL Migration Order

Execute in Supabase SQL Editor:

1. ✅ `01_create_tables.sql` - Tables
2. ✅ `02_create_indexes.sql` - Indexes
3. ✅ `03_enable_rls.sql` - Enable RLS
4. ✅ `04_rls_policies.sql` - RLS Policies
5. ✅ `05_create_storage.sql` - Storage

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | All user accounts (patient, doctor, secretary, admin) |
| `doctors` | Doctor profiles and credentials |
| `patients` | Patient profiles and medical info |
| `appointments` | Appointment scheduling |
| `prescriptions` | Medical prescriptions |
| `medications` | Medications within prescriptions |
| `exams` | Medical exam records |
| `mood_entries` | Patient mood tracking |
| `doctor_notes` | Clinical notes |
| `audit_logs` | LGPD compliance audit trail |
| `consents` | LGPD consent management |

## RLS Policies Summary

### Patient Role
- ✅ View own data only
- ✅ Update own profile
- ✅ Upload own exam files
- ✅ Create mood entries

### Doctor Role
- ✅ View assigned patients only
- ✅ Create prescriptions for assigned patients
- ✅ Write clinical notes
- ✅ View patient exams and mood entries

### Secretary Role
- ✅ View all patients (no medical data)
- ✅ Manage appointments
- ✅ Register new patients
- ❌ Cannot access medical records

### Admin Role
- ✅ Full access to all data
- ✅ User management
- ✅ System configuration

## Storage Buckets

### exams
- **Private**: Yes
- **Max Size**: 5MB
- **Allowed Types**: PDF, JPEG, PNG
- **Structure**: `{patient_id}/{timestamp}_{filename}`

## JWT Claims Required

```javascript
{
  user_id: "uuid-from-supabase",
  role: "patient" | "doctor" | "secretary" | "admin"
}
```

## Common Queries

### Get user with role-specific data
```javascript
const { data, error } = await supabase
  .from('users')
  .select(`
    *,
    patient:patients(*),
    doctor:doctors(*)
  `)
  .eq('id', userId)
  .single();
```

### Get prescriptions with medications
```javascript
const { data, error } = await supabase
  .from('prescriptions')
  .select(`
    *,
    medications(*),
    patient:patients(user:users(name)),
    doctor:doctors(user:users(name))
  `)
  .eq('patient_id', patientId);
```

### Upload exam file
```javascript
const fileName = `${patientId}/${Date.now()}_${file.name}`;
const { data, error } = await supabase.storage
  .from('exams')
  .upload(fileName, file);
```

### Get signed URL for file
```javascript
const { data, error } = await supabase.storage
  .from('exams')
  .createSignedUrl(fileName, 3600); // 1 hour
```

## Troubleshooting

### "JWT expired" error
- Check JWT_EXPIRES_IN setting
- Verify token generation includes expiration
- Implement token refresh logic

### "Row level security policy violation"
- Verify JWT includes user_id and role claims
- Check policy conditions in 04_rls_policies.sql
- Use service_role key for debugging

### "File upload failed"
- Check file size (max 5MB)
- Verify MIME type (PDF, JPEG, PNG only)
- Ensure bucket exists and is private
- Check storage policies

### Migration fails
- Verify MongoDB connection
- Check Supabase credentials
- Ensure tables created before migration
- Review error logs for specific issues

## LGPD Compliance Checklist

- ✅ Explicit consent mechanism
- ✅ Data export functionality
- ✅ Account deletion (30-day grace)
- ✅ Audit logging
- ✅ Encryption at rest
- ✅ RLS for data access control
- ✅ DPO contact information

## Performance Tips

1. Use indexes (already created in 02_create_indexes.sql)
2. Select only needed columns
3. Use pagination for large datasets
4. Cache frequently accessed data
5. Use connection pooling (Supabase handles this)

## Security Best Practices

1. Never expose service_role key to clients
2. Always use RLS policies
3. Validate all inputs
4. Use prepared statements (Supabase does this)
5. Implement rate limiting
6. Log all sensitive data access
7. Encrypt sensitive fields

## Next Steps After Setup

1. ✅ Create Supabase project
2. ✅ Execute SQL migrations
3. ✅ Run data migration (if needed)
4. ✅ Verify migration
5. ⏭️ Update backend to use Supabase client
6. ⏭️ Test RLS policies
7. ⏭️ Update authentication flow
8. ⏭️ Test all API endpoints
9. ⏭️ Deploy to production

## Useful Links

- [Supabase Dashboard](https://app.supabase.com)
- [SQL Editor](https://app.supabase.com/project/_/sql)
- [Storage](https://app.supabase.com/project/_/storage)
- [Logs](https://app.supabase.com/project/_/logs)
- [API Docs](https://app.supabase.com/project/_/api)
