# LGPD Compliance Documentation - Clínica Serenitas

## Overview

This document outlines how the Clínica Serenitas system complies with Brazil's **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)** and healthcare confidentiality regulations.

## Legal Framework

### Applicable Laws

1. **LGPD (Lei nº 13.709/2018)** - Brazilian Data Protection Law
2. **Código de Ética Médica (CFM Resolution 2.217/2018)** - Medical Ethics Code
3. **CFM Resolution 1.821/2007** - Medical Records Retention
4. **Código Penal Brasileiro (Article 154)** - Professional Secrecy
5. **Constituição Federal (Article 5, X)** - Privacy and Intimacy

### Regulatory Authority

**ANPD (Autoridade Nacional de Proteção de Dados)**
- Website: https://www.gov.br/anpd/pt-br
- Responsible for LGPD enforcement and guidance

---

## Data Classification

### Sensitive Personal Data (Dados Pessoais Sensíveis)

Under LGPD Article 5, II, health data is classified as sensitive:

**Health Data in System:**
- Medical diagnoses
- Prescriptions and medications
- Exam results and files
- Mental health assessments
- Mood tracking data
- Doctor's clinical notes
- Treatment history
- Symptoms and complaints
- Allergies and medical conditions

**Legal Basis:** LGPD Article 11
- Explicit consent (primary)
- Healthcare protection (tutela da saúde)
- Legal obligation

### Regular Personal Data (Dados Pessoais)

**Identification Data:**
- Name
- Email
- Phone number
- CPF (Brazilian tax ID)
- Date of birth

**Contact Data:**
- Emergency contact information
- Address

**Administrative Data:**
- Appointment schedules
- Insurance information
- User account data

**Legal Basis:** LGPD Article 7
- Consent
- Contract execution
- Legal obligation


## Data Processing Purposes

### Purpose Documentation

All data processing has documented purposes as required by LGPD Article 6, I:

| Data Type | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| User credentials | Authentication and access control | Contract execution | While account active |
| Patient health data | Mental health treatment and care | Healthcare protection + Consent | 20 years (CFM) |
| Prescriptions | Medication management | Healthcare protection | 20 years (CFM) |
| Exam results | Diagnosis and treatment | Healthcare protection | 20 years (CFM) |
| Mood entries | Treatment monitoring | Healthcare protection + Consent | 20 years (CFM) |
| Doctor notes | Clinical documentation | Healthcare protection | 20 years (CFM) |
| Appointments | Schedule management | Contract execution | 20 years (CFM) |
| Audit logs | Security and compliance | Legal obligation | 5 years |
| Consent records | LGPD compliance | Legal obligation | Permanent |

### Purpose Limitation

Data is used **only** for documented purposes. Prohibited uses:
- Marketing without explicit consent
- Profiling for discrimination
- Sale or transfer to third parties
- Purposes unrelated to healthcare

---

## Consent Management

### Explicit Consent Requirements

LGPD Article 8 requires consent to be:
- **Free** (livre): No coercion
- **Informed** (informado): Clear explanation
- **Explicit** (inequívoco): Affirmative action required
- **Specific** (finalidade específica): For defined purposes

### Consent Types

The system manages these consent types:

1. **data_processing** - General data processing
2. **sensitive_health_data** - Health data processing
3. **data_sharing_doctors** - Sharing with assigned doctors
4. **data_retention** - Long-term data retention
5. **marketing_communications** - Marketing (optional)

### Consent Implementation

**Database Table:** `consents`

```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(50) NOT NULL,
  language VARCHAR(10) DEFAULT 'pt-BR'
);
```

**API Endpoints:**
- `POST /api/lgpd/grant-consent` - Grant consent
- `POST /api/lgpd/revoke-consent` - Revoke consent
- `GET /api/lgpd/my-consents` - View consent history

### Consent Flow

1. **Registration:**
   - User presented with consent terms in Portuguese
   - Checkboxes for each consent type
   - User must actively check boxes
   - IP address and user agent recorded
   - Timestamp recorded

2. **Ongoing:**
   - Users can view consent history
   - Users can revoke consent at any time
   - System logs all consent changes

3. **Revocation:**
   - User requests revocation
   - System marks consent as revoked
   - Revocation timestamp recorded
   - Data processing stops (except legal obligations)

---

## Data Subject Rights (Direitos do Titular)

### LGPD Article 18 Rights

The system implements all data subject rights:

#### 1. Right to Confirmation and Access (Art. 18, I, II)

**Endpoint:** `GET /api/lgpd/my-data`

Users can:
- Confirm data processing
- Access all personal data
- View data in structured format

**Implementation:**
```javascript
async function getMyData(userId) {
  return {
    personalInfo: await getUserData(userId),
    patientProfile: await getPatientData(userId),
    appointments: await getAppointments(userId),
    prescriptions: await getPrescriptions(userId),
    exams: await getExams(userId),
    moodEntries: await getMoodEntries(userId),
    consents: await getConsents(userId),
    auditLogs: await getAuditLogs(userId)
  };
}
```

#### 2. Right to Correction (Art. 18, III)

**Endpoint:** `PUT /api/users/:id`

Users can:
- Update personal information
- Correct inaccurate data
- Request corrections from admin

#### 3. Right to Anonymization, Blocking, or Deletion (Art. 18, IV)

**Endpoint:** `DELETE /api/lgpd/delete-account`

Users can:
- Request account deletion
- 30-day grace period to cancel
- Medical records preserved for 20 years (CFM requirement)
- Personal identifiers anonymized

**Implementation:**
```javascript
async function deleteAccount(userId) {
  // Schedule deletion
  await scheduleAccountDeletion(userId, 30); // 30 days
  
  // After grace period:
  // 1. Anonymize personal data
  await anonymizePersonalData(userId);
  
  // 2. Preserve medical records (CFM requirement)
  await preserveMedicalRecords(userId);
  
  // 3. Delete account
  await deleteUserAccount(userId);
}
```

#### 4. Right to Data Portability (Art. 18, V)

**Endpoint:** `POST /api/lgpd/data-portability`

Users can:
- Export all data in JSON format
- Receive structured, machine-readable data
- Transfer data to another service

**Export Format:**
```json
{
  "exportDate": "2024-01-15T10:00:00Z",
  "format": "JSON",
  "version": "1.0",
  "data": {
    "personalInfo": {...},
    "healthData": {...},
    "appointments": [...],
    "prescriptions": [...]
  }
}
```

#### 5. Right to Information (Art. 18, VI, VII, VIII)

**Endpoint:** `GET /api/lgpd/data-usage`

Users can view:
- Data processing purposes
- Entities with data access
- Retention periods
- Security measures

#### 6. Right to Revoke Consent (Art. 18, IX)

**Endpoint:** `POST /api/lgpd/revoke-consent`

Users can:
- Revoke consent at any time
- View consequences of revocation
- Maintain essential services (healthcare)

#### 7. Right to Object (Art. 18, § 2º)

Users can:
- Object to processing
- Request review of automated decisions
- Challenge data accuracy

---

## Audit Logging

### LGPD Article 37 Requirements

The system maintains comprehensive audit logs:

**Logged Events:**
- All logins and logouts
- Access to sensitive health data
- Data modifications
- Data deletions
- Data exports
- Consent grants and revocations
- Failed authentication attempts
- Password changes
- Administrative actions

**Log Structure:**
```javascript
{
  id: "uuid",
  userId: "uuid",
  action: "SENSITIVE_DATA_ACCESS",
  resourceType: "Prescription",
  resourceId: "uuid",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-01-15T10:30:00Z",
  details: {
    // Additional context
  }
}
```

**Retention:** 5 years minimum

**Access:** Admin only

**API Endpoint:** `GET /api/admin/audit-logs`

### Audit Log Analysis

Regular reviews for:
- Unauthorized access attempts
- Unusual access patterns
- Compliance verification
- Security incidents
- ANPD requests

---

## Data Security Measures

### LGPD Article 46 Requirements

#### Technical Measures

**1. Encryption**
- **At Rest:** AES-256-GCM for sensitive fields
- **In Transit:** TLS 1.2+ for all connections
- **Database:** Supabase encryption at rest

**2. Access Control**
- **Authentication:** JWT tokens (7-day expiration)
- **Authorization:** Role-based access control (RBAC)
- **Database:** Row-Level Security (RLS) policies
- **Password:** Bcrypt hashing (cost factor 12)

**3. Network Security**
- **HTTPS:** Enforced in production
- **Rate Limiting:** 100 req/15min general, 5 req/15min auth
- **Firewall:** Supabase network isolation
- **DDoS Protection:** Cloudflare

**4. Application Security**
- **Input Validation:** All inputs validated and sanitized
- **SQL Injection:** Parameterized queries
- **XSS Protection:** Content Security Policy headers
- **CSRF Protection:** Token-based

#### Organizational Measures

**1. Access Management**
- Principle of least privilege
- Regular access reviews
- Immediate revocation on termination
- Multi-factor authentication for admins

**2. Training**
- LGPD awareness training
- Security best practices
- Incident response procedures
- Medical confidentiality

**3. Policies and Procedures**
- Data protection policy
- Incident response plan
- Backup and recovery procedures
- Access control policy

**4. Vendor Management**
- Supabase: GDPR compliant (equivalent to LGPD)
- Data processing agreements
- Regular security assessments

---

## Data Retention and Deletion

### Retention Policies

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Medical records | 20 years minimum | CFM Resolution 1.821/2007 |
| Audit logs | 5 years | LGPD compliance |
| Personal data | While relationship exists | LGPD Article 16 |
| Inactive accounts | 2 years | LGPD Article 16 |
| Deleted accounts | 30-day grace period | User rights |
| Consent records | Permanent | Legal obligation |

### Automatic Cleanup Process

**1. Identify Inactive Accounts**
```sql
SELECT id, name, email, last_login_at
FROM users
WHERE last_login_at < NOW() - INTERVAL '2 years'
  AND deletion_scheduled = FALSE;
```

**2. Notify Users**
- Email notification 30 days before deletion
- Opportunity to reactivate account
- Explanation of deletion process

**3. Schedule Deletion**
```sql
UPDATE users
SET deletion_scheduled = TRUE,
    deletion_date = NOW() + INTERVAL '30 days'
WHERE last_login_at < NOW() - INTERVAL '2 years';
```

**4. Execute Deletion**
- Anonymize personal identifiers
- Preserve medical records (20 years)
- Delete account and non-medical data
- Log deletion in audit trail

### Medical Records Exception

Per CFM Resolution 1.821/2007, medical records must be retained for **minimum 20 years** after last patient contact, even if account is deleted.

**Preserved Data:**
- Prescriptions
- Exam results
- Doctor notes
- Diagnoses
- Treatment history

**Anonymized:**
- Name → "Paciente [ID]"
- Email → Removed
- Phone → Removed
- CPF → Removed
- Address → Removed


## Data Protection Officer (DPO)

### LGPD Article 41 Requirements

**Role:** Encarregado de Proteção de Dados

**Responsibilities:**
- Accept communications from data subjects
- Accept communications from ANPD
- Provide guidance on LGPD compliance
- Oversee data protection practices
- Serve as contact point for ANPD

**Contact Information:**
- **Name:** [DPO Name]
- **Email:** dpo@clinicaserenitas.com.br
- **Phone:** (XX) XXXX-XXXX
- **Address:** [Clinic Address]

**API Endpoint:** `GET /api/dpo-contact`

**Availability:**
- Contact information displayed in:
  - Privacy policy
  - User settings
  - Registration flow
  - Footer of all pages

---

## Incident Response Plan

### LGPD Article 48 Requirements

Data breaches must be reported to ANPD and affected users.

### Incident Classification

**High Severity:**
- Unauthorized access to sensitive health data
- Data exfiltration
- Ransomware attack
- Database compromise

**Medium Severity:**
- Unauthorized access attempt (blocked)
- Phishing attack
- Malware detection
- DDoS attack

**Low Severity:**
- Failed login attempts
- Minor configuration issues
- Non-sensitive data exposure

### Response Procedure

#### 1. Detection and Identification (0-1 hour)

**Actions:**
- Identify incident type and scope
- Assess affected systems and data
- Determine severity level
- Activate incident response team

**Team:**
- DPO (Data Protection Officer)
- System Administrator
- Security Officer
- Legal Counsel
- Management

#### 2. Containment (1-4 hours)

**Actions:**
- Isolate affected systems
- Block unauthorized access
- Preserve evidence
- Document all actions
- Prevent further damage

**Technical Steps:**
```bash
# Block suspicious IP
iptables -A INPUT -s <IP_ADDRESS> -j DROP

# Disable compromised account
UPDATE users SET active = FALSE WHERE id = '<USER_ID>';

# Rotate credentials
# Change database passwords
# Regenerate API keys
# Invalidate JWT tokens
```

#### 3. Investigation (4-24 hours)

**Actions:**
- Analyze logs and evidence
- Determine root cause
- Identify affected data
- Assess impact on data subjects
- Document findings

**Analysis:**
```sql
-- Review audit logs
SELECT * FROM audit_logs
WHERE timestamp BETWEEN '<START>' AND '<END>'
ORDER BY timestamp;

-- Identify affected users
SELECT DISTINCT user_id FROM audit_logs
WHERE action = 'UNAUTHORIZED_ACCESS'
  AND timestamp BETWEEN '<START>' AND '<END>';
```

#### 4. Notification (24-72 hours)

**ANPD Notification (if high risk):**
- Within reasonable timeframe
- Include:
  - Nature of incident
  - Affected data categories
  - Number of affected individuals
  - Measures taken
  - Contact information

**User Notification:**
- Email to affected users
- Include:
  - What happened
  - What data was affected
  - What we're doing
  - What they should do
  - Contact information

**Template:**
```
Assunto: Notificação de Incidente de Segurança

Prezado(a) [Nome],

Informamos que em [data], identificamos um incidente de segurança 
que pode ter afetado seus dados pessoais.

Dados Afetados:
- [Lista de dados]

Medidas Tomadas:
- [Ações de contenção]
- [Ações corretivas]

Recomendações:
- [Ações que o usuário deve tomar]

Para mais informações, entre em contato:
- Email: dpo@clinicaserenitas.com.br
- Telefone: (XX) XXXX-XXXX

Atenciosamente,
Clínica Serenitas
```

#### 5. Recovery (1-7 days)

**Actions:**
- Restore systems from backup
- Implement security patches
- Verify data integrity
- Resume normal operations
- Monitor for recurrence

#### 6. Post-Incident Review (7-14 days)

**Actions:**
- Document lessons learned
- Update security measures
- Improve detection capabilities
- Train staff on prevention
- Update incident response plan

**Report Contents:**
- Timeline of events
- Root cause analysis
- Impact assessment
- Response effectiveness
- Recommendations

### Incident Log

All incidents are logged:

```javascript
{
  incidentId: "uuid",
  type: "unauthorized_access",
  severity: "high",
  detectedAt: "2024-01-15T10:00:00Z",
  containedAt: "2024-01-15T11:00:00Z",
  resolvedAt: "2024-01-15T14:00:00Z",
  affectedUsers: 150,
  affectedData: ["prescriptions", "exams"],
  anpdNotified: true,
  usersNotified: true,
  rootCause: "SQL injection vulnerability",
  remediation: "Patched vulnerability, rotated credentials"
}
```

---

## Privacy Policy

### Required Content (LGPD Article 9)

The privacy policy must include:

1. **Data Controller Information**
   - Clínica Serenitas
   - CNPJ: [Number]
   - Address: [Address]
   - Contact: contato@clinicaserenitas.com.br

2. **DPO Contact**
   - Email: dpo@clinicaserenitas.com.br
   - Phone: (XX) XXXX-XXXX

3. **Data Processing Purposes**
   - Healthcare services
   - Appointment management
   - Treatment monitoring
   - Legal compliance

4. **Legal Basis**
   - Consent (explicit for sensitive data)
   - Healthcare protection
   - Contract execution
   - Legal obligation

5. **Data Sharing**
   - Assigned doctors
   - Healthcare professionals
   - No third-party sharing without consent

6. **Data Retention**
   - Medical records: 20 years
   - Personal data: While relationship exists
   - Audit logs: 5 years

7. **Data Subject Rights**
   - Access
   - Correction
   - Deletion
   - Portability
   - Revoke consent
   - Object to processing

8. **Security Measures**
   - Encryption
   - Access control
   - Audit logging
   - Regular security assessments

9. **International Transfers**
   - Data stored in Brazil (Supabase São Paulo region)
   - No international transfers

10. **Updates**
    - Users notified of policy changes
    - Consent required for material changes

**Location:** `/privacy-policy` page in application

**Language:** Portuguese (pt-BR)

**Accessibility:** Available before registration

---

## Compliance Checklist

### Implementation Status

- [x] Privacy policy in Portuguese
- [x] Explicit consent mechanism
- [x] Data subject rights endpoints
- [x] Data portability functionality
- [x] Account deletion with grace period
- [x] Consent revocation mechanism
- [x] DPO contact information displayed
- [x] Audit logs for all data access
- [x] Data retention policies
- [x] Automatic data cleanup
- [x] Encryption at rest and in transit
- [x] Row-Level Security (RLS)
- [x] Role-based access control
- [x] Incident response plan
- [x] Data processing records
- [x] Security measures documented
- [x] Medical records retention (20 years)
- [x] Consent management system
- [x] User notification system
- [x] ANPD communication procedures

### Ongoing Compliance

**Monthly:**
- Review audit logs
- Check for inactive accounts
- Verify backup integrity
- Update security patches

**Quarterly:**
- Security assessment
- Access control review
- Policy review
- Staff training

**Annually:**
- LGPD compliance audit
- Privacy policy review
- Incident response drill
- Data protection impact assessment (DPIA)

---

## Data Protection Impact Assessment (DPIA)

### LGPD Article 38 Requirements

DPIA required for high-risk processing:

**Assessment Areas:**

1. **Data Processing Description**
   - Types of data collected
   - Processing purposes
   - Data flow mapping
   - Third-party involvement

2. **Necessity and Proportionality**
   - Justification for data collection
   - Minimum data principle
   - Purpose limitation
   - Storage limitation

3. **Risk Assessment**
   - Identify risks to data subjects
   - Likelihood and severity
   - Impact on rights and freedoms
   - Vulnerable populations

4. **Mitigation Measures**
   - Technical safeguards
   - Organizational measures
   - Residual risk assessment
   - Monitoring and review

**DPIA Triggers:**
- New data processing activities
- Technology changes
- Increased data collection
- New data sharing arrangements
- Regulatory changes

**Review Frequency:** Annually or when significant changes occur

---

## International Data Transfers

### LGPD Chapter V Requirements

**Current Status:** No international transfers

**Data Location:**
- Database: Supabase (São Paulo, Brazil)
- Application: Vercel (São Paulo, Brazil)
- Backups: Brazil region only

**If International Transfer Needed:**

1. **Adequacy Decision**
   - Transfer to countries with adequate protection
   - ANPD approval required

2. **Standard Contractual Clauses**
   - Use ANPD-approved clauses
   - Ensure equivalent protection

3. **Specific Guarantees**
   - Binding corporate rules
   - Certification mechanisms
   - Codes of conduct

4. **User Consent**
   - Explicit consent for transfers
   - Information about destination
   - Risks explained

---

## Training and Awareness

### Staff Training Requirements

**All Staff:**
- LGPD basics
- Data protection principles
- User rights
- Incident reporting

**Healthcare Professionals:**
- Medical confidentiality
- Sensitive data handling
- Consent management
- Patient rights

**IT Staff:**
- Security best practices
- Incident response
- Access control
- Audit logging

**Administrators:**
- Full LGPD compliance
- DPO responsibilities
- ANPD communication
- Risk management

**Training Schedule:**
- New hire: Within first week
- Annual refresher: All staff
- Ad-hoc: After incidents or changes

---

## Vendor Management

### Third-Party Processors

**Supabase (Database and Storage):**
- **Role:** Data processor
- **Location:** São Paulo, Brazil
- **Compliance:** GDPR compliant (equivalent to LGPD)
- **Agreement:** Data Processing Agreement (DPA)
- **Security:** ISO 27001, SOC 2 Type II
- **Audit:** Annual security assessment

**Vercel (Application Hosting):**
- **Role:** Infrastructure provider
- **Location:** São Paulo, Brazil
- **Compliance:** GDPR compliant
- **Agreement:** Terms of Service
- **Security:** SOC 2 Type II

**Requirements for New Vendors:**
- LGPD compliance verification
- Data Processing Agreement
- Security assessment
- Regular audits
- Incident notification procedures

---

## Contact Information

### Data Protection

**DPO (Encarregado de Proteção de Dados):**
- Email: dpo@clinicaserenitas.com.br
- Phone: (XX) XXXX-XXXX

**ANPD (Autoridade Nacional de Proteção de Dados):**
- Website: https://www.gov.br/anpd/pt-br
- Email: comunicacao@anpd.gov.br

**Legal Counsel:**
- Email: juridico@clinicaserenitas.com.br

---

## References

### Legal Documents

- [LGPD - Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD Website](https://www.gov.br/anpd/pt-br)
- [CFM Resolution 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
- [CFM Resolution 2.217/2018 - Código de Ética Médica](https://portal.cfm.org.br/etica-medica/)

### Guidance Documents

- ANPD Guia Orientativo
- ANPD Relatório de Impacto
- CFM Orientações sobre Prontuário Médico

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Next Review:** January 2025  
**Owner:** Data Protection Officer
