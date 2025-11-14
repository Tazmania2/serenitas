# Rollback Procedures

Emergency procedures for rolling back deployments when issues occur in production.

## When to Rollback

Rollback immediately if:
- Critical functionality is broken
- Security vulnerability is introduced
- Data corruption is occurring
- Application is completely down
- Performance degradation > 50%
- LGPD compliance is compromised

## Rollback Decision Matrix

| Severity | Impact | Action | Timeline |
|----------|--------|--------|----------|
| **Critical** | System down, data loss | Immediate rollback | < 5 minutes |
| **High** | Major features broken | Rollback within 15 minutes | < 15 minutes |
| **Medium** | Minor features broken | Evaluate, then rollback or fix forward | < 1 hour |
| **Low** | UI issues, non-critical bugs | Fix forward | Next deployment |

---

## Quick Rollback Guide

### 1. Assess the Situation

```bash
# Check error rates in Sentry
# Check uptime monitoring
# Check user reports
# Check application logs
```

### 2. Notify Team

```
Subject: PRODUCTION ROLLBACK IN PROGRESS

Issue: [Brief description]
Severity: [Critical/High/Medium/Low]
Action: Rolling back to previous version
ETA: [Time estimate]
```

### 3. Execute Rollback

Follow platform-specific instructions below.

### 4. Verify Rollback

- [ ] Application is accessible
- [ ] Critical functionality works
- [ ] Error rates return to normal
- [ ] Performance is restored

### 5. Post-Rollback

- [ ] Document the incident
- [ ] Analyze root cause
- [ ] Create fix
- [ ] Test fix thoroughly
- [ ] Schedule new deployment

---

## Frontend Rollback

### Vercel

#### Option 1: Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `serenitas-app`
3. Go to "Deployments" tab
4. Find last working deployment
5. Click three dots (⋯) → "Promote to Production"
6. Confirm promotion

**Time:** ~2 minutes

#### Option 2: CLI

```bash
# List recent deployments
vercel ls serenitas-app

# Promote specific deployment
vercel promote [deployment-url] --yes

# Or rollback to previous
vercel rollback
```

**Time:** ~1 minute

### Netlify

#### Option 1: Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select site: `serenitas-app`
3. Go to "Deploys" tab
4. Find last working deploy
5. Click "Publish deploy"
6. Confirm

**Time:** ~2 minutes

#### Option 2: CLI

```bash
# List recent deploys
netlify deploys:list

# Restore specific deploy
netlify deploy:restore [deploy-id]
```

**Time:** ~1 minute

---

## Backend Rollback

### Vercel

#### Option 1: Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `serenitas-backend`
3. Go to "Deployments" tab
4. Find last working deployment
5. Click three dots (⋯) → "Promote to Production"
6. Confirm promotion

**Time:** ~2 minutes

#### Option 2: CLI

```bash
# Rollback to previous deployment
vercel rollback serenitas-backend
```

**Time:** ~1 minute

### Railway

#### Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select project: `serenitas-backend`
3. Go to "Deployments" tab
4. Find last working deployment
5. Click "Redeploy"
6. Confirm

**Time:** ~3 minutes

### Render

#### Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select service: `serenitas-backend`
3. Go to "Events" tab
4. Find last successful deploy
5. Click "Rollback to this deploy"
6. Confirm

**Time:** ~3 minutes

---

## Database Rollback

### Supabase

Supabase automatically backs up your database daily.

#### Restore from Backup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select project
3. Go to "Database" → "Backups"
4. Find backup before the issue
5. Click "Restore"
6. Confirm (this will overwrite current data)

**Time:** ~10-30 minutes (depending on database size)

**⚠️ WARNING:** This will restore ALL data to the backup point. Any data created after the backup will be lost.

#### Point-in-Time Recovery (PITR)

If you have PITR enabled:

1. Go to "Database" → "Backups"
2. Select "Point in Time Recovery"
3. Choose specific timestamp
4. Restore

**Time:** ~10-30 minutes

### Manual Database Rollback

If you have a migration that needs to be reverted:

```bash
# Connect to database
psql $DATABASE_URL

# Run down migration
\i migrations/down/001_revert_changes.sql

# Verify
SELECT * FROM schema_migrations;
```

---

## Configuration Rollback

### Environment Variables

If the issue is caused by environment variable changes:

#### Vercel/Netlify

1. Go to project settings
2. Go to "Environment Variables"
3. Find changed variable
4. Revert to previous value
5. Redeploy

#### Railway

```bash
# List variables
railway variables

# Set variable back
railway variables set VARIABLE_NAME=old_value

# Redeploy
railway up
```

---

## Partial Rollback

Sometimes you only need to rollback specific components:

### Rollback Frontend Only

```bash
# Rollback frontend
vercel rollback serenitas-app

# Keep backend running
# No action needed
```

### Rollback Backend Only

```bash
# Rollback backend
vercel rollback serenitas-backend

# Keep frontend running
# No action needed
```

### Rollback Database Only

```bash
# Restore database from backup
# Keep application running

# Update application to handle old schema
# Or rollback application too
```

---

## Emergency Procedures

### Complete System Shutdown

If you need to take the entire system offline:

#### Option 1: Maintenance Page

1. Deploy maintenance page to frontend
2. Update DNS to point to maintenance page
3. Or use Cloudflare page rules

#### Option 2: Disable Deployments

**Vercel:**
```bash
# Pause project
vercel --pause
```

**Netlify:**
1. Go to site settings
2. Change "Build & deploy" → "Stop builds"

#### Option 3: DNS Change

1. Go to DNS provider
2. Point domain to maintenance page
3. Wait for DNS propagation

### Database Emergency Stop

If database is corrupted or under attack:

1. Go to Supabase Dashboard
2. Pause project (if available)
3. Or change database password
4. Update backend to use read-only mode

---

## Rollback Verification

After rollback, verify:

### 1. Application Health

```bash
# Check health endpoint
curl https://api.serenitas.app/health

# Expected: {"status":"healthy",...}
```

### 2. Critical Functionality

- [ ] Users can login
- [ ] Dashboard loads
- [ ] Data is accessible
- [ ] No error spikes in Sentry

### 3. Performance

- [ ] Response times normal
- [ ] No slow queries
- [ ] CPU/Memory usage normal

### 4. Error Rates

- [ ] Error rate < 1%
- [ ] No new errors in Sentry
- [ ] Logs show normal activity

---

## Post-Rollback Actions

### 1. Incident Report

Create incident report:

```markdown
# Incident Report

**Date:** 2024-01-15 14:30 UTC
**Duration:** 15 minutes
**Severity:** High

## Summary
[Brief description of what happened]

## Timeline
- 14:30 - Deployment started
- 14:35 - Issue detected
- 14:37 - Rollback initiated
- 14:45 - Rollback completed
- 14:50 - Verification complete

## Root Cause
[What caused the issue]

## Impact
- Users affected: ~100
- Features impacted: Login, Dashboard
- Data loss: None

## Resolution
- Rolled back to version 1.0.0
- Issue fixed in code
- New deployment scheduled

## Prevention
- Add test for this scenario
- Improve monitoring
- Update deployment checklist
```

### 2. Root Cause Analysis

Analyze what went wrong:

1. **What happened?**
   - Describe the issue

2. **Why did it happen?**
   - Identify root cause

3. **How was it detected?**
   - Monitoring alert
   - User report
   - Manual testing

4. **How was it fixed?**
   - Rollback
   - Code fix
   - Configuration change

5. **How can we prevent it?**
   - Add tests
   - Improve monitoring
   - Update procedures

### 3. Fix and Redeploy

1. Create fix in development
2. Test thoroughly
3. Deploy to staging
4. Run smoke tests
5. Deploy to production
6. Monitor closely

### 4. Team Communication

```
Subject: ROLLBACK COMPLETED - System Restored

The production rollback has been completed successfully.

Status: ✅ System operational
Version: 1.0.0 (previous stable)
Downtime: 15 minutes

Next Steps:
1. Fix has been identified
2. Testing in progress
3. New deployment scheduled for [time]

Thank you for your patience.
```

---

## Rollback Checklist

Use this checklist during rollback:

- [ ] Issue severity assessed
- [ ] Team notified
- [ ] Rollback decision made
- [ ] Rollback executed
- [ ] Application verified
- [ ] Error rates checked
- [ ] Performance verified
- [ ] Users notified (if needed)
- [ ] Incident documented
- [ ] Root cause identified
- [ ] Fix created
- [ ] Prevention measures planned

---

## Testing Rollback Procedures

Regularly test rollback procedures:

### Monthly Rollback Drill

1. Schedule drill during low-traffic period
2. Deploy test version
3. Practice rollback
4. Verify system
5. Document time taken
6. Identify improvements

### Rollback Simulation

```bash
# 1. Deploy test version
vercel --prod

# 2. Wait 5 minutes

# 3. Practice rollback
vercel rollback

# 4. Verify
curl https://api.serenitas.app/health

# 5. Document results
```

---

## Contact Information

### Emergency Contacts

**DevOps Lead:**
- Name: [Name]
- Phone: [Phone]
- Email: [Email]

**Technical Lead:**
- Name: [Name]
- Phone: [Phone]
- Email: [Email]

**On-Call Engineer:**
- Check on-call schedule
- PagerDuty: [Link]

### Support Channels

- **Slack:** #production-alerts
- **Email:** devops@clinicaserenitas.com.br
- **Phone:** [Emergency number]

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Production Smoke Tests](./PRODUCTION_SMOKE_TESTS.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
