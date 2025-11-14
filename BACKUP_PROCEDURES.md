# Backup Procedures

Comprehensive backup and disaster recovery procedures for Clínica Serenitas.

## Overview

Regular backups are critical for:
- **LGPD Compliance:** Data protection requirements
- **Business Continuity:** Minimize downtime
- **Disaster Recovery:** Recover from failures
- **Data Integrity:** Prevent data loss

---

## Backup Strategy

### Backup Types

1. **Automated Daily Backups** (Supabase)
   - Frequency: Daily at 2:00 AM UTC
   - Retention: 7 days (free tier) or 30 days (paid)
   - Scope: Full database

2. **Weekly Full Backups**
   - Frequency: Every Sunday at 3:00 AM UTC
   - Retention: 4 weeks
   - Scope: Database + Files

3. **Monthly Archives**
   - Frequency: First day of month
   - Retention: 12 months
   - Scope: Complete system snapshot

4. **Pre-Deployment Backups**
   - Frequency: Before each production deployment
   - Retention: Until next successful deployment
   - Scope: Database + Configuration

---

## Database Backups

### Supabase Automatic Backups

Supabase automatically backs up your database.

#### View Backups

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to "Database" → "Backups"
4. View available backups

#### Backup Schedule

- **Free Tier:** Daily backups, 7-day retention
- **Pro Tier:** Daily backups, 30-day retention
- **Enterprise:** Custom schedule and retention

### Manual Database Backup

Create manual backup before major changes:

```bash
# Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/database"

# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to secure storage
aws s3 cp backup_*.sql.gz s3://serenitas-backups/database/
```

### Automated Backup Script

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups/database"
RETENTION_DAYS=30
S3_BUCKET="s3://serenitas-backups/database"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
BACKUP_FILE="serenitas_db_$(date +%Y%m%d_%H%M%S).sql"

# Create backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" "$S3_BUCKET/"

# Remove old local backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
if [ $? -eq 0 ]; then
  echo "✓ Backup completed successfully"
else
  echo "✗ Backup failed"
  exit 1
fi
```

### Schedule Automated Backups

#### Using Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1

# Add weekly full backup on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/backup-full.sh >> /var/log/backup.log 2>&1
```

#### Using GitHub Actions

Create `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    # Daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client

      - name: Create backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
          gzip backup_$(date +%Y%m%d).sql

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp backup_*.sql.gz s3://serenitas-backups/database/
```

---

## File Storage Backups

### Supabase Storage

Backup files stored in Supabase Storage buckets.

#### Manual Backup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Download all files from bucket
supabase storage download exams --recursive --output ./backups/storage/exams/

# Compress
tar -czf storage_backup_$(date +%Y%m%d).tar.gz ./backups/storage/

# Upload to S3
aws s3 cp storage_backup_*.tar.gz s3://serenitas-backups/storage/
```

#### Automated Storage Backup Script

Create `scripts/backup-storage.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/storage"
BUCKETS=("exams" "prescriptions")
S3_BUCKET="s3://serenitas-backups/storage"

mkdir -p $BACKUP_DIR

for bucket in "${BUCKETS[@]}"; do
  echo "Backing up bucket: $bucket"
  
  # Download files
  supabase storage download $bucket --recursive --output "$BACKUP_DIR/$bucket/"
  
  # Compress
  tar -czf "$BACKUP_DIR/${bucket}_$(date +%Y%m%d).tar.gz" "$BACKUP_DIR/$bucket/"
  
  # Upload to S3
  aws s3 cp "$BACKUP_DIR/${bucket}_$(date +%Y%m%d).tar.gz" "$S3_BUCKET/"
  
  # Clean up
  rm -rf "$BACKUP_DIR/$bucket/"
done

echo "✓ Storage backup completed"
```

---

## Configuration Backups

### Environment Variables

Backup environment variables (without sensitive values):

```bash
# Create backup of variable names
cat > env_backup_$(date +%Y%m%d).txt << EOF
# Backend Environment Variables
NODE_ENV=production
PORT=5000
SUPABASE_URL=[REDACTED]
SUPABASE_ANON_KEY=[REDACTED]
SUPABASE_SERVICE_KEY=[REDACTED]
JWT_SECRET=[REDACTED]
ENCRYPTION_KEY=[REDACTED]
DPO_EMAIL=dpo@clinicaserenitas.com.br
ALLOWED_ORIGINS=https://serenitas.app
LOG_LEVEL=info
EOF
```

### Code Repository

Ensure code is backed up:

```bash
# Push to GitHub
git push origin main

# Create release tag
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0

# Backup to secondary remote (optional)
git remote add backup https://gitlab.com/serenitas/backup.git
git push backup main
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

Target time to restore service:
- **Critical:** 1 hour
- **High:** 4 hours
- **Medium:** 24 hours
- **Low:** 72 hours

### Recovery Point Objective (RPO)

Maximum acceptable data loss:
- **Database:** 24 hours (daily backups)
- **Files:** 24 hours (daily backups)
- **Configuration:** 0 (version controlled)

### Disaster Scenarios

#### Scenario 1: Database Corruption

**Recovery Steps:**

1. **Assess Damage:**
   ```bash
   # Check database status
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **Stop Application:**
   ```bash
   # Pause deployments
   vercel --pause
   ```

3. **Restore from Backup:**
   - Go to Supabase Dashboard
   - Database → Backups
   - Select most recent backup
   - Click "Restore"
   - Wait for completion

4. **Verify Data:**
   ```bash
   # Check critical tables
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM patients;"
   ```

5. **Resume Application:**
   ```bash
   # Resume deployments
   vercel --resume
   ```

6. **Monitor:**
   - Check error rates
   - Verify functionality
   - Monitor user reports

**Estimated Time:** 30-60 minutes

#### Scenario 2: Complete Data Loss

**Recovery Steps:**

1. **Create New Supabase Project:**
   - Go to Supabase Dashboard
   - Create new project
   - Note new credentials

2. **Restore Database:**
   ```bash
   # Download latest backup from S3
   aws s3 cp s3://serenitas-backups/database/latest.sql.gz ./
   
   # Decompress
   gunzip latest.sql.gz
   
   # Restore to new database
   psql $NEW_DATABASE_URL < latest.sql
   ```

3. **Restore Storage:**
   ```bash
   # Download storage backup
   aws s3 cp s3://serenitas-backups/storage/latest.tar.gz ./
   
   # Extract
   tar -xzf latest.tar.gz
   
   # Upload to new Supabase Storage
   supabase storage upload exams ./backups/exams/ --recursive
   ```

4. **Update Configuration:**
   - Update environment variables with new credentials
   - Redeploy applications

5. **Verify and Test:**
   - Run smoke tests
   - Verify data integrity
   - Test critical functionality

**Estimated Time:** 2-4 hours

#### Scenario 3: Hosting Provider Outage

**Recovery Steps:**

1. **Deploy to Alternative Platform:**
   ```bash
   # Deploy backend to Railway
   railway init
   railway up
   
   # Deploy frontend to Netlify
   netlify deploy --prod
   ```

2. **Update DNS:**
   - Point domain to new deployments
   - Wait for DNS propagation

3. **Verify:**
   - Test application
   - Monitor performance

**Estimated Time:** 1-2 hours

---

## Backup Verification

### Monthly Backup Test

Test backup restoration monthly:

1. **Create Test Environment:**
   - Spin up test Supabase project
   - Deploy test applications

2. **Restore Backup:**
   - Restore latest database backup
   - Restore latest storage backup

3. **Verify Data:**
   - Check record counts
   - Verify data integrity
   - Test application functionality

4. **Document Results:**
   - Record restoration time
   - Note any issues
   - Update procedures

### Backup Integrity Check

```bash
#!/bin/bash

# Check database backup
echo "Checking database backup..."
gunzip -t backup_latest.sql.gz
if [ $? -eq 0 ]; then
  echo "✓ Database backup is valid"
else
  echo "✗ Database backup is corrupted"
fi

# Check storage backup
echo "Checking storage backup..."
tar -tzf storage_latest.tar.gz > /dev/null
if [ $? -eq 0 ]; then
  echo "✓ Storage backup is valid"
else
  echo "✗ Storage backup is corrupted"
fi
```

---

## Backup Monitoring

### Backup Alerts

Set up alerts for:
- Backup failures
- Missing backups
- Backup size anomalies
- Storage quota warnings

### Backup Dashboard

Monitor backup status:
- Last backup time
- Backup size
- Success/failure rate
- Storage usage

---

## LGPD Compliance

### Data Retention

Per LGPD and CFM requirements:

- **Medical Records:** 20 years minimum
- **Audit Logs:** 5 years minimum
- **User Data:** 2 years after account deletion
- **Backups:** Follow same retention as source data

### Backup Security

- **Encryption:** All backups encrypted at rest
- **Access Control:** Limited to authorized personnel
- **Audit Trail:** Log all backup access
- **Secure Storage:** Use encrypted cloud storage

---

## Backup Checklist

### Daily
- [ ] Verify automated database backup completed
- [ ] Check backup logs for errors
- [ ] Monitor backup storage usage

### Weekly
- [ ] Verify full backup completed
- [ ] Test backup integrity
- [ ] Review backup retention

### Monthly
- [ ] Test backup restoration
- [ ] Archive monthly backup
- [ ] Review and update procedures
- [ ] Audit backup access logs

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Review RTO/RPO targets
- [ ] Update disaster recovery plan
- [ ] Train team on procedures

---

## Support

For backup issues:
- **Email:** devops@clinicaserenitas.com.br
- **Slack:** #infrastructure
- **On-Call:** Check PagerDuty

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
