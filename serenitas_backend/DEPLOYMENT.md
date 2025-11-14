# Backend Deployment Guide

Step-by-step instructions for deploying the Clínica Serenitas backend to production.

## Prerequisites

- [ ] Supabase project created and configured
- [ ] Database migrations executed
- [ ] RLS policies enabled
- [ ] Storage buckets configured
- [ ] Git repository with code committed
- [ ] Environment variables prepared

## Deployment Options

Choose one of the following platforms:

1. [Vercel](#option-1-vercel) - Recommended for simplicity
2. [Railway](#option-2-railway) - Recommended for databases
3. [Render](#option-3-render) - Good free tier

---

## Option 1: Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Configure Project

The `vercel.json` file is already configured in the repository:

```json
{
  "version": 2,
  "name": "serenitas-backend",
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["gru1"]
}
```

### Step 4: Deploy

```bash
cd serenitas_backend
vercel --prod
```

### Step 5: Configure Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.production.example`:

**Required Variables:**
- `NODE_ENV` = `production`
- `SUPABASE_URL` = Your Supabase URL
- `SUPABASE_ANON_KEY` = Your Supabase anon key
- `SUPABASE_SERVICE_KEY` = Your Supabase service key
- `JWT_SECRET` = Generated 256-bit secret
- `ENCRYPTION_KEY` = Generated 256-bit key
- `DPO_EMAIL` = Your DPO email
- `ALLOWED_ORIGINS` = Your frontend URLs

### Step 6: Redeploy

After adding environment variables:

```bash
vercel --prod
```

### Step 7: Verify Deployment

```bash
# Test health endpoint
curl https://your-deployment.vercel.app/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected","version":"1.0.0"}
```

### Step 8: Configure Custom Domain

1. Go to Settings → Domains
2. Add domain: `api.serenitas.app`
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

---

## Option 2: Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Initialize Project

```bash
cd serenitas_backend
railway init
```

Follow the prompts to create a new project.

### Step 4: Add Environment Variables

```bash
# Add variables one by one
railway variables set NODE_ENV=production
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_ANON_KEY=your-anon-key
railway variables set SUPABASE_SERVICE_KEY=your-service-key
railway variables set JWT_SECRET=your-jwt-secret
railway variables set ENCRYPTION_KEY=your-encryption-key
railway variables set DPO_EMAIL=dpo@clinicaserenitas.com.br
railway variables set ALLOWED_ORIGINS=https://serenitas.app
```

Or use the Railway dashboard to add variables in bulk.

### Step 5: Deploy

```bash
railway up
```

### Step 6: Get Deployment URL

```bash
railway domain
```

### Step 7: Configure Custom Domain

1. Go to Railway Dashboard
2. Select your project
3. Go to Settings → Domains
4. Add custom domain: `api.serenitas.app`
5. Configure DNS records as instructed

### Step 8: Verify Deployment

```bash
curl https://your-project.railway.app/health
```

---

## Option 3: Render

### Step 1: Create Account

Go to [Render](https://render.com) and create an account.

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your Git repository
3. Select the `serenitas_backend` directory

### Step 3: Configure Service

**Basic Settings:**
- Name: `serenitas-backend`
- Environment: `Node`
- Region: Choose closest to Brazil (e.g., Oregon)
- Branch: `main`

**Build Settings:**
- Build Command: `npm install`
- Start Command: `npm start`

**Instance Type:**
- Free tier for testing
- Starter ($7/month) for production

### Step 4: Add Environment Variables

Go to Environment tab and add:

```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
DPO_EMAIL=dpo@clinicaserenitas.com.br
ALLOWED_ORIGINS=https://serenitas.app
LOG_LEVEL=info
```

### Step 5: Deploy

Click "Create Web Service" to deploy.

### Step 6: Configure Custom Domain

1. Go to Settings → Custom Domain
2. Add domain: `api.serenitas.app`
3. Configure DNS records as instructed

### Step 7: Configure Health Check

1. Go to Settings → Health Check
2. Set Health Check Path: `/health`
3. Save changes

### Step 8: Verify Deployment

```bash
curl https://serenitas-backend.onrender.com/health
```

---

## Post-Deployment Configuration

### 1. Update Frontend API URL

Update frontend environment variables:

```env
# Frontend .env.production
VITE_API_URL=https://api.serenitas.app
```

### 2. Configure CORS

Verify ALLOWED_ORIGINS includes your frontend domain:

```env
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app
```

### 3. Test API Endpoints

```bash
# Test registration
curl -X POST https://api.serenitas.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "role": "patient"
  }'

# Test login
curl -X POST https://api.serenitas.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 4. Monitor Logs

**Vercel:**
```bash
vercel logs
```

**Railway:**
```bash
railway logs
```

**Render:**
- View logs in dashboard under "Logs" tab

---

## Continuous Deployment

### Automatic Deployments

All platforms support automatic deployments from Git:

1. Push code to `main` branch
2. Platform automatically builds and deploys
3. Monitor deployment status in dashboard

### Manual Deployments

**Vercel:**
```bash
vercel --prod
```

**Railway:**
```bash
railway up
```

**Render:**
- Trigger manual deploy from dashboard

---

## Rollback Procedures

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

Or use dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### Railway

1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

### Render

1. Go to Events tab
2. Find previous successful deploy
3. Click "Rollback to this deploy"

---

## Monitoring and Alerts

### Health Check Monitoring

Set up external monitoring:

1. **UptimeRobot** (Free)
   - Monitor: `https://api.serenitas.app/health`
   - Interval: 5 minutes
   - Alert: Email/SMS on downtime

2. **Pingdom**
   - Monitor: `https://api.serenitas.app/health`
   - Check: HTTP status 200
   - Response contains: `"status":"healthy"`

### Error Tracking

Configure Sentry (see Monitoring Setup section in main deployment guide).

### Log Monitoring

- **Vercel:** Built-in logs in dashboard
- **Railway:** Built-in logs in dashboard
- **Render:** Built-in logs in dashboard

For advanced logging, consider:
- Logtail
- Papertrail
- Datadog

---

## Troubleshooting

### Deployment Fails

**Check:**
1. Build logs for errors
2. Environment variables are set correctly
3. Dependencies are installed
4. Node version compatibility

**Common Issues:**
- Missing environment variables
- Incorrect Node version
- Build command errors
- Port configuration issues

### Database Connection Fails

**Check:**
1. SUPABASE_URL is correct
2. SUPABASE_SERVICE_KEY is correct
3. Supabase project is active
4. Network connectivity

### CORS Errors

**Check:**
1. ALLOWED_ORIGINS includes frontend domain
2. Frontend is using correct API URL
3. CORS middleware is configured

### Rate Limiting Issues

**Check:**
1. Rate limit configuration
2. IP address detection
3. Adjust limits if needed

---

## Security Checklist

Before going live:

- [ ] HTTPS is enforced
- [ ] Environment variables are secure
- [ ] JWT secret is 256-bit
- [ ] Encryption key is 256-bit
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set
- [ ] Error messages don't leak sensitive info
- [ ] Logs don't contain sensitive data
- [ ] Database credentials are secure

---

## Performance Optimization

### Caching

Consider adding caching layer:
- Redis for session storage
- CDN for static assets
- Database query caching

### Database Optimization

- Ensure indexes are created
- Monitor slow queries
- Optimize N+1 queries
- Use connection pooling

### Monitoring

- Track response times
- Monitor error rates
- Set up alerts for anomalies
- Review logs regularly

---

## Support

For deployment issues:
- Check platform documentation
- Review deployment logs
- Contact platform support
- Consult team lead

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
