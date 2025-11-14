# DNS and SSL Configuration Guide

Complete guide for configuring custom domains and SSL certificates for Clínica Serenitas.

## Domain Structure

The application uses the following domain structure:

- **Main App:** `serenitas.app` (frontend)
- **WWW Redirect:** `www.serenitas.app` → `serenitas.app`
- **API:** `api.serenitas.app` (backend)
- **Admin (Optional):** `admin.serenitas.app` (admin panel)

---

## Prerequisites

- [ ] Domain registered (serenitas.app)
- [ ] Access to domain registrar DNS settings
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Backend deployed to Vercel/Railway/Render
- [ ] Deployment URLs available

---

## DNS Configuration

### Step 1: Get Deployment Information

#### Frontend (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Note the deployment URL (e.g., `serenitas-app.vercel.app`)

#### Frontend (Netlify)

1. Go to Netlify Dashboard → Your Site → Domain settings
2. Note the Netlify subdomain (e.g., `serenitas-app.netlify.app`)

#### Backend (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Note the deployment URL (e.g., `serenitas-backend.vercel.app`)

#### Backend (Railway)

1. Go to Railway Dashboard → Your Project → Settings
2. Note the Railway domain (e.g., `serenitas-backend.up.railway.app`)

#### Backend (Render)

1. Go to Render Dashboard → Your Service
2. Note the Render URL (e.g., `serenitas-backend.onrender.com`)

### Step 2: Configure DNS Records

Go to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare, Route53) and add these DNS records:

#### For Vercel (Frontend)

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 3600
```

#### For Netlify (Frontend)

```
Type: A
Name: @
Value: 75.2.60.5
TTL: 3600

Type: CNAME
Name: www
Value: [your-site].netlify.app
TTL: 3600
```

#### For Railway (Backend)

```
Type: CNAME
Name: api
Value: [your-project].up.railway.app
TTL: 3600
```

#### For Render (Backend)

```
Type: CNAME
Name: api
Value: [your-service].onrender.com
TTL: 3600
```

### Step 3: Verify DNS Propagation

DNS changes can take 24-48 hours to propagate. Check status:

```bash
# Check A record
dig serenitas.app

# Check CNAME record
dig www.serenitas.app
dig api.serenitas.app

# Or use online tools
# https://dnschecker.org
# https://www.whatsmydns.net
```

---

## SSL/TLS Configuration

### Automatic SSL (Vercel/Netlify)

Both Vercel and Netlify automatically provision SSL certificates using Let's Encrypt.

#### Vercel

1. Go to Project Settings → Domains
2. Add domain: `serenitas.app`
3. Add domain: `www.serenitas.app`
4. Add domain: `api.serenitas.app`
5. Wait for SSL certificate provisioning (usually < 1 hour)
6. Verify HTTPS is working

#### Netlify

1. Go to Domain settings → HTTPS
2. Verify SSL certificate
3. Enable "Force HTTPS"
4. Certificate auto-renews every 90 days

### Manual SSL Configuration

If using custom SSL certificate:

1. **Generate Certificate:**
   ```bash
   # Using Let's Encrypt (Certbot)
   sudo certbot certonly --manual -d serenitas.app -d www.serenitas.app -d api.serenitas.app
   ```

2. **Upload Certificate:**
   - Go to platform settings
   - Upload certificate files
   - Configure certificate

3. **Auto-Renewal:**
   ```bash
   # Add to crontab
   0 0 1 * * certbot renew --quiet
   ```

---

## Domain Configuration by Platform

### Vercel

#### Add Custom Domain

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter domain: `serenitas.app`
4. Choose configuration:
   - Redirect `www.serenitas.app` to `serenitas.app` (recommended)
   - Or keep both

5. Follow DNS instructions
6. Wait for verification
7. SSL certificate is automatically provisioned

#### Configure Multiple Domains

```bash
# Using Vercel CLI
vercel domains add serenitas.app
vercel domains add www.serenitas.app
vercel domains add api.serenitas.app
```

### Netlify

#### Add Custom Domain

1. Go to Domain settings
2. Click "Add custom domain"
3. Enter domain: `serenitas.app`
4. Netlify checks DNS configuration
5. Follow instructions to update DNS
6. Wait for verification
7. SSL certificate is automatically provisioned

#### Configure Redirects

Create `_redirects` file in `public/`:

```
# Redirect www to non-www
https://www.serenitas.app/* https://serenitas.app/:splat 301!

# Force HTTPS
http://serenitas.app/* https://serenitas.app/:splat 301!
```

### Railway

#### Add Custom Domain

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter domain: `api.serenitas.app`
4. Follow DNS instructions
5. Wait for verification
6. SSL certificate is automatically provisioned

### Render

#### Add Custom Domain

1. Go to Service Settings → Custom Domain
2. Click "Add Custom Domain"
3. Enter domain: `api.serenitas.app`
4. Follow DNS instructions
5. Wait for verification
6. SSL certificate is automatically provisioned

---

## Cloudflare Configuration (Optional)

Using Cloudflare provides additional benefits:
- DDoS protection
- CDN
- Analytics
- Firewall rules

### Step 1: Add Site to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter domain: `serenitas.app`
4. Choose plan (Free is sufficient)

### Step 2: Update Nameservers

1. Cloudflare provides nameservers (e.g., `ns1.cloudflare.com`)
2. Go to your domain registrar
3. Update nameservers to Cloudflare's
4. Wait for propagation (24-48 hours)

### Step 3: Configure DNS in Cloudflare

Add DNS records in Cloudflare:

```
Type: A
Name: @
Value: [Vercel/Netlify IP]
Proxy: Enabled (orange cloud)

Type: CNAME
Name: www
Value: serenitas.app
Proxy: Enabled

Type: CNAME
Name: api
Value: [Backend deployment URL]
Proxy: Enabled
```

### Step 4: Configure SSL/TLS

1. Go to SSL/TLS → Overview
2. Choose encryption mode: **Full (strict)**
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

### Step 5: Configure Security

1. **Firewall Rules:**
   - Block malicious traffic
   - Rate limiting
   - Country blocking (if needed)

2. **Page Rules:**
   - Cache static assets
   - Force HTTPS
   - Redirect www to non-www

3. **Security Level:**
   - Set to "Medium" or "High"

---

## HTTPS Enforcement

### Backend (Express)

Already implemented in `index.js`:

```javascript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

### Frontend (Vercel/Netlify)

Automatic HTTPS enforcement is enabled by default.

### Additional Headers

Set security headers (already configured):

```javascript
// Backend
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Verification Checklist

After configuration, verify:

### DNS Verification

- [ ] `serenitas.app` resolves to correct IP
- [ ] `www.serenitas.app` resolves correctly
- [ ] `api.serenitas.app` resolves correctly
- [ ] DNS propagation complete (check multiple locations)

### SSL Verification

- [ ] `https://serenitas.app` loads with valid certificate
- [ ] `https://www.serenitas.app` loads with valid certificate
- [ ] `https://api.serenitas.app` loads with valid certificate
- [ ] No mixed content warnings
- [ ] Certificate is trusted (not self-signed)
- [ ] Certificate expiration date is valid

### Redirect Verification

- [ ] `http://serenitas.app` redirects to `https://serenitas.app`
- [ ] `http://www.serenitas.app` redirects to `https://serenitas.app`
- [ ] `www.serenitas.app` redirects to `serenitas.app` (if configured)

### Security Headers

Check headers using:
```bash
curl -I https://serenitas.app
```

Verify these headers are present:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

### SSL Labs Test

Test SSL configuration:
1. Go to https://www.ssllabs.com/ssltest/
2. Enter domain: `serenitas.app`
3. Run test
4. Target grade: A or A+

---

## Troubleshooting

### DNS Not Resolving

**Problem:** Domain doesn't resolve to correct IP.

**Solutions:**
1. Verify DNS records are correct
2. Wait for DNS propagation (24-48 hours)
3. Clear DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### SSL Certificate Not Provisioning

**Problem:** HTTPS not working, certificate errors.

**Solutions:**
1. Verify DNS is pointing correctly
2. Wait for certificate provisioning (can take 1 hour)
3. Check platform status page
4. Contact platform support

### Mixed Content Warnings

**Problem:** HTTPS page loading HTTP resources.

**Solutions:**
1. Ensure all resources use HTTPS
2. Update API URL to use HTTPS
3. Check for hardcoded HTTP URLs
4. Use relative URLs where possible

### Redirect Loop

**Problem:** Page keeps redirecting.

**Solutions:**
1. Check redirect configuration
2. Verify HTTPS enforcement settings
3. Check Cloudflare SSL mode (use Full or Full Strict)
4. Review platform redirect rules

---

## Maintenance

### Certificate Renewal

**Vercel/Netlify:**
- Automatic renewal every 90 days
- No action required

**Manual Certificates:**
```bash
# Renew Let's Encrypt certificate
certbot renew

# Check expiration
openssl x509 -in certificate.crt -noout -dates
```

### DNS Updates

When changing hosting:
1. Update DNS records
2. Wait for propagation
3. Verify new configuration
4. Monitor for issues

### Monitoring

Set up monitoring for:
- SSL certificate expiration
- DNS resolution
- HTTPS availability
- Redirect functionality

---

## Security Best Practices

### HSTS Preloading

Submit domain to HSTS preload list:
1. Go to https://hstspreload.org
2. Enter domain: `serenitas.app`
3. Check requirements
4. Submit for inclusion

### CAA Records

Add CAA records to specify allowed certificate authorities:

```
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"
TTL: 3600

Type: CAA
Name: @
Value: 0 issuewild "letsencrypt.org"
TTL: 3600
```

### DNSSEC

Enable DNSSEC at your domain registrar for additional security.

---

## Support Resources

- **Vercel Domains:** https://vercel.com/docs/concepts/projects/domains
- **Netlify Domains:** https://docs.netlify.com/domains-https/custom-domains/
- **Railway Domains:** https://docs.railway.app/deploy/exposing-your-app
- **Render Domains:** https://render.com/docs/custom-domains
- **Cloudflare:** https://support.cloudflare.com

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
