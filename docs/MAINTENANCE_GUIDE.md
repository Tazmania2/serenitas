# Maintenance Guide - Clínica Serenitas

## Overview

This guide provides procedures for maintaining, updating, and troubleshooting the Clínica Serenitas system.

## Table of Contents

1. [Backup Procedures](#backup-procedures)
2. [Update Procedures](#update-procedures)
3. [Monitoring](#monitoring)
4. [Troubleshooting](#troubleshooting)
5. [Common Issues](#common-issues)
6. [Emergency Procedures](#emergency-procedures)
7. [Maintenance Schedule](#maintenance-schedule)

---

## Backup Procedures

### Automatic Backups

**Supabase Automatic Backups:**
- **Frequency:** Daily
- **Retention:** 7 days
- **Type:** Full database backup
- **Location:** Supabase infrastructure (multiple regions)
- **Point-in-Time Recovery (PITR):** Available for last 7 days

**Verification:**
1. Log into Supabase Dashboard
2. Navigate to Settings > Database
3. Check "Backups" section
4. Verify last backup timestamp

### Manual Backup

#### Database Backup

**Full Database:**
```bash
# Set environment variables
export SUPABASE_DB_HOST="db.project.supabase.co"
export SUPABASE_DB_USER="postgres"
export SUPABASE_DB_NAME="postgres"

# Create backup
pg_dump -h $SUPABASE_DB_HOST \
  -U $SUPABASE_DB_USER \
  -d $SUPABASE_DB_NAME \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).dump
```

**Specific Tables:**
```bash
# Backup critical tables
pg_dump -h $SUPABASE_DB_HOST \
  -U $SUPABASE_DB_USER \
  -d $SUPABASE_DB_NAME \
  -t users -t patients -t doctors \
  -t prescriptions -t exams \
  -F c \
  -f critical_tables_$(date +%Y%m%d).dump
```

**Schema Only:**
```bash
# Backup schema without data
pg_dump -h $SUPABASE_DB_HOST \
  -U $SUPABASE_DB_USER \
  -d $SUPABASE_DB_NAME \
  --schema-only \
  -f schema_$(date +%Y%m%d).sql
```

#### Storage Backup

**Exam Files:**
```bash
# Using Supabase CLI
supabase storage download exams --recursive --output ./backups/exams/

# Or using API
curl -X GET \
  "https://project.supabase.co/storage/v1/object/list/exams" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

#### Application Code Backup

**Git Repository:**
```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Backup before maintenance"
git push origin main

# Create backup branch
git checkout -b backup-$(date +%Y%m%d)
git push origin backup-$(date +%Y%m%d)
```

### Backup Storage

**Recommended Storage Locations:**
1. **Primary:** Supabase automatic backups
2. **Secondary:** External cloud storage (AWS S3, Google Cloud Storage)
3. **Tertiary:** Local encrypted storage (offline)

**Retention Policy:**
- Daily backups: 30 days
- Weekly backups: 3 months
- Monthly backups: 1 year
- Annual backups: 5 years (compliance)

### Backup Verification

**Monthly Verification:**
```bash
# Test restore to staging environment
pg_restore -h staging-db.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  backup_20240115.dump

# Verify data integrity
psql -h staging-db.supabase.co \
  -U postgres \
  -d postgres \
  -c "SELECT COUNT(*) FROM users;"
```


## Update Procedures

### Backend Updates

#### 1. Preparation

**Before updating:**
```bash
# Create backup
npm run backup

# Check current version
git log -1

# Review changes
git diff main origin/main

# Check for breaking changes
cat CHANGELOG.md
```

#### 2. Staging Deployment

**Deploy to staging first:**
```bash
# Switch to staging branch
git checkout staging

# Merge changes
git merge main

# Install dependencies
cd serenitas_backend
npm install

# Run tests
npm test

# Deploy to staging
vercel --prod --scope staging
```

**Verify staging:**
- Test all critical endpoints
- Check database migrations
- Verify authentication
- Test file uploads
- Review logs for errors

#### 3. Production Deployment

**Deploy to production:**
```bash
# Switch to production branch
git checkout production

# Merge from staging
git merge staging

# Tag release
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1

# Deploy
cd serenitas_backend
vercel --prod
```

**Post-deployment verification:**
```bash
# Health check
curl https://api.serenitas.app/health

# Test authentication
curl -X POST https://api.serenitas.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Check logs
vercel logs
```

#### 4. Rollback (if needed)

**Immediate rollback:**
```bash
# Revert to previous deployment
vercel rollback

# Or deploy previous version
git checkout v1.0.0
vercel --prod
```

### Frontend Updates

#### 1. Build and Test

```bash
cd serenitas_app

# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build

# Test build locally
npm run preview
```

#### 2. Deploy to Staging

```bash
# Deploy to Vercel staging
vercel --scope staging

# Or Netlify staging
netlify deploy --dir=dist
```

**Verify staging:**
- Test all user flows
- Check PWA functionality
- Test offline mode
- Verify responsive design
- Check browser compatibility

#### 3. Deploy to Production

```bash
# Deploy to Vercel production
vercel --prod

# Or Netlify production
netlify deploy --prod --dir=dist
```

**Post-deployment:**
- Clear CDN cache
- Test production URL
- Verify PWA installation
- Check analytics

### Database Updates

#### 1. Schema Changes

**Create migration:**
```bash
# Using Supabase CLI
supabase migration new add_new_column

# Edit migration file
# serenitas_backend/supabase/migrations/YYYYMMDDHHMMSS_add_new_column.sql
```

**Example migration:**
```sql
-- Add new column
ALTER TABLE patients
ADD COLUMN insurance_expiry DATE;

-- Create index
CREATE INDEX idx_patients_insurance_expiry
ON patients(insurance_expiry);

-- Update RLS policy if needed
CREATE POLICY "Patients can view own insurance"
ON patients FOR SELECT
USING (user_id = auth.uid());
```

#### 2. Test Migration

**Test on staging:**
```bash
# Apply to staging database
supabase db push --db-url $STAGING_DB_URL

# Verify changes
psql $STAGING_DB_URL -c "\d patients"

# Test application
npm test
```

#### 3. Apply to Production

**Backup first:**
```bash
# Create backup before migration
pg_dump -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f pre_migration_backup.dump
```

**Apply migration:**
```bash
# Apply to production
supabase db push

# Verify
psql $PRODUCTION_DB_URL -c "\d patients"
```

#### 4. Rollback Migration

**If migration fails:**
```sql
-- Rollback script (create before migration)
ALTER TABLE patients DROP COLUMN insurance_expiry;
DROP INDEX idx_patients_insurance_expiry;
DROP POLICY "Patients can view own insurance" ON patients;
```

### Dependency Updates

#### Check for Updates

```bash
# Check outdated packages
npm outdated

# Check security vulnerabilities
npm audit

# Check for major updates
npx npm-check-updates
```

#### Update Dependencies

**Minor/Patch updates:**
```bash
# Update to latest compatible versions
npm update

# Test
npm test

# Commit
git add package.json package-lock.json
git commit -m "Update dependencies"
```

**Major updates:**
```bash
# Update one package at a time
npm install express@latest

# Test thoroughly
npm test

# Check for breaking changes
cat node_modules/express/CHANGELOG.md
```

**Security updates:**
```bash
# Fix vulnerabilities
npm audit fix

# Force fix (may have breaking changes)
npm audit fix --force

# Manual fix
npm install package@version
```


## Monitoring

### System Health Monitoring

#### Health Check Endpoint

**Automated monitoring:**
```bash
# Add to cron (every 5 minutes)
*/5 * * * * curl -f https://api.serenitas.app/health || echo "Health check failed" | mail -s "API Down" admin@clinicaserenitas.com.br
```

**Response format:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "database": "connected",
  "storage": "connected",
  "version": "1.0.0"
}
```

#### Uptime Monitoring

**Recommended tools:**
- UptimeRobot (free tier available)
- Pingdom
- StatusCake
- Better Uptime

**Configuration:**
- Check interval: 5 minutes
- Timeout: 30 seconds
- Alert channels: Email, SMS
- Status page: Public

### Performance Monitoring

#### API Response Times

**Monitor endpoints:**
```bash
# Test response time
time curl https://api.serenitas.app/api/patients

# Detailed timing
curl -w "@curl-format.txt" -o /dev/null -s https://api.serenitas.app/api/patients
```

**curl-format.txt:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

**Performance targets:**
- API response: < 1 second
- Page load: < 2 seconds
- Database query: < 500ms

#### Database Performance

**Monitor queries:**
```sql
-- Slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000 -- queries taking > 1 second
ORDER BY mean_time DESC
LIMIT 20;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as size;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Error Monitoring

#### Application Logs

**View logs:**
```bash
# Vercel logs
vercel logs --follow

# Filter by error
vercel logs | grep ERROR

# Last 100 lines
vercel logs --limit 100
```

**Log analysis:**
```bash
# Count errors by type
grep ERROR logs.txt | cut -d':' -f2 | sort | uniq -c | sort -rn

# Find most common errors
grep ERROR logs.txt | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
```

#### Error Tracking

**Recommended tools:**
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (full observability)

**Integration:**
```javascript
// Sentry setup
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capture errors
app.use(Sentry.Handlers.errorHandler());
```

### Security Monitoring

#### Failed Login Attempts

**Monitor authentication:**
```sql
-- Failed logins in last hour
SELECT 
  user_id,
  ip_address,
  COUNT(*) as attempts
FROM audit_logs
WHERE action = 'FAILED_LOGIN'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

**Alert on suspicious activity:**
- Multiple failed logins from same IP
- Login from unusual location
- Access to sensitive data outside business hours
- Bulk data exports

#### Audit Log Review

**Weekly review:**
```sql
-- Sensitive data access
SELECT 
  user_id,
  action,
  resource_type,
  COUNT(*) as access_count
FROM audit_logs
WHERE action = 'SENSITIVE_DATA_ACCESS'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, action, resource_type
ORDER BY access_count DESC;

-- Administrative actions
SELECT *
FROM audit_logs
WHERE action IN ('DATA_DELETION', 'USER_DELETION', 'ROLE_CHANGE')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Resource Monitoring

#### Database Resources

**Monitor usage:**
```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Cache hit ratio (should be > 99%)
SELECT 
  sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0) * 100 
  AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### Storage Usage

**Monitor storage:**
```bash
# Supabase storage usage
curl -X GET \
  "https://project.supabase.co/rest/v1/storage/buckets" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Check bucket size
curl -X GET \
  "https://project.supabase.co/storage/v1/bucket/exams/size" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

**Storage limits:**
- Free tier: 1GB
- Pro tier: 100GB
- Alert at 80% capacity


## Troubleshooting

### Application Issues

#### API Not Responding

**Diagnosis:**
```bash
# Check if API is up
curl -I https://api.serenitas.app/health

# Check DNS resolution
nslookup api.serenitas.app

# Check SSL certificate
openssl s_client -connect api.serenitas.app:443 -servername api.serenitas.app

# Check deployment status
vercel ls
```

**Solutions:**
1. Check Vercel dashboard for deployment errors
2. Review recent deployments
3. Check environment variables
4. Rollback to previous version if needed

#### Database Connection Issues

**Diagnosis:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
psql $DATABASE_URL -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state != 'idle' 
  ORDER BY duration DESC;
"
```

**Solutions:**
1. Check Supabase dashboard for issues
2. Verify connection string in environment variables
3. Check for connection pool exhaustion
4. Kill long-running queries if needed:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
   ```

#### Authentication Failures

**Diagnosis:**
```bash
# Test login endpoint
curl -X POST https://api.serenitas.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be 32+ characters

# Review auth logs
vercel logs | grep "auth"
```

**Solutions:**
1. Verify JWT_SECRET environment variable
2. Check password hashing (bcrypt cost factor)
3. Verify user exists in database
4. Check for rate limiting blocks

#### File Upload Issues

**Diagnosis:**
```bash
# Test storage access
curl -X GET \
  "https://project.supabase.co/storage/v1/bucket/exams" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Check storage policies
psql $DATABASE_URL -c "
  SELECT * FROM storage.objects 
  WHERE bucket_id = 'exams' 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

**Solutions:**
1. Check Supabase storage bucket configuration
2. Verify storage policies
3. Check file size limits (5MB)
4. Verify MIME type restrictions
5. Check storage quota

### Performance Issues

#### Slow API Responses

**Diagnosis:**
```bash
# Profile endpoint
time curl https://api.serenitas.app/api/patients

# Check database query performance
psql $DATABASE_URL -c "
  SELECT query, calls, mean_time, max_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Check for missing indexes
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1;
"
```

**Solutions:**
1. Add database indexes for frequently queried columns
2. Optimize N+1 queries (use joins)
3. Implement caching for frequently accessed data
4. Use pagination for large result sets
5. Optimize RLS policies

#### High Memory Usage

**Diagnosis:**
```bash
# Check Vercel function memory
vercel logs | grep "Memory"

# Check database memory
psql $DATABASE_URL -c "
  SELECT 
    pg_size_pretty(pg_database_size('postgres')) as db_size,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))) as tables_size
  FROM pg_tables
  WHERE schemaname = 'public';
"
```

**Solutions:**
1. Optimize queries to return less data
2. Implement pagination
3. Clear unused connections
4. Upgrade Vercel plan if needed
5. Optimize database queries

### Data Issues

#### Data Inconsistency

**Diagnosis:**
```sql
-- Check for orphaned records
SELECT p.* FROM patients p
LEFT JOIN users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for missing foreign keys
SELECT p.* FROM prescriptions p
LEFT JOIN patients pat ON p.patient_id = pat.id
WHERE pat.id IS NULL;

-- Check for duplicate records
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Solutions:**
1. Run data integrity checks
2. Fix orphaned records
3. Add missing foreign key constraints
4. Implement database triggers for data validation

#### Missing Data

**Diagnosis:**
```sql
-- Check recent deletions
SELECT * FROM audit_logs
WHERE action = 'DATA_DELETION'
ORDER BY created_at DESC
LIMIT 50;

-- Check for scheduled deletions
SELECT * FROM users
WHERE deletion_scheduled = TRUE;
```

**Solutions:**
1. Restore from backup if accidental deletion
2. Check audit logs for deletion reason
3. Verify RLS policies aren't hiding data
4. Check user permissions

### Security Issues

#### Suspicious Activity

**Diagnosis:**
```sql
-- Check failed login attempts
SELECT 
  ip_address,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'FAILED_LOGIN'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY attempts DESC;

-- Check unusual data access
SELECT 
  user_id,
  action,
  COUNT(*) as access_count
FROM audit_logs
WHERE action = 'SENSITIVE_DATA_ACCESS'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, action
HAVING COUNT(*) > 100
ORDER BY access_count DESC;
```

**Solutions:**
1. Block suspicious IP addresses
2. Disable compromised accounts
3. Force password reset
4. Review and strengthen security policies
5. Contact DPO and follow incident response plan

#### Data Breach

**Immediate actions:**
1. Activate incident response plan (see LGPD_COMPLIANCE.md)
2. Isolate affected systems
3. Preserve evidence
4. Contact DPO
5. Notify ANPD if required
6. Notify affected users


## Common Issues and Solutions

### Issue: Users Can't Log In

**Symptoms:**
- Login returns "Invalid credentials"
- Users report correct password doesn't work

**Diagnosis:**
```bash
# Check if user exists
psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email = 'user@example.com';"

# Check password hash
psql $DATABASE_URL -c "SELECT password_hash FROM users WHERE email = 'user@example.com';"

# Test bcrypt
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.compareSync('password', 'hash'));"
```

**Solutions:**
1. Verify user exists in database
2. Check bcrypt cost factor (should be 12)
3. Reset password if hash is corrupted
4. Check for rate limiting blocks
5. Verify JWT_SECRET is correct

---

### Issue: PWA Not Installing

**Symptoms:**
- Install prompt doesn't appear
- App doesn't work offline

**Diagnosis:**
```bash
# Check manifest
curl https://serenitas.app/manifest.json

# Check service worker
curl https://serenitas.app/sw.js

# Check HTTPS
curl -I https://serenitas.app
```

**Solutions:**
1. Verify manifest.json is accessible
2. Check service worker registration
3. Ensure HTTPS is enabled
4. Clear browser cache
5. Check browser compatibility
6. Verify icons are correct size

---

### Issue: File Upload Fails

**Symptoms:**
- Upload returns error
- File doesn't appear in storage

**Diagnosis:**
```bash
# Check storage bucket
curl -X GET \
  "https://project.supabase.co/storage/v1/bucket/exams" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Check file size
ls -lh uploaded_file.pdf

# Check MIME type
file --mime-type uploaded_file.pdf
```

**Solutions:**
1. Verify file size < 5MB
2. Check MIME type (PDF, JPEG, PNG only)
3. Verify storage bucket exists
4. Check storage policies
5. Verify authentication token
6. Check storage quota

---

### Issue: Slow Page Load

**Symptoms:**
- Pages take > 3 seconds to load
- Users report sluggish performance

**Diagnosis:**
```bash
# Check page load time
curl -w "@curl-format.txt" -o /dev/null -s https://serenitas.app

# Check bundle size
npm run build
ls -lh dist/assets/*.js

# Check API response time
time curl https://api.serenitas.app/api/patients
```

**Solutions:**
1. Optimize bundle size (code splitting)
2. Implement lazy loading
3. Add caching headers
4. Optimize images
5. Use CDN
6. Minimize API calls
7. Add loading states

---

### Issue: Database Connection Pool Exhausted

**Symptoms:**
- "Too many connections" error
- API timeouts

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limit
SHOW max_connections;

-- Check idle connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';
```

**Solutions:**
1. Kill idle connections:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND state_change < now() - interval '10 minutes';
   ```
2. Implement connection pooling
3. Close connections properly in code
4. Upgrade database plan
5. Optimize query performance

---

### Issue: RLS Policy Blocking Query

**Symptoms:**
- Query returns empty results
- "Permission denied" error

**Diagnosis:**
```sql
-- Check which policies apply
SELECT * FROM pg_policies WHERE tablename = 'patients';

-- Test with RLS disabled (development only!)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
-- Run query
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Check user context
SELECT auth.uid();
```

**Solutions:**
1. Verify user has correct role
2. Check RLS policy conditions
3. Verify foreign key relationships
4. Test policy with different users
5. Review policy logic

---

### Issue: Email Notifications Not Sending

**Symptoms:**
- Users don't receive emails
- No email in spam folder

**Diagnosis:**
```bash
# Check email service configuration
echo $SMTP_HOST
echo $SMTP_PORT
echo $SMTP_USER

# Test email sending
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.sendMail({
  from: 'noreply@serenitas.app',
  to: 'test@example.com',
  subject: 'Test',
  text: 'Test email'
}, console.log);
"
```

**Solutions:**
1. Verify SMTP credentials
2. Check email service status
3. Verify sender domain
4. Check spam filters
5. Review email templates
6. Check rate limits

---

### Issue: Audit Logs Growing Too Large

**Symptoms:**
- Database size increasing rapidly
- Slow audit log queries

**Diagnosis:**
```sql
-- Check audit log size
SELECT 
  pg_size_pretty(pg_total_relation_size('audit_logs')) as size,
  count(*) as row_count
FROM audit_logs;

-- Check oldest logs
SELECT MIN(created_at) FROM audit_logs;
```

**Solutions:**
1. Archive old logs (> 5 years)
2. Implement log rotation
3. Add partitioning by date
4. Compress old logs
5. Export to external storage

**Archive script:**
```sql
-- Archive logs older than 5 years
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '5 years';

-- Delete archived logs
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '5 years';

-- Vacuum table
VACUUM FULL audit_logs;
```

---

## Emergency Procedures

### System Down

**Immediate Actions:**
1. Check status page
2. Verify DNS resolution
3. Check hosting provider status
4. Review recent deployments
5. Check error logs

**Communication:**
1. Update status page
2. Notify users via email/SMS
3. Post on social media
4. Provide ETA for resolution

**Recovery:**
1. Identify root cause
2. Rollback if recent deployment
3. Restore from backup if needed
4. Verify system functionality
5. Monitor for recurrence

### Data Loss

**Immediate Actions:**
1. Stop all write operations
2. Identify scope of data loss
3. Check backup availability
4. Preserve current state

**Recovery:**
1. Restore from most recent backup
2. Verify data integrity
3. Reconcile any missing data
4. Test application functionality
5. Resume operations

**Post-Recovery:**
1. Document incident
2. Identify root cause
3. Implement preventive measures
4. Update backup procedures
5. Train staff on prevention

### Security Breach

**Follow incident response plan in LGPD_COMPLIANCE.md**

**Immediate Actions:**
1. Isolate affected systems
2. Preserve evidence
3. Contact DPO
4. Assess scope of breach
5. Contain the breach

**Notification:**
1. ANPD (if required)
2. Affected users
3. Management
4. Legal counsel

---

## Maintenance Schedule

### Daily Tasks

- [ ] Check system health
- [ ] Review error logs
- [ ] Monitor API response times
- [ ] Check backup completion
- [ ] Review failed login attempts

**Automated:**
```bash
# Daily health check script
#!/bin/bash
echo "=== Daily Health Check $(date) ===" >> health_check.log

# API health
curl -f https://api.serenitas.app/health >> health_check.log 2>&1

# Database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('postgres'));" >> health_check.log

# Error count
vercel logs --since 24h | grep ERROR | wc -l >> health_check.log

echo "=== End Health Check ===" >> health_check.log
```

### Weekly Tasks

- [ ] Review audit logs
- [ ] Check database performance
- [ ] Review security alerts
- [ ] Update dependencies (security patches)
- [ ] Test backup restoration
- [ ] Review user feedback
- [ ] Check storage usage

### Monthly Tasks

- [ ] Full system backup
- [ ] Security assessment
- [ ] Performance optimization
- [ ] Update documentation
- [ ] Review access controls
- [ ] Dependency updates
- [ ] Capacity planning
- [ ] User training updates

### Quarterly Tasks

- [ ] LGPD compliance audit
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Performance benchmarking
- [ ] Infrastructure review
- [ ] Policy review
- [ ] Staff training
- [ ] Vendor assessment

### Annual Tasks

- [ ] Full security audit
- [ ] LGPD compliance certification
- [ ] Infrastructure upgrade planning
- [ ] Budget review
- [ ] Disaster recovery plan update
- [ ] Privacy policy review
- [ ] Data retention policy review
- [ ] Business continuity planning

---

## Maintenance Contacts

### Technical Support

**System Administrator:**
- Email: admin@clinicaserenitas.com.br
- Phone: (XX) XXXX-XXXX
- On-call: 24/7

**Development Team:**
- Email: dev@clinicaserenitas.com.br
- Hours: Mon-Fri, 9am-6pm

### Vendors

**Supabase Support:**
- Dashboard: https://app.supabase.com
- Email: support@supabase.com
- Docs: https://supabase.com/docs

**Vercel Support:**
- Dashboard: https://vercel.com/dashboard
- Email: support@vercel.com
- Docs: https://vercel.com/docs

### Emergency Contacts

**DPO (Data Protection Officer):**
- Email: dpo@clinicaserenitas.com.br
- Phone: (XX) XXXX-XXXX

**Legal Counsel:**
- Email: juridico@clinicaserenitas.com.br
- Phone: (XX) XXXX-XXXX

**Management:**
- Email: diretoria@clinicaserenitas.com.br
- Phone: (XX) XXXX-XXXX

---

## Maintenance Tools

### Recommended Tools

**Monitoring:**
- UptimeRobot (uptime monitoring)
- Sentry (error tracking)
- Datadog (full observability)

**Database:**
- pgAdmin (database management)
- DBeaver (SQL client)
- Supabase Dashboard

**Deployment:**
- Vercel CLI
- Supabase CLI
- Git

**Testing:**
- Postman (API testing)
- Playwright (E2E testing)
- Jest (unit testing)

**Security:**
- OWASP ZAP (security testing)
- Snyk (dependency scanning)
- npm audit (vulnerability scanning)

---

## Documentation Updates

This maintenance guide should be reviewed and updated:
- After major incidents
- When procedures change
- Quarterly as part of regular review
- When new tools are adopted

**Last Updated:** January 2024  
**Next Review:** April 2024  
**Owner:** System Administrator
