# Environment Variables Reference

Complete reference for all environment variables used in the Clínica Serenitas application.

## Table of Contents

1. [Backend Environment Variables](#backend-environment-variables)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Security Best Practices](#security-best-practices)
4. [Generating Secure Keys](#generating-secure-keys)
5. [Environment-Specific Configuration](#environment-specific-configuration)

---

## Backend Environment Variables

### Application Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Application environment (`development`, `production`, `test`) |
| `PORT` | No | `5000` | Port number for the server |
| `APP_VERSION` | No | `1.0.0` | Application version for tracking |

### Supabase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | - | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous/public key |
| `SUPABASE_SERVICE_KEY` | Yes | - | Supabase service role key (keep secret!) |

**How to get:**
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Copy the values

### JWT Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret key for signing JWT tokens (256-bit recommended) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration time (e.g., `7d`, `24h`, `30m`) |

**Security Requirements:**
- Must be at least 256 bits (32 bytes)
- Should be cryptographically random
- Never commit to version control
- Rotate periodically (every 90 days recommended)

### Encryption Configuration (LGPD)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | Yes | - | AES-256-GCM encryption key for sensitive data (256-bit) |

**Security Requirements:**
- Must be exactly 256 bits (32 bytes)
- Should be cryptographically random
- Never commit to version control
- Store securely (use secrets manager in production)

### LGPD Compliance

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DPO_NAME` | Yes | - | Data Protection Officer name |
| `DPO_EMAIL` | Yes | - | DPO email address |
| `DPO_PHONE` | No | - | DPO phone number |
| `DPO_ADDRESS` | No | - | DPO physical address |

### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | Comma-separated list of allowed origins |

**Example:**
```
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app,https://app.serenitas.app
```

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Maximum requests per window |
| `AUTH_RATE_LIMIT_MAX` | No | `5` | Maximum auth attempts per window |

### Logging Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level (`error`, `warn`, `info`, `debug`, `trace`) |
| `LOG_FILE_PATH` | No | `./logs` | Directory for log files |

### Email Configuration (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password |
| `SMTP_FROM` | No | - | Default "from" email address |

### Monitoring (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `SENTRY_ENVIRONMENT` | No | `production` | Sentry environment name |

### File Upload Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | No | `5242880` | Maximum file size in bytes (5MB) |
| `ALLOWED_FILE_TYPES` | No | `application/pdf,image/jpeg,image/png` | Allowed MIME types |

### Session Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_TIMEOUT_MINUTES` | No | `30` | Session timeout in minutes |

### Data Retention (LGPD)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INACTIVE_ACCOUNT_RETENTION_YEARS` | No | `2` | Years before deleting inactive accounts |
| `MEDICAL_RECORD_RETENTION_YEARS` | No | `20` | Years to retain medical records (CFM requirement) |
| `AUDIT_LOG_RETENTION_YEARS` | No | `5` | Years to retain audit logs |

---

## Frontend Environment Variables

All frontend variables must be prefixed with `VITE_` to be accessible in the browser.

### API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:5000` | Backend API base URL |

### Supabase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | - | Supabase project URL (same as backend) |
| `VITE_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key (same as backend) |

### Application Information

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_APP_NAME` | No | `Clínica Serenitas` | Application name |
| `VITE_APP_VERSION` | No | `1.0.0` | Application version |
| `VITE_APP_DESCRIPTION` | No | - | Application description |

### PWA Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_PWA_NAME` | No | `Clínica Serenitas` | PWA full name |
| `VITE_PWA_SHORT_NAME` | No | `Serenitas` | PWA short name |
| `VITE_PWA_THEME_COLOR` | No | `#10b981` | PWA theme color |
| `VITE_PWA_BACKGROUND_COLOR` | No | `#ffffff` | PWA background color |

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_ENABLE_ANALYTICS` | No | `false` | Enable analytics tracking |
| `VITE_ENABLE_ERROR_TRACKING` | No | `false` | Enable error tracking |

### Monitoring (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SENTRY_DSN` | No | - | Sentry DSN for frontend error tracking |
| `VITE_SENTRY_ENVIRONMENT` | No | `production` | Sentry environment name |

### File Upload Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_MAX_FILE_SIZE` | No | `5242880` | Maximum file size in bytes (5MB) |
| `VITE_ALLOWED_FILE_TYPES` | No | `application/pdf,image/jpeg,image/png` | Allowed MIME types |

### Localization

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_DEFAULT_LOCALE` | No | `pt-BR` | Default locale |
| `VITE_TIMEZONE` | No | `America/Sao_Paulo` | Default timezone |

### Contact Information

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPPORT_EMAIL` | No | - | Support email address |
| `VITE_SUPPORT_PHONE` | No | - | Support phone number |
| `VITE_DPO_EMAIL` | No | - | DPO email address |

---

## Security Best Practices

### 1. Never Commit Secrets

**DO NOT commit these files:**
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`

**Always commit:**
- `.env.example`
- `.env.production.example`

### 2. Use Different Keys Per Environment

```bash
# Development
JWT_SECRET=dev-secret-key-not-for-production

# Production
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 3. Rotate Secrets Regularly

- JWT secrets: Every 90 days
- Encryption keys: Every 180 days
- API keys: When compromised or annually

### 4. Use Secrets Management

For production, use:
- **Vercel:** Environment Variables in dashboard
- **Railway:** Railway Variables
- **Render:** Environment Variables in dashboard
- **AWS:** AWS Secrets Manager
- **GCP:** Secret Manager
- **Azure:** Key Vault

### 5. Limit Access

- Only give production secrets to necessary team members
- Use role-based access control for secrets management
- Audit access to secrets regularly

### 6. Monitor for Leaks

- Use tools like GitGuardian or TruffleHog
- Set up alerts for exposed secrets
- Rotate immediately if leaked

---

## Generating Secure Keys

### JWT Secret (256-bit)

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Encryption Key (256-bit)

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Random Password

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## Environment-Specific Configuration

### Development (.env.development)

```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_KEY=dev-service-key
JWT_SECRET=dev-jwt-secret-not-for-production
ENCRYPTION_KEY=dev-encryption-key-not-for-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=debug
```

### Staging (.env.staging)

```env
NODE_ENV=staging
PORT=5000
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_KEY=staging-service-key
JWT_SECRET=staging-jwt-secret-different-from-prod
ENCRYPTION_KEY=staging-encryption-key-different-from-prod
ALLOWED_ORIGINS=https://staging.serenitas.app
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=staging
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_KEY=prod-service-key
JWT_SECRET=prod-jwt-secret-256-bit-secure
ENCRYPTION_KEY=prod-encryption-key-256-bit-secure
DPO_EMAIL=dpo@clinicaserenitas.com.br
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

---

## Validation Checklist

Before deploying, verify:

### Backend
- [ ] All required variables are set
- [ ] JWT_SECRET is 256-bit (64 hex characters)
- [ ] ENCRYPTION_KEY is 256-bit (64 hex characters)
- [ ] SUPABASE_URL is correct
- [ ] SUPABASE_SERVICE_KEY is set (not anon key)
- [ ] ALLOWED_ORIGINS includes production domain
- [ ] DPO_EMAIL is set
- [ ] No development secrets in production

### Frontend
- [ ] VITE_API_URL points to production backend
- [ ] VITE_SUPABASE_URL matches backend
- [ ] VITE_SUPABASE_ANON_KEY matches backend
- [ ] No sensitive data in frontend variables
- [ ] All VITE_ prefixed variables are set

---

## Troubleshooting

### "JWT Secret not set" Error

**Problem:** JWT_SECRET environment variable is missing or empty.

**Solution:**
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=generated-secret-here
```

### "Supabase connection failed" Error

**Problem:** Supabase credentials are incorrect or missing.

**Solution:**
1. Verify SUPABASE_URL is correct
2. Verify SUPABASE_ANON_KEY is correct
3. Check Supabase Dashboard → Settings → API

### CORS Errors

**Problem:** Frontend domain not in ALLOWED_ORIGINS.

**Solution:**
```bash
# Add frontend domain to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://serenitas.app,https://www.serenitas.app
```

### Environment Variables Not Loading

**Problem:** Variables not accessible in application.

**Solution:**
1. Restart application after changing .env
2. Verify .env file is in correct directory
3. Check variable names (no typos)
4. Frontend: Ensure variables start with `VITE_`

---

## Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
