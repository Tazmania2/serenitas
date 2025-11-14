# LGPD Implementation Guide

## Overview

This document describes the LGPD (Lei Geral de Proteção de Dados) compliance implementation for the Clínica Serenitas system.

## Implemented Features

### 1. Data Encryption (Requirement 8.10)

**File:** `utils/encryption.js`

- AES-256-GCM encryption for sensitive health data
- Secure key management via environment variables
- Functions for encrypting/decrypting individual fields and objects
- SHA-256 hashing for pseudonymization

**Usage:**
```javascript
const { encrypt, decrypt, encryptFields, decryptFields } = require('./utils/encryption');

// Encrypt a single value
const encrypted = encrypt('sensitive data');
// Returns: { encrypted, iv, authTag }

// Decrypt
const plaintext = decrypt(encrypted);

// Encrypt multiple fields
const user = { name: 'John', ssn: '123-45-6789' };
const encrypted = encryptFields(user, ['ssn']);
```

**Environment Variables Required:**
```
ENCRYPTION_KEY=<64-character-hex-string>
PSEUDONYM_SALT=<random-string>
```

Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. Consent Management (Requirement 8.8)

**Files:** 
- `models/Consent.js` - Consent data model
- `services/consentService.js` - Consent business logic

**Consent Types:**
- `data_processing` - General data processing
- `sensitive_health_data` - Health data processing
- `data_sharing_doctors` - Sharing with doctors
- `data_retention` - Data retention
- `marketing_communications` - Marketing (optional)

**API Endpoints:**
- `POST /api/lgpd/grant-consent` - Grant consent
- `POST /api/lgpd/revoke-consent` - Revoke consent
- `GET /api/lgpd/consents` - Get all user consents

**Usage:**
```javascript
const { grantConsent, revokeConsent, checkConsentStatus } = require('./services/consentService');

// Grant consent
await grantConsent({
  userId: user._id,
  consentType: 'sensitive_health_data',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  version: '1.0'
});

// Check consent
const status = await checkConsentStatus(userId, 'sensitive_health_data');
if (!status.hasConsent) {
  // Deny access
}
```

### 3. Audit Logging (Requirements 11.1-11.10)

**File:** `models/AuditLog.js`

**Logged Actions:**
- DATA_ACCESS, DATA_MODIFICATION, DATA_DELETION
- DATA_EXPORT
- CONSENT_GRANTED, CONSENT_REVOKED
- LOGIN, LOGOUT, FAILED_LOGIN
- PASSWORD_CHANGE
- SENSITIVE_DATA_ACCESS
- ACCOUNT_DELETION_REQUESTED, ACCOUNT_DELETION_EXECUTED, ACCOUNT_DELETION_CANCELLED

**Usage:**
```javascript
const AuditLog = require('./models/AuditLog');

await AuditLog.create({
  userId: req.user._id,
  action: 'SENSITIVE_DATA_ACCESS',
  resourceType: 'Prescription',
  resourceId: prescription._id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  details: { /* additional info */ }
});
```

### 4. Data Retention Policies (Requirement 8.9)

**File:** `services/dataRetentionService.js`

**Retention Periods:**
- Inactive accounts: 2 years warning, 30 days grace period
- Medical records: 20 years (CFM Resolution 1.821/2007)
- Audit logs: 5 years

**Functions:**
- `identifyInactiveAccounts()` - Find accounts inactive for 2+ years
- `notifyUserBeforeDeletion(user)` - Send deletion warning email
- `executeScheduledDeletions()` - Delete accounts after grace period
- `deleteUserAccount(userId, options)` - Delete/anonymize account
- `anonymizePatientData(patientId)` - Anonymize patient data
- `cancelScheduledDeletion(userId)` - Cancel deletion if user logs in
- `cleanupOldAuditLogs()` - Remove audit logs older than 5 years

**Scheduled Jobs:**
```javascript
// Run daily to check for inactive accounts
const cron = require('node-cron');
const { identifyInactiveAccounts, notifyUserBeforeDeletion, executeScheduledDeletions } = require('./services/dataRetentionService');

// Check for inactive accounts daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const inactiveUsers = await identifyInactiveAccounts();
  for (const user of inactiveUsers) {
    await notifyUserBeforeDeletion(user);
  }
});

// Execute scheduled deletions daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  await executeScheduledDeletions();
});
```

### 5. LGPD Service Layer (Requirements 8.1-8.5)

**File:** `services/lgpdService.js`

**Functions:**

#### Data Export (Art. 18, II & V)
```javascript
const data = await lgpdService.exportUserData(userId, { ipAddress, userAgent });
// Returns complete user data in JSON format
```

#### Account Deletion (Art. 18, VI)
```javascript
const result = await lgpdService.scheduleAccountDeletion(userId, { ipAddress, userAgent });
// Schedules deletion for 30 days from now
```

#### Data Processing Purposes (Art. 18, I)
```javascript
const purposes = lgpdService.getDataProcessingPurposes();
// Returns all data processing purposes and legal bases
```

#### Consent Revocation (Art. 18, IX)
```javascript
await lgpdService.revokeUserConsent(userId, consentType, { ipAddress, userAgent });
```

#### DPO Contact (Art. 41)
```javascript
const dpo = lgpdService.getDPOContact();
// Returns DPO contact information
```

### 6. LGPD API Routes

**File:** `routes/lgpd.js`

All routes are protected with authentication middleware.

| Method | Endpoint | Description | LGPD Article |
|--------|----------|-------------|--------------|
| GET | `/api/lgpd/my-data` | Export all user data | Art. 18, II |
| POST | `/api/lgpd/data-portability` | Download data as JSON | Art. 18, V |
| DELETE | `/api/lgpd/delete-account` | Schedule account deletion | Art. 18, VI |
| POST | `/api/lgpd/revoke-consent` | Revoke consent | Art. 18, IX |
| POST | `/api/lgpd/grant-consent` | Grant consent | Art. 8 |
| GET | `/api/lgpd/consents` | Get all consents | Art. 18, VIII |
| GET | `/api/lgpd/data-usage` | Get processing purposes | Art. 18, I |
| GET | `/api/lgpd/dpo-contact` | Get DPO information | Art. 41 |

## Environment Variables

Add these to your `.env` file:

```env
# Encryption
ENCRYPTION_KEY=<64-character-hex-string>
PSEUDONYM_SALT=<random-string>

# DPO Information
DPO_NAME=Nome do Encarregado
DPO_EMAIL=dpo@clinicaserenitas.com.br
DPO_PHONE=+55 11 1234-5678
DPO_ADDRESS=Endereço da clínica
```

## User Model Updates

The User model now includes deletion-related fields:

```javascript
{
  lastLoginAt: Date,
  deletionScheduled: Boolean,
  deletionDate: Date,
  deletionRequestedAt: Date,
  deletionNotifiedAt: Date,
  deletedAt: Date,
  deletionReason: String
}
```

## Testing LGPD Endpoints

### 1. Grant Consent
```bash
curl -X POST http://localhost:5000/api/lgpd/grant-consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"consentType": "sensitive_health_data", "version": "1.0"}'
```

### 2. Export Data
```bash
curl -X GET http://localhost:5000/api/lgpd/my-data \
  -H "Authorization: Bearer <token>"
```

### 3. Schedule Deletion
```bash
curl -X DELETE http://localhost:5000/api/lgpd/delete-account \
  -H "Authorization: Bearer <token>"
```

### 4. Revoke Consent
```bash
curl -X POST http://localhost:5000/api/lgpd/revoke-consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"consentType": "marketing_communications"}'
```

### 5. Get DPO Contact
```bash
curl -X GET http://localhost:5000/api/lgpd/dpo-contact
```

## Compliance Checklist

- [x] Data encryption at rest (AES-256-GCM)
- [x] Explicit consent management
- [x] Consent revocation mechanism
- [x] Data export (portability)
- [x] Account deletion with grace period
- [x] Audit logging for all data access
- [x] Data retention policies
- [x] DPO contact information
- [x] Data processing purposes documentation
- [ ] Privacy policy in Portuguese (frontend)
- [ ] Consent forms on registration (frontend)
- [ ] Email service integration for notifications
- [ ] Scheduled jobs for data retention
- [ ] HTTPS enforcement in production
- [ ] Data breach response plan

## Next Steps

1. **Email Integration**: Integrate with an email service (SendGrid, AWS SES) in `utils/email.js`

2. **Scheduled Jobs**: Set up cron jobs for:
   - Daily inactive account checks
   - Daily scheduled deletion execution
   - Weekly audit log cleanup

3. **Frontend Integration**: 
   - Add consent checkboxes to registration
   - Create LGPD settings page
   - Display privacy policy
   - Show DPO contact

4. **Production Setup**:
   - Generate secure encryption key
   - Configure DPO information
   - Set up monitoring for LGPD endpoints
   - Test data export/deletion flows

## Legal References

- [LGPD - Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD - Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/pt-br)
- [CFM Resolution 1.821/2007 - Medical Records](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)

## Support

For questions about LGPD compliance, contact the DPO at the configured email address.
