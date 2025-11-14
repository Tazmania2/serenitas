# LGPD Quick Reference Card

## 🚀 Quick Setup

### 1. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to .env
```env
ENCRYPTION_KEY=<generated-key-from-step-1>
PSEUDONYM_SALT=<any-random-string>
DPO_EMAIL=dpo@clinicaserenitas.com.br
DPO_NAME=Nome do Encarregado
DPO_PHONE=+55 11 1234-5678
DPO_ADDRESS=Endereço da clínica
```

## 📋 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/lgpd/my-data` | GET | ✅ | Export all user data |
| `/api/lgpd/data-portability` | POST | ✅ | Download data as JSON |
| `/api/lgpd/delete-account` | DELETE | ✅ | Schedule deletion (30 days) |
| `/api/lgpd/grant-consent` | POST | ✅ | Grant consent |
| `/api/lgpd/revoke-consent` | POST | ✅ | Revoke consent |
| `/api/lgpd/consents` | GET | ✅ | View consent history |
| `/api/lgpd/data-usage` | GET | ❌ | View processing purposes |
| `/api/lgpd/dpo-contact` | GET | ❌ | Get DPO contact |

## 🔐 Encryption Usage

```javascript
const { encrypt, decrypt } = require('./utils/encryption');

// Encrypt
const encrypted = encrypt('sensitive data');
// { encrypted: '...', iv: '...', authTag: '...' }

// Decrypt
const plaintext = decrypt(encrypted);
```

## ✅ Consent Types

- `data_processing` - General data processing
- `sensitive_health_data` - Health data (required for patients)
- `data_sharing_doctors` - Sharing with doctors
- `data_retention` - Data retention
- `marketing_communications` - Marketing (optional)

## 📝 Audit Logging

```javascript
const AuditLog = require('./models/AuditLog');

await AuditLog.create({
  userId: req.user._id,
  action: 'SENSITIVE_DATA_ACCESS',
  resourceType: 'Prescription',
  resourceId: prescription._id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

## ⏰ Data Retention

- **Inactive accounts**: 2 years → warning → 30 days grace → deletion
- **Medical records**: 20 years (preserved even after account deletion)
- **Audit logs**: 5 years

## 🔄 Scheduled Jobs (TODO)

```javascript
const cron = require('node-cron');
const { identifyInactiveAccounts, notifyUserBeforeDeletion, executeScheduledDeletions } = require('./services/dataRetentionService');

// Daily at 2 AM - Check inactive accounts
cron.schedule('0 2 * * *', async () => {
  const users = await identifyInactiveAccounts();
  for (const user of users) {
    await notifyUserBeforeDeletion(user);
  }
});

// Daily at 3 AM - Execute deletions
cron.schedule('0 3 * * *', async () => {
  await executeScheduledDeletions();
});
```

## 🧪 Testing Commands

```bash
# Export data
curl -X GET http://localhost:5000/api/lgpd/my-data \
  -H "Authorization: Bearer <token>"

# Schedule deletion
curl -X DELETE http://localhost:5000/api/lgpd/delete-account \
  -H "Authorization: Bearer <token>"

# Grant consent
curl -X POST http://localhost:5000/api/lgpd/grant-consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"consentType": "sensitive_health_data"}'

# Get DPO contact
curl -X GET http://localhost:5000/api/lgpd/dpo-contact
```

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `routes/lgpd.js` | LGPD API endpoints |
| `services/lgpdService.js` | LGPD business logic |
| `services/consentService.js` | Consent management |
| `services/dataRetentionService.js` | Data retention & deletion |
| `utils/encryption.js` | Data encryption utilities |
| `models/Consent.js` | Consent data model |
| `models/AuditLog.js` | Audit log model |

## ⚠️ Important Notes

1. **Never log sensitive data** - Use pseudonymization
2. **Always audit sensitive operations** - Create audit logs
3. **Preserve medical records** - 20 years minimum (CFM)
4. **Grace period** - 30 days for account deletion
5. **Explicit consent** - Required for health data processing

## 🔗 Legal References

- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD](https://www.gov.br/anpd/pt-br)
- [CFM 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)

## 📞 Support

For LGPD compliance questions, contact the DPO at the configured email address.
