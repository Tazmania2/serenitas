# Deployment Guide - Clínica Serenitas

This guide provides step-by-step instructions for deploying the Clínica Serenitas application to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Domain and SSL Configuration](#domain-and-ssl-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Production Smoke Tests](#production-smoke-tests)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Supabase project created and configured
- [ ] Database migrations executed
- [ ] RLS policies enabled and tested
- [ ] Storage buckets configured
- [ ] Git repository with all code committed
- [ ] Domain name registered (serenitas.app)
- [ ] Vercel/Netlify account for frontend
- [ ] Vercel/Railway/Render account for backend
- [ ] Sentry account for error tracking (optional)

---

## Environment Variables Setup

### 1. Generate Secure Keys

Generate strong secrets for production:

```bash
# Generate JWT Secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Backend Environment Variables

Copy the example file and fill in values:

```bash
cd serenitas_backend
cp .env.production.example .env.production
```

**Required Variables:**

| Variable | Description | How to Get |
|----------|-------------|------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key | Supabase Dashboard → Settings → API |
| `JWT_SECRET` | JWT signing secret | Generate with crypto (see above) |
| `ENCRYPTION_KEY` | Data encryption key | Generate with crypto (see above) |
| `DPO_EMAIL` | Data Protection Officer email | Your DPO contact |
| `ALLOWED_ORIGINS` | Frontend URLs | Your frontend domain(s) |

**Example `.env.production`:**

```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
ENCRYPTION_KEY=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
DPO_EMAIL=dpo@clinicaserenitas.com.br
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app
LOG_LEVEL=info
```

### 3. Frontend Environment Variables

Copy the example file and fill in values:

```bash
cd serenitas_app
cp .env.production.example .env.production
```

**Required Variables:**

| Variable | Description | Value |
|----------|-------------|-------|
| `VITE_API_URL` | Backend API URL | Your backend domain |
| `VITE_SUPABASE_URL` | Supabase project URL | Same as backend |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | Same as backend |

**Example `.env.production`:**

```env
VITE_API_URL=https://api.serenitas.app
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Clínica Serenitas
VITE_APP_VERSION=1.0.0
```

---

## Backend Deployment

### Option 1: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy Backend:**
   ```bash
   cd serenitas_backend
   vercel --prod
   ```

4. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env.production`
   - Ensure they are set for "Production" environment

5. **Configure Build Settings:**
   - Build Command: `npm install`
   - Output Directory: `.`
   - Install Command: `npm install`

### Option 2: Deploy to Railway

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   cd serenitas_backend
   railway init
   ```

4. **Add Environment Variables:**
   ```bash
   railway variables set SUPABASE_URL=https://...
   railway variables set JWT_SECRET=...
   # Add all other variables
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

### Option 3: Deploy to Render

1. **Create New Web Service:**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your Git repository

2. **Configure Service:**
   - Name: `serenitas-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Choose based on needs

3. **Add Environment Variables:**
   - Go to Environment tab
   - Add all variables from `.env.production`

4. **Deploy:**
   - Click "Create Web Service"

---

## Frontend Deployment

### Option 1: Deploy to Vercel

1. **Deploy Frontend:**
   ```bash
   cd serenitas_app
   vercel --prod
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env.production`

3. **Configure Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Option 2: Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   cd serenitas_app
   netlify deploy --prod
   ```

4. **Configure Build Settings:**
   - Build Command: `npm run build`
   - Publish Directory: `dist`

5. **Add Environment Variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all variables from `.env.production`

---

## Domain and SSL Configuration

### 1. Configure Custom Domain

#### For Vercel:

1. Go to Project Settings → Domains
2. Add domain: `serenitas.app` and `www.serenitas.app`
3. Follow DNS configuration instructions

#### For Netlify:

1. Go to Site Settings → Domain Management
2. Add custom domain: `serenitas.app`
3. Follow DNS configuration instructions

### 2. Configure DNS Records

Add these DNS records at your domain registrar:

**For Frontend (serenitas.app):**
```
Type: A
Name: @
Value: [Vercel/Netlify IP]

Type: CNAME
Name: www
Value: [Your deployment URL]
```

**For Backend (api.serenitas.app):**
```
Type: CNAME
Name: api
Value: [Your backend deployment URL]
```

### 3. SSL/TLS Configuration

- Vercel and Netlify automatically provision SSL certificates
- Wait 24-48 hours for DNS propagation
- Verify HTTPS is working: `https://serenitas.app`

### 4. Force HTTPS

Ensure your backend enforces HTTPS in production:

```javascript
// Already implemented in index.js
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect('https://' + req.headers.host + req.url);
}
```

---

## Monitoring Setup

### 1. Set Up Sentry (Error Tracking)

1. **Create Sentry Account:**
   - Go to https://sentry.io
   - Create new project for Node.js (backend)
   - Create new project for React (frontend)

2. **Get DSN:**
   - Copy DSN from project settings

3. **Add to Environment Variables:**
   ```env
   # Backend
   SENTRY_DSN=https://...@sentry.io/...
   SENTRY_ENVIRONMENT=production
   
   # Frontend
   VITE_SENTRY_DSN=https://...@sentry.io/...
   VITE_SENTRY_ENVIRONMENT=production
   ```

4. **Install Sentry SDK:**
   ```bash
   # Backend
   cd serenitas_backend
   npm install @sentry/node
   
   # Frontend
   cd serenitas_app
   npm install @sentry/react
   ```

5. **Initialize Sentry (Backend):**
   ```javascript
   // Add to index.js
   const Sentry = require('@sentry/node');
   
   if (process.env.SENTRY_DSN) {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.SENTRY_ENVIRONMENT || 'production',
       tracesSampleRate: 1.0,
     });
   }
   ```

6. **Initialize Sentry (Frontend):**
   ```javascript
   // Add to main.jsx
   import * as Sentry from '@sentry/react';
   
   if (import.meta.env.VITE_SENTRY_DSN) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
       integrations: [new Sentry.BrowserTracing()],
       tracesSampleRate: 1.0,
     });
   }
   ```

### 2. Set Up Application Monitoring

1. **Health Check Endpoint:**
   - Already implemented at `/health`
   - Monitor this endpoint with uptime service

2. **Uptime Monitoring:**
   - Use UptimeRobot, Pingdom, or similar
   - Monitor: `https://api.serenitas.app/health`
   - Alert on downtime

3. **Log Aggregation:**
   - Use Logtail, Papertrail, or similar
   - Configure log shipping from deployment platform

### 3. Set Up Alerts

Configure alerts for:
- API downtime (health check fails)
- High error rate (>5% of requests)
- Slow response times (>2 seconds)
- Database connection failures
- Storage quota warnings

---

## Production Smoke Tests

After deployment, verify all critical functionality:

### 1. Authentication Tests

```bash
# Test user registration
curl -X POST https://api.serenitas.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "role": "patient"
  }'

# Test user login
curl -X POST https://api.serenitas.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Role-Based Access Tests

- [ ] Login as Patient → Verify patient dashboard loads
- [ ] Login as Doctor → Verify doctor dashboard loads
- [ ] Login as Secretary → Verify secretary dashboard loads
- [ ] Login as Admin → Verify admin dashboard loads

### 3. Core Functionality Tests

- [ ] Patient can view prescriptions
- [ ] Patient can upload exam file
- [ ] Patient can create mood entry
- [ ] Doctor can view assigned patients
- [ ] Doctor can create prescription
- [ ] Secretary can schedule appointment
- [ ] Admin can manage users

### 4. LGPD Compliance Tests

- [ ] User can export personal data
- [ ] User can request account deletion
- [ ] User can revoke consent
- [ ] Privacy policy is accessible
- [ ] DPO contact information is displayed

### 5. Security Tests

- [ ] HTTPS is enforced
- [ ] Rate limiting is working
- [ ] Invalid tokens are rejected
- [ ] Unauthorized access is blocked
- [ ] RLS policies are enforced

### 6. PWA Tests

- [ ] App can be installed on mobile
- [ ] Service worker is registered
- [ ] Offline mode works for cached pages
- [ ] App icons are displayed correctly

---

## Rollback Procedures

### Quick Rollback (Vercel/Netlify)

1. **Via Dashboard:**
   - Go to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Via CLI:**
   ```bash
   # Vercel
   vercel rollback
   
   # Netlify
   netlify rollback
   ```

### Database Rollback

If database migration fails:

1. **Restore from Backup:**
   ```bash
   # Supabase automatically backs up daily
   # Restore from Supabase Dashboard → Database → Backups
   ```

2. **Revert Migration:**
   ```bash
   # Run down migration if available
   psql $DATABASE_URL -f migrations/down/001_revert.sql
   ```

### Emergency Procedures

1. **Take Site Offline:**
   - Deploy maintenance page
   - Update DNS to point to maintenance page

2. **Notify Users:**
   - Send email notification (if possible)
   - Update status page

3. **Investigate Issue:**
   - Check error logs in Sentry
   - Check application logs
   - Check database logs

4. **Fix and Redeploy:**
   - Fix issue in code
   - Test locally
   - Deploy fix
   - Verify fix in production

---

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Custom domain configured
- [ ] SSL/TLS certificates active
- [ ] Monitoring and alerts configured
- [ ] All smoke tests passed
- [ ] Backup procedures verified
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily:** Monitor error rates and uptime
- **Weekly:** Review audit logs for security issues
- **Monthly:** Review and optimize database performance
- **Quarterly:** Update dependencies and security patches

### Getting Help

- **Technical Issues:** Check logs in Sentry and deployment platform
- **Database Issues:** Check Supabase Dashboard → Logs
- **Deployment Issues:** Check Vercel/Netlify build logs

### Contact Information

- **DevOps Team:** devops@clinicaserenitas.com.br
- **DPO:** dpo@clinicaserenitas.com.br
- **Support:** suporte@clinicaserenitas.com.br

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [LGPD Compliance Guide](./serenitas_backend/LGPD_IMPLEMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
