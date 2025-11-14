# Logging and Monitoring Standards

## Structured Logging

### Required Logging Points
1. **Function Entry**: Log inputs and context
2. **Function Exit**: Log outputs and results
3. **Error Points**: Log errors with full context
4. **Key Decision Points**: Log important branching logic
5. **External Calls**: Log API calls, database queries

### Log Levels
- `ERROR`: Failures that need immediate attention
- `WARN`: Unexpected situations that don't break functionality
- `INFO`: Important business events (user login, data creation)
- `DEBUG`: Detailed information for troubleshooting
- `TRACE`: Very detailed diagnostic information

### Structured Log Format

```javascript
// Good - Structured logging
logger.info('User login attempt', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  ipAddress: req.ip
});

// Bad - Unstructured logging
console.log('User logged in: ' + user.email);
```

### Logging Best Practices

1. **Include Context**: Always log relevant identifiers (userId, requestId, etc.)
2. **Avoid Sensitive Data**: Never log passwords, tokens, or PII
3. **Use Correlation IDs**: Track requests across services
4. **Log Performance Metrics**: Response times, query durations
5. **Sanitize Inputs**: Remove sensitive data before logging

### Example Implementation

```javascript
const logger = require('./utils/logger');

async function createAppointment(req, res) {
  const requestId = req.id;
  const startTime = Date.now();
  
  logger.info('Creating appointment', {
    requestId,
    patientId: req.body.patientId,
    doctorId: req.body.doctorId,
    date: req.body.date
  });

  try {
    const appointment = await appointmentService.create(req.body);
    
    const duration = Date.now() - startTime;
    logger.info('Appointment created successfully', {
      requestId,
      appointmentId: appointment._id,
      duration
    });

    return res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    logger.error('Failed to create appointment', {
      requestId,
      error: error.message,
      stack: error.stack,
      input: req.body,
      duration: Date.now() - startTime
    });

    return res.status(500).json({ success: false, error: error.message });
  }
}
```

## Metrics and Counters

### Track Key Metrics
- Request counts by endpoint
- Response times (p50, p95, p99)
- Error rates by type
- Database query performance
- Authentication success/failure rates

### Debug Metrics Example

```javascript
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0
};

// Increment counters
metrics.totalRequests++;
metrics.successfulRequests++;
```

## Configuration Management

### Avoid Hardcoded Values

```javascript
// Bad
const MAX_RETRIES = 3;
const TIMEOUT = 5000;

// Good
const config = {
  maxRetries: process.env.MAX_RETRIES || 3,
  timeout: process.env.TIMEOUT || 5000,
  apiUrl: process.env.API_URL || 'http://localhost:3000'
};
```

### Centralize Configuration

Create a `config/` directory:
```
config/
├── index.js          # Main config loader
├── database.js       # Database settings
├── auth.js           # Auth settings
└── constants.js      # Business constants
```

## Code Documentation

### When to Add Comments

1. **Complex Logic**: Explain WHY, not WHAT
2. **Business Rules**: Document domain-specific rules
3. **Workarounds**: Explain temporary solutions
4. **API Contracts**: Document expected inputs/outputs
5. **Performance Considerations**: Explain optimization choices

### Comment Examples

```javascript
// Good - Explains WHY
// We use a 7-day expiration to balance security and user convenience
// as per security audit recommendation from 2024-01
const JWT_EXPIRATION = '7d';

// Bad - Explains WHAT (code already shows this)
// Set JWT expiration to 7 days
const JWT_EXPIRATION = '7d';

// Good - Documents business rule
/**
 * Validates appointment time slot availability
 * Business Rule: Appointments must be at least 24 hours in advance
 * and cannot be scheduled on weekends or holidays
 */
function validateAppointmentTime(date) {
  // implementation
}
```

### JSDoc for Functions

```javascript
/**
 * Creates a new prescription for a patient
 * @param {string} patientId - The patient's unique identifier
 * @param {string} doctorId - The prescribing doctor's identifier
 * @param {Array<Object>} medications - List of medications with dosage info
 * @param {number} duration - Prescription duration in days
 * @returns {Promise<Object>} The created prescription object
 * @throws {ValidationError} If required fields are missing
 * @throws {AuthorizationError} If doctor is not authorized for patient
 */
async function createPrescription(patientId, doctorId, medications, duration) {
  // implementation
}
```
