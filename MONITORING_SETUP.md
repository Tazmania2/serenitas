# Monitoring and Logging Setup Guide

Complete guide for setting up monitoring, error tracking, and logging for Clínica Serenitas in production.

## Table of Contents

1. [Error Tracking (Sentry)](#error-tracking-sentry)
2. [Uptime Monitoring](#uptime-monitoring)
3. [Application Performance Monitoring](#application-performance-monitoring)
4. [Log Aggregation](#log-aggregation)
5. [Alerts and Notifications](#alerts-and-notifications)
6. [Dashboards](#dashboards)

---

## Error Tracking (Sentry)

Sentry provides real-time error tracking and performance monitoring.

### Step 1: Create Sentry Account

1. Go to [Sentry.io](https://sentry.io)
2. Sign up for free account
3. Create organization: `clinica-serenitas`

### Step 2: Create Projects

Create two projects:

1. **Backend Project:**
   - Platform: Node.js
   - Name: `serenitas-backend`
   - Copy DSN

2. **Frontend Project:**
   - Platform: React
   - Name: `serenitas-frontend`
   - Copy DSN

### Step 3: Install Sentry SDK

#### Backend

```bash
cd serenitas_backend
npm install @sentry/node @sentry/profiling-node
```

#### Frontend

```bash
cd serenitas_app
npm install @sentry/react
```

### Step 4: Configure Backend

Create `serenitas_backend/config/sentry.js`:

```javascript
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: 0.1,
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    
    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });

  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());
  
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

function errorHandler() {
  // Error handler must be before any other error middleware
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors
      return true;
    },
  });
}

module.exports = { initSentry, errorHandler };
```

Update `serenitas_backend/index.js`:

```javascript
const { initSentry, errorHandler } = require('./config/sentry');

// Initialize Sentry (must be first)
initSentry(app);

// ... other middleware ...

// Sentry error handler (before other error handlers)
app.use(errorHandler());

// ... other error handlers ...
```

### Step 5: Configure Frontend

Update `serenitas_app/src/main.jsx`:

```javascript
import * as Sentry from '@sentry/react';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    
    // Performance Monitoring
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/api\.serenitas\.app/,
        ],
      }),
      new Sentry.Replay({
        // Session replay for debugging
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}

// Wrap App with Sentry
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

### Step 6: Add Environment Variables

#### Backend

```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

#### Frontend

```env
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_ENVIRONMENT=production
```

### Step 7: Test Error Tracking

#### Backend Test

```javascript
// Add test endpoint
app.get('/debug-sentry', (req, res) => {
  throw new Error('Test Sentry error from backend');
});
```

#### Frontend Test

```javascript
// Add test button
<button onClick={() => {
  throw new Error('Test Sentry error from frontend');
}}>
  Test Sentry
</button>
```

### Step 8: Configure Alerts

1. Go to Sentry → Alerts
2. Create alert rules:
   - **High Error Rate:** > 10 errors in 5 minutes
   - **New Issue:** First occurrence of new error
   - **Regression:** Previously resolved issue occurs again

3. Configure notifications:
   - Email
   - Slack (optional)
   - PagerDuty (optional)

---

## Uptime Monitoring

Monitor application availability and response times.

### Option 1: UptimeRobot (Free)

1. **Create Account:**
   - Go to [UptimeRobot](https://uptimerobot.com)
   - Sign up for free account

2. **Add Monitors:**
   
   **Backend Health Check:**
   - Monitor Type: HTTP(s)
   - Friendly Name: Serenitas API
   - URL: `https://api.serenitas.app/health`
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   - Alert Contacts: Your email

   **Frontend:**
   - Monitor Type: HTTP(s)
   - Friendly Name: Serenitas App
   - URL: `https://serenitas.app`
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds

3. **Configure Alerts:**
   - Email notifications
   - SMS (optional, paid)
   - Webhook (optional)

### Option 2: Pingdom

1. **Create Account:**
   - Go to [Pingdom](https://www.pingdom.com)
   - Sign up for account

2. **Add Uptime Checks:**
   - Name: Serenitas API
   - URL: `https://api.serenitas.app/health`
   - Check interval: 1 minute
   - Alert when: Down for 1 minute

3. **Configure Alerts:**
   - Email
   - SMS
   - Slack integration

### Option 3: Better Uptime

1. **Create Account:**
   - Go to [Better Uptime](https://betteruptime.com)
   - Sign up for free account

2. **Add Monitors:**
   - Create HTTP monitor
   - URL: `https://api.serenitas.app/health`
   - Expected status: 200
   - Check interval: 30 seconds

3. **Status Page:**
   - Create public status page
   - Add monitors to status page
   - Share URL: `status.serenitas.app`

---

## Application Performance Monitoring

### Sentry Performance Monitoring

Already configured in Sentry setup above.

**Key Metrics:**
- Request duration
- Database query time
- API endpoint performance
- Frontend page load time

**View Performance:**
1. Go to Sentry → Performance
2. View transaction summaries
3. Identify slow endpoints
4. Optimize bottlenecks

### Custom Performance Tracking

#### Backend

```javascript
const logger = require('./utils/logger');

// Track endpoint performance
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: req.user?._id,
    });
    
    // Alert on slow requests
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
      });
    }
  });
  
  next();
});
```

#### Frontend

```javascript
// Track page load time
window.addEventListener('load', () => {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  
  console.log('Page load time:', pageLoadTime, 'ms');
  
  // Send to analytics
  if (window.gtag) {
    gtag('event', 'timing_complete', {
      name: 'page_load',
      value: pageLoadTime,
    });
  }
});
```

---

## Log Aggregation

### Option 1: Logtail (Recommended)

1. **Create Account:**
   - Go to [Logtail](https://logtail.com)
   - Sign up for account

2. **Create Source:**
   - Name: Serenitas Backend
   - Type: HTTP
   - Copy source token

3. **Install SDK:**
   ```bash
   npm install @logtail/node @logtail/winston
   ```

4. **Configure Winston:**
   ```javascript
   const winston = require('winston');
   const { Logtail } = require('@logtail/node');
   const { LogtailTransport } = require('@logtail/winston');
   
   const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
   
   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' }),
       new LogtailTransport(logtail),
     ],
   });
   ```

5. **Add Environment Variable:**
   ```env
   LOGTAIL_TOKEN=your-source-token
   ```

### Option 2: Papertrail

1. **Create Account:**
   - Go to [Papertrail](https://papertrailapp.com)
   - Sign up for account

2. **Get Log Destination:**
   - Copy host and port (e.g., `logs.papertrailapp.com:12345`)

3. **Configure Winston:**
   ```javascript
   const winston = require('winston');
   require('winston-syslog').Syslog;
   
   const logger = winston.createLogger({
     transports: [
       new winston.transports.Syslog({
         host: 'logs.papertrailapp.com',
         port: 12345,
         protocol: 'tls4',
         localhost: 'serenitas-backend',
         app_name: 'api',
       }),
     ],
   });
   ```

### Option 3: Platform Logs

Use built-in logging from deployment platform:

**Vercel:**
```bash
vercel logs --follow
```

**Railway:**
```bash
railway logs
```

**Render:**
- View logs in dashboard

---

## Alerts and Notifications

### Critical Alerts

Set up alerts for:

1. **Application Down:**
   - Trigger: Health check fails
   - Action: Immediate notification
   - Channels: Email, SMS

2. **High Error Rate:**
   - Trigger: > 10 errors in 5 minutes
   - Action: Notification
   - Channels: Email, Slack

3. **Slow Response Time:**
   - Trigger: Average response > 2 seconds
   - Action: Notification
   - Channels: Email

4. **Database Connection Failed:**
   - Trigger: Database connection error
   - Action: Immediate notification
   - Channels: Email, SMS

5. **Storage Quota Warning:**
   - Trigger: > 80% storage used
   - Action: Notification
   - Channels: Email

### Slack Integration

1. **Create Slack Webhook:**
   - Go to Slack → Apps → Incoming Webhooks
   - Create webhook for #alerts channel
   - Copy webhook URL

2. **Configure Sentry:**
   - Go to Sentry → Settings → Integrations
   - Add Slack integration
   - Configure alert rules to post to Slack

3. **Custom Alerts:**
   ```javascript
   const axios = require('axios');
   
   async function sendSlackAlert(message) {
     if (!process.env.SLACK_WEBHOOK_URL) return;
     
     await axios.post(process.env.SLACK_WEBHOOK_URL, {
       text: message,
       username: 'Serenitas Monitor',
       icon_emoji: ':warning:',
     });
   }
   
   // Usage
   sendSlackAlert('🚨 High error rate detected!');
   ```

---

## Dashboards

### Sentry Dashboard

View in Sentry:
- Error trends
- Performance metrics
- User impact
- Release health

### Custom Dashboard (Grafana)

For advanced monitoring, set up Grafana:

1. **Install Grafana:**
   - Use Grafana Cloud (free tier)
   - Or self-host

2. **Add Data Sources:**
   - Prometheus (metrics)
   - Loki (logs)
   - PostgreSQL (database metrics)

3. **Create Dashboards:**
   - API response times
   - Error rates
   - Database performance
   - User activity

### Status Page

Create public status page:

1. **Use Better Uptime:**
   - Automatic status page
   - Custom domain: `status.serenitas.app`

2. **Or use Statuspage.io:**
   - Create status page
   - Add components (API, App, Database)
   - Configure incidents

---

## Monitoring Checklist

- [ ] Sentry configured for backend
- [ ] Sentry configured for frontend
- [ ] Uptime monitoring active
- [ ] Health check endpoint monitored
- [ ] Error alerts configured
- [ ] Performance monitoring enabled
- [ ] Log aggregation set up
- [ ] Slack notifications configured
- [ ] Status page created
- [ ] Team notified of alert channels

---

## Best Practices

### 1. Log Levels

Use appropriate log levels:
- `ERROR`: Failures requiring immediate attention
- `WARN`: Unexpected situations
- `INFO`: Important business events
- `DEBUG`: Detailed diagnostic information

### 2. Structured Logging

Always use structured logs:

```javascript
// Good
logger.info('User login', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
});

// Bad
logger.info(`User ${user.email} logged in from ${req.ip}`);
```

### 3. Sensitive Data

Never log sensitive data:
- Passwords
- JWT tokens
- Credit card numbers
- Personal health information

### 4. Performance Impact

- Use sampling for performance monitoring
- Limit log verbosity in production
- Use async logging where possible

### 5. Alert Fatigue

- Set appropriate thresholds
- Group similar alerts
- Use escalation policies
- Review and adjust regularly

---

## Troubleshooting

### Sentry Not Capturing Errors

**Check:**
1. DSN is correct
2. Sentry is initialized before app code
3. Error handler is configured
4. Network connectivity

### Logs Not Appearing

**Check:**
1. Log level is appropriate
2. Transport is configured
3. Credentials are correct
4. Network connectivity

### False Positive Alerts

**Solutions:**
1. Adjust alert thresholds
2. Add filters to exclude known issues
3. Use alert grouping
4. Implement grace periods

---

## Support Resources

- **Sentry Docs:** https://docs.sentry.io
- **UptimeRobot Docs:** https://uptimerobot.com/help
- **Logtail Docs:** https://logtail.com/docs
- **Winston Docs:** https://github.com/winstonjs/winston

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
