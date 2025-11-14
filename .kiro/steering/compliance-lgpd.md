# LGPD Compliance & Healthcare Data Protection

## Overview

This application handles sensitive health data (dados sensíveis de saúde) and must comply with Brazil's **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)** and healthcare confidentiality regulations.

## LGPD Requirements for Health Data

### Classification of Data

#### Sensitive Personal Data (Dados Pessoais Sensíveis)
Health data is classified as **sensitive personal data** under LGPD Article 5, II:
- Medical diagnoses
- Prescriptions and medications
- Exam results
- Mental health assessments
- Mood tracking data
- Doctor's notes
- Treatment history

#### Regular Personal Data (Dados Pessoais)
- Name, email, phone
- Emergency contacts
- Insurance information
- Appointment schedules

### Legal Basis for Processing (Base Legal)

For health data processing, use these legal bases (LGPD Article 11):

1. **Explicit Consent** (Consentimento explícito) - Primary basis
2. **Healthcare Protection** (Tutela da saúde) - For medical treatment
3. **Legal Obligation** (Obrigação legal) - For regulatory compliance

### Implementation Requirements

#### 1. Explicit Consent Management

```javascript
// Consent model structure
const consentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consentType: {
    type: String,
    enum: [
      'data_processing',           // Processamento de dados
      'sensitive_health_data',     // Dados sensíveis de saúde
      'data_sharing_doctors',      // Compartilhamento com médicos
      'data_retention',            // Retenção de dados
      'marketing_communications'   // Comunicações (optional)
    ],
    required: true
  },
  granted: { type: Boolean, required: true },
  grantedAt: { type: Date },
  revokedAt: { type: Date },
  ipAddress: String,
  userAgent: String,
  version: { type: String, required: true }, // Version of terms accepted
  language: { type: String, default: 'pt-BR' }
}, { timestamps: true });

// Consent must be:
// - Free (livre)
// - Informed (informado)
// - Explicit (inequívoco)
// - For specific purposes (finalidade específica)
```

#### 2. Data Subject Rights (Direitos do Titular)

Implement endpoints for LGPD Article 18 rights:

```javascript
// Required endpoints for data subject rights
router.get('/api/lgpd/my-data', auth, getMyPersonalData);           // Right to access
router.get('/api/lgpd/data-usage', auth, getDataUsageInfo);         // Right to information
router.post('/api/lgpd/correct-data', auth, correctPersonalData);   // Right to correction
router.delete('/api/lgpd/delete-account', auth, deleteAccount);     // Right to deletion
router.post('/api/lgpd/data-portability', auth, exportMyData);      // Right to portability
router.post('/api/lgpd/revoke-consent', auth, revokeConsent);       // Right to revoke consent
router.post('/api/lgpd/object-processing', auth, objectToProcessing); // Right to object

/**
 * Export all user data in structured format (JSON)
 * LGPD Article 18, V - Portabilidade dos dados
 */
async function exportMyData(req, res) {
  const userId = req.user._id;
  
  logger.info('Data portability request', { userId, ip: req.ip });
  
  const userData = {
    personalInfo: await User.findById(userId).select('-password'),
    patientProfile: await Patient.findOne({ userId }),
    appointments: await Appointment.find({ patientId: userId }),
    prescriptions: await Prescription.find({ patientId: userId }),
    exams: await Exam.find({ patientId: userId }),
    moodEntries: await MoodEntry.find({ patientId: userId }),
    consents: await Consent.find({ userId }),
    exportDate: new Date().toISOString(),
    format: 'JSON'
  };
  
  // Log the export for audit trail
  await AuditLog.create({
    userId,
    action: 'DATA_EXPORT',
    timestamp: new Date(),
    ipAddress: req.ip
  });
  
  res.json({
    success: true,
    data: userData,
    message: 'Dados exportados conforme LGPD Art. 18, V'
  });
}
```

#### 3. Data Minimization (Minimização)

```javascript
// Only collect necessary data
// Bad - Collecting unnecessary data
const patientSchema = {
  name: String,
  cpf: String,
  rg: String,
  voterRegistration: String,  // Not necessary for healthcare
  politicalAffiliation: String // Prohibited
};

// Good - Minimal necessary data
const patientSchema = {
  name: String,
  cpf: String,  // Only if legally required
  dateOfBirth: Date,
  phone: String,
  emergencyContact: Object
};
```

#### 4. Purpose Limitation (Finalidade)

```javascript
// Document the purpose for each data collection
const dataProcessingPurposes = {
  name: 'Patient identification and communication',
  email: 'Authentication and appointment notifications',
  phone: 'Emergency contact and appointment reminders',
  medicalHistory: 'Clinical treatment and diagnosis',
  moodEntries: 'Mental health monitoring and treatment planning',
  prescriptions: 'Medication management and treatment continuity'
};

// Never use health data for purposes other than healthcare
// Prohibited: Marketing, profiling, discrimination
```

#### 5. Data Retention (Retenção de Dados)

```javascript
// LGPD Article 16 - Delete data when purpose is fulfilled
const retentionPolicies = {
  // CFM Resolution 1.821/2007 - Medical records: minimum 20 years
  medicalRecords: { years: 20, reason: 'CFM 1.821/2007' },
  
  // After account deletion
  deletedAccounts: { days: 30, reason: 'Grace period for recovery' },
  
  // Audit logs for security
  auditLogs: { years: 5, reason: 'Security and compliance' },
  
  // Inactive accounts
  inactiveAccounts: { years: 2, reason: 'LGPD Article 16' }
};

// Implement automatic deletion
async function cleanupExpiredData() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
  
  // Find inactive accounts
  const inactiveUsers = await User.find({
    lastLoginAt: { $lt: cutoffDate },
    deletionScheduled: false
  });
  
  // Notify users before deletion (30 days notice)
  for (const user of inactiveUsers) {
    await sendDeletionNotice(user);
    await User.updateOne(
      { _id: user._id },
      { deletionScheduled: true, deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    );
  }
}
```

#### 6. Security Measures (Segurança)

```javascript
// LGPD Article 46 - Security and good practices

// Encryption at rest
const encryptSensitiveField = (data) => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Encryption in transit - Enforce HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Pseudonymization for analytics
const pseudonymizeUserId = (userId) => {
  return crypto.createHash('sha256')
    .update(userId + process.env.PSEUDONYM_SALT)
    .digest('hex');
};
```

#### 7. Audit Trail (Registro de Operações)

```javascript
// LGPD Article 37 - Maintain audit logs
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: {
    type: String,
    enum: [
      'DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_DELETION',
      'DATA_EXPORT',
      'CONSENT_GRANTED',
      'CONSENT_REVOKED',
      'LOGIN',
      'LOGOUT',
      'FAILED_LOGIN',
      'PASSWORD_CHANGE',
      'SENSITIVE_DATA_ACCESS'
    ],
    required: true
  },
  resourceType: String,  // 'Prescription', 'Exam', 'MoodEntry', etc.
  resourceId: String,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  details: Object
}, { timestamps: true });

// Log all access to sensitive health data
async function logSensitiveDataAccess(req, resourceType, resourceId) {
  await AuditLog.create({
    userId: req.user._id,
    action: 'SENSITIVE_DATA_ACCESS',
    resourceType,
    resourceId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date()
  });
}
```

#### 8. Data Protection Officer (DPO/Encarregado)

```javascript
// LGPD Article 41 - DPO contact information
const dpoContact = {
  name: process.env.DPO_NAME || 'Data Protection Officer',
  email: process.env.DPO_EMAIL || 'dpo@clinicaserenitas.com.br',
  phone: process.env.DPO_PHONE,
  address: process.env.DPO_ADDRESS
};

// Provide DPO contact in privacy policy and app
router.get('/api/dpo-contact', (req, res) => {
  res.json({
    success: true,
    data: dpoContact,
    message: 'Contato do Encarregado de Dados (DPO) conforme LGPD Art. 41'
  });
});
```

## Medical Confidentiality (Sigilo Médico)

### Legal Framework
- **Código de Ética Médica** (CFM Resolution 2.217/2018)
- **Código Penal Brasileiro** (Article 154 - Violation of professional secrecy)
- **Constituição Federal** (Article 5, X - Privacy and intimacy)

### Implementation Rules

#### 1. Access Control by Role

```javascript
// Doctors can only access their assigned patients
async function checkDoctorPatientRelationship(doctorId, patientId) {
  const patient = await Patient.findById(patientId);
  
  if (!patient.doctorId || patient.doctorId.toString() !== doctorId.toString()) {
    throw new Error('Acesso negado: Médico não autorizado para este paciente');
  }
  
  return true;
}

// Middleware for doctor-patient relationship validation
const requirePatientAccess = async (req, res, next) => {
  const { patientId } = req.params;
  const doctorId = req.user._id;
  
  try {
    if (req.user.role === 'admin') {
      return next(); // Admin has access
    }
    
    if (req.user.role === 'doctor') {
      await checkDoctorPatientRelationship(doctorId, patientId);
      return next();
    }
    
    if (req.user.role === 'patient' && req.user._id.toString() === patientId) {
      return next(); // Patient accessing own data
    }
    
    return res.status(403).json({
      success: false,
      error: 'Acesso negado: Violação de sigilo médico'
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 2. Data Anonymization for Research

```javascript
// If data is used for research, anonymize it
function anonymizePatientData(patient) {
  return {
    age: calculateAge(patient.dateOfBirth),
    gender: patient.gender,
    diagnosis: patient.diagnosis,
    // Remove all identifying information
    // No name, CPF, email, phone, address
  };
}
```

#### 3. Secure Communication

```javascript
// All doctor-patient communications must be encrypted
// Use end-to-end encryption for messages
// Never send sensitive health data via unencrypted channels

// Example: Secure messaging
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  iv: String,
  authTag: String,
  isRead: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });
```

## Compliance Checklist

Before deployment, verify:

### LGPD Compliance
- [ ] Privacy policy in Portuguese (pt-BR) is available
- [ ] Explicit consent mechanism for sensitive health data
- [ ] All data subject rights endpoints implemented
- [ ] Data portability export functionality
- [ ] Account deletion with data erasure
- [ ] Consent revocation mechanism
- [ ] DPO contact information displayed
- [ ] Audit logs for all data access
- [ ] Data retention policies implemented
- [ ] Automatic data cleanup for expired data
- [ ] Encryption at rest and in transit
- [ ] Pseudonymization for analytics

### Medical Confidentiality
- [ ] Role-based access control enforced
- [ ] Doctor-patient relationship validation
- [ ] Audit trail for all sensitive data access
- [ ] Secure communication channels
- [ ] No unauthorized data sharing
- [ ] Medical records retention (20 years minimum)

### Security
- [ ] HTTPS enforced in production
- [ ] Strong password requirements
- [ ] Multi-factor authentication (recommended)
- [ ] Session timeout for inactive users
- [ ] Secure password reset flow
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation and sanitization
- [ ] SQL/NoSQL injection prevention

## Required Documentation

Maintain these documents:

1. **Privacy Policy** (Política de Privacidade)
2. **Terms of Use** (Termos de Uso)
3. **Consent Forms** (Termos de Consentimento)
4. **Data Processing Record** (Registro de Operações de Tratamento)
5. **Data Breach Response Plan** (Plano de Resposta a Incidentes)
6. **Data Impact Assessment** (Relatório de Impacto à Proteção de Dados)

## Incident Response

```javascript
// LGPD Article 48 - Notify ANPD and data subjects of breaches
async function handleDataBreach(incident) {
  // 1. Log the incident
  logger.error('Data breach detected', {
    type: incident.type,
    affectedUsers: incident.affectedUsers.length,
    timestamp: new Date()
  });
  
  // 2. Notify DPO immediately
  await notifyDPO(incident);
  
  // 3. Assess severity
  const severity = assessBreachSeverity(incident);
  
  // 4. If high risk, notify ANPD within reasonable time
  if (severity === 'high') {
    await notifyANPD(incident);
  }
  
  // 5. Notify affected users
  for (const userId of incident.affectedUsers) {
    await notifyUserOfBreach(userId, incident);
  }
  
  // 6. Document the incident
  await IncidentLog.create({
    type: incident.type,
    severity,
    affectedUsers: incident.affectedUsers,
    notificationsSent: true,
    timestamp: new Date()
  });
}
```

## References

- [LGPD - Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD - Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/pt-br)
- [CFM - Código de Ética Médica](https://portal.cfm.org.br/etica-medica/)
- [CFM Resolution 1.821/2007 - Medical Records](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
