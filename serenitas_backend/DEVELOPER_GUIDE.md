# Developer Quick Reference Guide

## Getting Started

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials
3. Set a strong JWT secret (256-bit recommended)
4. Configure DPO contact information

```bash
cp env.example .env
# Edit .env with your values
```

### Running the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

---

## Common Patterns

### Creating a Protected Route

```javascript
const { auth } = require('./middleware/auth');
const { requireRole } = require('./middleware/rbac');
const { asyncHandler } = require('./middleware/errorHandler');
const { validateAppointment } = require('./middleware/validation');

// Public route
router.get('/api/public/info', asyncHandler(async (req, res) => {
  res.json({ success: true, data: info });
}));

// Authenticated route
router.get('/api/profile', auth, asyncHandler(async (req, res) => {
  const user = req.user; // User attached by auth middleware
  res.json({ success: true, data: user });
}));

// Role-protected route
router.get('/api/admin/users', 
  auth, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    // Only admins can access
    const users = await getUsers();
    res.json({ success: true, data: users });
  })
);

// Multiple roles allowed
router.get('/api/patients', 
  auth, 
  requireRole('doctor', 'secretary', 'admin'),
  asyncHandler(async (req, res) => {
    // Doctors, secretaries, and admins can access
    const patients = await getPatients();
    res.json({ success: true, data: patients });
  })
);

// With validation
router.post('/api/appointments',
  auth,
  requireRole('secretary', 'admin'),
  validateAppointment,
  asyncHandler(async (req, res) => {
    const appointment = await createAppointment(req.body);
    res.status(201).json({ success: true, data: appointment });
  })
);
```

### Using Supabase Client

```javascript
const { supabase, supabaseAdmin } = require('./config');

// Query with RLS (respects user permissions)
async function getPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Query bypassing RLS (admin operations only)
async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role')
    .order('created_at', { ascending: false });

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Insert data
async function createPatient(patientData) {
  const { data, error } = await supabase
    .from('patients')
    .insert([patientData])
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Update data
async function updatePatient(patientId, updates) {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Delete data
async function deletePatient(patientId) {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);

  if (error) throw new DatabaseError(error.message);
  return true;
}

// Complex query with joins
async function getPatientWithDoctor(patientId) {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      doctor:doctors (
        id,
        user:users (name, email)
      )
    `)
    .eq('id', patientId)
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}
```

### Logging Best Practices

```javascript
const logger = require('./utils/logger');

// Basic logging
logger.info('User logged in', { userId: user.id, email: user.email });
logger.warn('Invalid input', { field: 'email', value: email });
logger.error('Database error', { error: error.message, stack: error.stack });

// Log with request context
logger.logWithRequest('info', 'Appointment created', req, {
  appointmentId: appointment.id,
  patientId: appointment.patient_id
});

// Security events
logger.security('Unauthorized access attempt', {
  userId: req.user?.id,
  path: req.path,
  ip: req.ip
});

// Performance metrics
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
logger.performance('Database query', duration, {
  query: 'getPatients',
  resultCount: patients.length
});

// Audit events
logger.audit('Data export', {
  userId: req.user.id,
  exportType: 'full',
  timestamp: new Date().toISOString()
});
```

### Audit Logging

```javascript
const auditService = require('./services/auditService');

// Log data access
await auditService.logDataAccess({
  userId: req.user.id,
  resourceType: 'prescription',
  resourceId: prescriptionId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Log sensitive data access (medical records)
await auditService.logSensitiveDataAccess({
  userId: req.user.id,
  resourceType: 'exam',
  resourceId: examId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Log data modification
await auditService.logDataModification({
  userId: req.user.id,
  resourceType: 'patient',
  resourceId: patientId,
  before: oldData,
  after: newData,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Log data deletion
await auditService.logDataDeletion({
  userId: req.user.id,
  resourceType: 'appointment',
  resourceId: appointmentId,
  deletedData: appointment,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Use audit middleware (automatic logging)
router.get('/api/prescriptions/:id',
  auth,
  auditService.auditMiddleware('prescription'),
  asyncHandler(async (req, res) => {
    // Data access will be logged automatically
    const prescription = await getPrescription(req.params.id);
    res.json({ success: true, data: prescription });
  })
);
```

### Error Handling

```javascript
const { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError 
} = require('./middleware/errorHandler');

// Throw custom errors
if (!email) {
  throw new ValidationError('Email é obrigatório');
}

if (!user) {
  throw new AuthenticationError('Credenciais inválidas');
}

if (user.role !== 'admin') {
  throw new AuthorizationError('Acesso negado');
}

if (!patient) {
  throw new NotFoundError('Paciente não encontrado');
}

if (existingAppointment) {
  throw new ConflictError('Já existe uma consulta neste horário');
}

// Database errors are caught automatically
const { data, error } = await supabase.from('users').select('*');
if (error) {
  throw new DatabaseError(error.message);
}
```

### Input Validation

```javascript
const { body, param } = require('express-validator');
const { handleValidationErrors, cpfValidator, phoneValidator } = require('./middleware/validation');

// Custom validation
const validateCustom = [
  body('cpf')
    .optional()
    .custom(cpfValidator),
  
  body('phone')
    .optional()
    .custom(phoneValidator),
  
  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido'),
  
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  
  handleValidationErrors
];

router.post('/api/resource', validateCustom, asyncHandler(async (req, res) => {
  // Validation passed
  const resource = await createResource(req.body);
  res.json({ success: true, data: resource });
}));
```

### Brazilian Formatting

```javascript
const {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatPhone,
  formatCPF,
  getRelativeTime
} = require('./utils/formatters');

// Format for display
const appointment = {
  date: new Date('2024-03-15T14:30:00'),
  fee: 150.50
};

const formatted = {
  date: formatDate(appointment.date),        // "15/03/2024"
  time: formatTime(appointment.date),        // "14:30"
  dateTime: formatDateTime(appointment.date), // "15/03/2024 14:30"
  fee: formatCurrency(appointment.fee),      // "R$ 150,50"
  relative: getRelativeTime(appointment.date) // "em 2 dias"
};

// Format user data
const user = {
  phone: '11987654321',
  cpf: '12345678901'
};

const formattedUser = {
  phone: formatPhone(user.phone), // "(11) 98765-4321"
  cpf: formatCPF(user.cpf)        // "123.456.789-01"
};
```

### Response Format

```javascript
// Success response
res.json({
  success: true,
  data: result,
  message: 'Operação realizada com sucesso' // Optional
});

// Success with pagination
res.json({
  success: true,
  data: results,
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5
  }
});

// Error response (handled automatically by error middleware)
throw new ValidationError('Dados inválidos');
// Returns:
// {
//   success: false,
//   message: 'Erro de validação',
//   error: 'Dados inválidos',
//   code: 'VAL_001',
//   timestamp: '2024-03-15T14:30:00.000Z'
// }
```

---

## Constants Reference

### User Roles

```javascript
const { constants } = require('./config');

constants.ROLES.PATIENT    // 'patient'
constants.ROLES.DOCTOR     // 'doctor'
constants.ROLES.SECRETARY  // 'secretary'
constants.ROLES.ADMIN      // 'admin'
```

### Error Codes

```javascript
// Authentication
constants.ERROR_CODES.AUTH_INVALID_CREDENTIALS
constants.ERROR_CODES.AUTH_TOKEN_EXPIRED
constants.ERROR_CODES.AUTH_TOKEN_INVALID
constants.ERROR_CODES.AUTH_UNAUTHORIZED

// Authorization
constants.ERROR_CODES.AUTHZ_FORBIDDEN
constants.ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS
constants.ERROR_CODES.AUTHZ_DOCTOR_NOT_ASSIGNED

// Validation
constants.ERROR_CODES.VALIDATION_REQUIRED_FIELD
constants.ERROR_CODES.VALIDATION_INVALID_FORMAT
constants.ERROR_CODES.VALIDATION_CPF_INVALID

// System
constants.ERROR_CODES.SYSTEM_DATABASE_ERROR
constants.ERROR_CODES.SYSTEM_INTERNAL_ERROR
```

### Audit Actions

```javascript
constants.AUDIT_ACTIONS.DATA_ACCESS
constants.AUDIT_ACTIONS.DATA_MODIFICATION
constants.AUDIT_ACTIONS.DATA_DELETION
constants.AUDIT_ACTIONS.SENSITIVE_DATA_ACCESS
constants.AUDIT_ACTIONS.LOGIN
constants.AUDIT_ACTIONS.LOGOUT
constants.AUDIT_ACTIONS.CONSENT_GRANTED
constants.AUDIT_ACTIONS.DATA_EXPORT
```

---

## Testing

### Unit Test Example

```javascript
const { register, login } = require('./services/authService');

describe('AuthService', () => {
  describe('register', () => {
    it('should create user with valid data', async () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'Senha123!',
        role: 'patient'
      };

      const user = await register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password_hash).toBeUndefined(); // Should not return password
    });

    it('should reject duplicate email', async () => {
      // Test implementation
    });
  });
});
```

---

## Security Checklist

Before deploying:

- [ ] All environment variables set
- [ ] JWT secret is strong (256-bit)
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Stack traces hidden in production
- [ ] Input validation on all endpoints
- [ ] RBAC middleware on protected routes
- [ ] Passwords hashed with bcrypt (cost 12)
- [ ] DPO contact information configured

---

## Common Issues

### "Missing required environment variables"

Make sure `.env` file exists and contains:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`

### "Token inválido"

- Check JWT_SECRET matches between token generation and verification
- Verify token hasn't expired (7-day default)
- Ensure Authorization header format: `Bearer <token>`

### "Supabase connection failed"

- Verify Supabase URL and keys are correct
- Check network connectivity
- Ensure Supabase project is active

### "CPF inválido"

- CPF must be 11 digits
- Cannot be all same digits (e.g., 111.111.111-11)
- Must pass checksum validation

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [LGPD Official Text](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Express Validator](https://express-validator.github.io/docs/)

---

**Last Updated:** 2024
**Version:** 1.0.0
