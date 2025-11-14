# Security Standards

## Important Note

This is a **medical application** handling sensitive health data in **Brazil**. All code must comply with:
- **LGPD** (Lei Geral de Proteção de Dados) - See `compliance-lgpd.md`
- **Medical confidentiality** regulations (Sigilo Médico)
- **CFM** (Conselho Federal de Medicina) guidelines

Always prioritize patient privacy and data protection.

## OWASP Top 10 Protection

### 1. Injection Prevention (SQL/NoSQL)

#### MongoDB Injection Protection
```javascript
// Bad - Vulnerable to NoSQL injection
const user = await User.findOne({ email: req.body.email });

// Good - Use parameterized queries (Mongoose does this by default)
const user = await User.findOne({ email: String(req.body.email) });

// Better - Validate and sanitize inputs
const { body } = req;
const email = validator.isEmail(body.email) ? body.email : null;
if (!email) {
  return res.status(400).json({ error: 'Invalid email' });
}
const user = await User.findOne({ email });
```

#### Input Validation Rules
- Always validate input types and formats
- Use express-validator or joi for schema validation
- Sanitize all user inputs before database operations
- Never trust client-side validation alone

### 2. Cross-Site Scripting (XSS) Prevention

```javascript
// Use helmet middleware (already in dependencies)
const helmet = require('helmet');
app.use(helmet());

// Sanitize HTML inputs
const sanitizeHtml = require('sanitize-html');
const cleanNotes = sanitizeHtml(req.body.notes, {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {}
});

// Set proper Content-Type headers
res.setHeader('Content-Type', 'application/json');

// Escape output in responses (JSON.stringify does this automatically)
res.json({ data: userInput }); // Safe
```

### 3. Authentication & Authorization

#### JWT Best Practices
```javascript
// Use strong secrets (minimum 256 bits)
const JWT_SECRET = process.env.JWT_SECRET; // Must be set in .env

// Set appropriate expiration
const token = jwt.sign(
  { userId: user._id, role: user.role },
  JWT_SECRET,
  { expiresIn: '7d', algorithm: 'HS256' }
);

// Verify tokens properly
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
} catch (error) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

#### Role-Based Access Control (RBAC)
```javascript
// Middleware for role checking
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
router.get('/admin/users', auth, requireRole('admin'), getUsers);
router.get('/doctor/patients', auth, requireRole('doctor', 'admin'), getPatients);
```

### 4. Sensitive Data Exposure

#### Password Security
```javascript
// Use bcrypt with appropriate cost factor (10-12)
const salt = await bcrypt.genSalt(12);
const hashedPassword = await bcrypt.hash(password, salt);

// Never return passwords in responses
const userResponse = user.toObject();
delete userResponse.password;
res.json(userResponse);

// Or use Mongoose select
const user = await User.findById(id).select('-password');
```

#### Environment Variables
```javascript
// Never commit .env files
// Always use environment variables for:
// - Database credentials
// - API keys
// - JWT secrets
// - Third-party service credentials

// Validate required env vars on startup
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

### 5. Rate Limiting & DoS Prevention

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### 6. Security Headers

```javascript
// Use helmet for security headers
const helmet = require('helmet');
app.use(helmet());

// Additional CORS configuration
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 7. Error Handling

```javascript
// Never expose stack traces in production
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});
```

### 8. File Upload Security

```javascript
// Validate file types
const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];

function validateFileUpload(file) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  // Limit file size (e.g., 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
}

// Sanitize filenames
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};
```

### 9. Database Security

```javascript
// Use connection string with authentication
const MONGODB_URI = process.env.MONGODB_URI;

// Enable SSL/TLS for production
const mongoOptions = {
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: true,
  // Connection pooling
  maxPoolSize: 10,
  minPoolSize: 2
};

await mongoose.connect(MONGODB_URI, mongoOptions);
```

### 10. Audit Logging

```javascript
// Log security-relevant events
function auditLog(action, userId, details) {
  logger.info('Security audit', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ipAddress: details.ip,
    userAgent: details.userAgent,
    resource: details.resource
  });
}

// Usage
auditLog('LOGIN_SUCCESS', user._id, { ip: req.ip, userAgent: req.get('user-agent') });
auditLog('UNAUTHORIZED_ACCESS', req.user?._id, { resource: req.path, ip: req.ip });
```

## Security Checklist

Before deploying or merging code, verify:

- [ ] All inputs are validated and sanitized
- [ ] Passwords are hashed with bcrypt (cost factor 12)
- [ ] JWT secrets are strong and stored in environment variables
- [ ] Role-based access control is implemented
- [ ] Rate limiting is configured
- [ ] Security headers are set (helmet)
- [ ] CORS is properly configured
- [ ] Error messages don't leak sensitive information
- [ ] File uploads are validated and sanitized
- [ ] Database connections use authentication
- [ ] Audit logging is in place for sensitive operations
- [ ] No sensitive data in logs or error messages
- [ ] HTTPS is enforced in production
