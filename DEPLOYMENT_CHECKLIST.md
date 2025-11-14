# Production Deployment Checklist

Complete checklist for deploying Clínica Serenitas to production.

## Pre-Deployment

### Code Quality
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No console.log statements in production code
- [ ] No TODO/FIXME comments for critical issues
- [ ] Dependencies updated and audited
- [ ] Security vulnerabilities resolved
- [ ] Linting passes with no errors
- [ ] TypeScript compilation successful (if applicable)

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment guide reviewed
- [ ] Changelog updated
- [ ] Version number incremented

### Database
- [ ] Migrations tested in staging
- [ ] Migrations are reversible
- [ ] RLS policies tested
- [ ] Indexes created
- [ ] Backup taken before migration
- [ ] Data integrity verified

### Configuration
- [ ] Environment variables prepared
- [ ] Secrets generated (JWT, encryption keys)
- [ ] CORS origins configured
- [ ] Rate limits configured
- [ ] DPO contact information set
- [ ] Monitoring configured

---

## Deployment Steps

### 1. Pre-Deployment Backup

- [ ] Database backup created
- [ ] Storage files backed up
- [ ] Configuration backed up
- [ ] Backup verified and accessible

### 2. Backend Deployment

- [ ] Environment variables set
- [ ] Build successful
- [ ] Health check endpoint working
- [ ] Database connection verified
- [ ] API endpoints responding
- [ ] Logs showing no errors

### 3. Frontend Deployment

- [ ] Environment variables set
- [ ] Build successful
- [ ] PWA manifest generated
- [ ] Service worker registered
- [ ] Assets optimized
- [ ] No console errors

### 4. DNS Configuration

- [ ] A records configured
- [ ] CNAME records configured
- [ ] DNS propagation verified
- [ ] SSL certificates provisioned
- [ ] HTTPS enforced
- [ ] Redirects working (www → non-www)

### 5. Monitoring Setup

- [ ] Sentry configured
- [ ] Uptime monitoring active
- [ ] Health checks configured
- [ ] Alerts configured
- [ ] Log aggregation working
- [ ] Status page created

---

## Post-Deployment Verification

### Infrastructure Tests

- [ ] `https://serenitas.app` loads
- [ ] `https://api.serenitas.app` accessible
- [ ] SSL certificate valid
- [ ] Health check returns 200
- [ ] CORS working
- [ ] Rate limiting active

### Authentication Tests

- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens generated
- [ ] Protected routes secured
- [ ] Logout works
- [ ] Password reset works

### Role-Based Access Tests

- [ ] Patient dashboard loads
- [ ] Doctor dashboard loads
- [ ] Secretary dashboard loads
- [ ] Admin dashboard loads
- [ ] Role restrictions enforced
- [ ] Unauthorized access blocked

### Core Functionality Tests

- [ ] Patient can view prescriptions
- [ ] Patient can upload exams
- [ ] Patient can create mood entries
- [ ] Doctor can view patients
- [ ] Doctor can create prescriptions
- [ ] Secretary can schedule appointments
- [ ] Admin can manage users

### LGPD Compliance Tests

- [ ] Data export works
- [ ] Account deletion works
- [ ] Consent management works
- [ ] Privacy policy accessible
- [ ] DPO contact displayed
- [ ] Audit logs recording

### PWA Tests

- [ ] App installable on Android
- [ ] App installable on iOS
- [ ] Service worker active
- [ ] Offline mode works
- [ ] Icons display correctly
- [ ] Splash screen shows

### Performance Tests

- [ ] Page load < 2 seconds
- [ ] API response < 1 second
- [ ] Lighthouse score > 90
- [ ] No performance regressions
- [ ] Database queries optimized

### Security Tests

- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] XSS protection active
- [ ] CSRF protection active
- [ ] Rate limiting working
- [ ] Input validation working

---

## Monitoring Verification

### Error Tracking

- [ ] Sentry capturing errors
- [ ] Source maps working
- [ ] Alerts configured
- [ ] Team notifications working

### Uptime Monitoring

- [ ] Health check monitored
- [ ] Alerts configured
- [ ] Status page updated
- [ ] Response time tracked

### Logging

- [ ] Logs being collected
- [ ] Log levels appropriate
- [ ] No sensitive data in logs
- [ ] Log aggregation working

---

## Team Communication

### Pre-Deployment Notification

```
Subject: Production Deployment Scheduled

Date: [Date]
Time: [Time] UTC
Duration: ~30 minutes
Impact: None expected

Changes:
- [Feature 1]
- [Feature 2]
- [Bug fix 1]

Rollback plan: Available if needed
```

### Post-Deployment Notification

```
Subject: Production Deployment Complete

Status: ✅ Successful
Version: 1.0.0
Deployed: [Timestamp]

Verification:
- All smoke tests passed
- Monitoring active
- No errors detected

Next steps:
- Monitor for 24 hours
- Gather user feedback
```

---

## Rollback Plan

### Rollback Triggers

Rollback if:
- [ ] Critical functionality broken
- [ ] Error rate > 5%
- [ ] Performance degradation > 50%
- [ ] Security vulnerability introduced
- [ ] Data corruption detected

### Rollback Procedure

1. [ ] Notify team
2. [ ] Execute rollback (see ROLLBACK_PROCEDURES.md)
3. [ ] Verify system restored
4. [ ] Document incident
5. [ ] Analyze root cause
6. [ ] Create fix
7. [ ] Schedule new deployment

---

## Post-Deployment Tasks

### Immediate (0-1 hour)

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review logs for issues
- [ ] Verify critical functionality
- [ ] Respond to user reports

### Short-term (1-24 hours)

- [ ] Continue monitoring
- [ ] Gather user feedback
- [ ] Review analytics
- [ ] Check database performance
- [ ] Verify backup completed

### Medium-term (1-7 days)

- [ ] Analyze usage patterns
- [ ] Review error trends
- [ ] Optimize performance
- [ ] Address user feedback
- [ ] Plan next iteration

---

## Compliance Verification

### LGPD Compliance

- [ ] Privacy policy in Portuguese
- [ ] Explicit consent mechanism
- [ ] Data subject rights implemented
- [ ] DPO contact information
- [ ] Audit logging active
- [ ] Data encryption enabled
- [ ] Retention policies configured

### Security Compliance

- [ ] HTTPS enforced
- [ ] Strong passwords required
- [ ] JWT tokens secure
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Security headers set
- [ ] OWASP Top 10 addressed

### Medical Compliance

- [ ] Medical records retention (20 years)
- [ ] Doctor-patient confidentiality
- [ ] Access controls enforced
- [ ] Audit trail complete
- [ ] CFM guidelines followed

---

## Documentation Updates

- [ ] Deployment guide updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Monitoring setup documented
- [ ] Rollback procedures documented
- [ ] Backup procedures documented
- [ ] Incident response plan updated

---

## Sign-off

### Technical Lead

- [ ] Code quality verified
- [ ] Tests passing
- [ ] Security reviewed
- [ ] Performance acceptable

**Signed:** _________________ **Date:** _________

### DevOps Lead

- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backups verified
- [ ] Rollback plan ready

**Signed:** _________________ **Date:** _________

### Product Owner

- [ ] Features verified
- [ ] User acceptance complete
- [ ] Documentation reviewed
- [ ] Ready for production

**Signed:** _________________ **Date:** _________

### DPO (Data Protection Officer)

- [ ] LGPD compliance verified
- [ ] Privacy policy reviewed
- [ ] Consent mechanisms working
- [ ] Audit logging active

**Signed:** _________________ **Date:** _________

---

## Emergency Contacts

**Technical Lead:**
- Name: [Name]
- Phone: [Phone]
- Email: [Email]

**DevOps Lead:**
- Name: [Name]
- Phone: [Phone]
- Email: [Email]

**On-Call Engineer:**
- Check PagerDuty schedule

**Support Channels:**
- Slack: #production-alerts
- Email: devops@clinicaserenitas.com.br

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [DNS Configuration](./DNS_CONFIGURATION.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Production Smoke Tests](./PRODUCTION_SMOKE_TESTS.md)
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)
- [Backup Procedures](./BACKUP_PROCEDURES.md)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
