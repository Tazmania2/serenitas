# Steering Rules - Clínica Serenitas

This directory contains steering rules that guide AI assistance when working on the Serenitas mental health clinic management system.

## Overview

Serenitas is a **medical application** for mental health clinic management in **Brazil**, handling sensitive patient data and requiring strict compliance with healthcare regulations.

## Steering Documents

### Core Project Information

1. **product.md** - Product vision, features, and user roles
   - PWA for mobile (Android/iOS)
   - 4 access levels: Patient, Doctor, Secretary, Admin
   - Core features per role

2. **tech.md** - Technology stack and development commands
   - Node.js + Express backend
   - MongoDB (considering Supabase migration)
   - JWT authentication
   - Common commands and setup

3. **structure.md** - Project organization and code patterns
   - Directory structure
   - File naming conventions
   - API endpoint structure
   - Response format standards

### Code Quality & Best Practices

4. **code-quality.md** - SOLID principles and architecture
   - Single Responsibility Principle
   - When to extract services vs. keep simple
   - Avoiding overdesign
   - Recommended architecture layers

5. **testing.md** - Testing standards and requirements
   - AAA pattern (Arrange, Act, Assert)
   - 5+ test scenarios per function
   - Coverage goals (80% minimum)
   - Test naming conventions

6. **logging-monitoring.md** - Logging and observability
   - Structured logging format
   - Required logging points
   - Metrics and counters
   - No hardcoded values
   - JSDoc documentation standards

### Security & Compliance

7. **security.md** - OWASP Top 10 and security best practices
   - NoSQL injection prevention
   - XSS protection
   - JWT best practices
   - Role-based access control (RBAC)
   - Rate limiting
   - Password security (bcrypt, cost factor 12)

8. **compliance-lgpd.md** - LGPD and healthcare compliance ⚕️🇧🇷
   - **CRITICAL**: Brazilian data protection law (LGPD)
   - Medical confidentiality (Sigilo Médico)
   - Explicit consent management
   - Data subject rights (access, deletion, portability)
   - Audit trail requirements
   - Data retention policies (medical records: 20 years)
   - Incident response procedures

9. **localization.md** - Language and Brazilian standards 🇧🇷
   - Portuguese (pt-BR) for all user-facing content
   - Brazilian date format (DD/MM/YYYY)
   - Brazilian phone format
   - CPF validation and formatting
   - Currency (BRL - Real)
   - Medical terminology in Portuguese
   - Timezone (America/Sao_Paulo)

## Key Principles

### 1. Patient Privacy First
- All health data is **sensitive personal data** under LGPD
- Implement explicit consent mechanisms
- Maintain audit logs for all data access
- Encrypt data at rest and in transit
- Never expose patient data without authorization

### 2. Medical Confidentiality (Sigilo Médico)
- Doctors can only access assigned patients
- Strict role-based access control
- Log all access to sensitive health data
- Secure doctor-patient communication

### 3. Code Quality
- Follow SOLID principles pragmatically
- Don't overengineer simple solutions
- Write comprehensive tests (80% coverage)
- Use structured logging
- Document business rules and complex logic

### 4. Security
- Validate and sanitize all inputs
- Use bcrypt for passwords (cost factor 12)
- Implement rate limiting
- Set security headers (helmet)
- Never expose sensitive data in logs or errors

### 5. Localization
- All user-facing content in Portuguese (pt-BR)
- Use Brazilian formats (dates, phone, currency)
- Follow Brazilian medical terminology
- Validate CPF when required

## Quick Reference

### Required Environment Variables
```
MONGODB_URI=mongodb://localhost:27017/serenitas
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
DPO_EMAIL=dpo@clinicaserenitas.com.br
ENCRYPTION_KEY=your_encryption_key_here
```

### Common Commands
```bash
cd serenitas_backend
npm install
npm run dev          # Development mode
npm start            # Production mode
npm test             # Run tests
npm run test:coverage # Test coverage
```

### API Response Format
```javascript
{
  success: boolean,
  data: object | null,
  message: string,      // In Portuguese for users
  error: string | null  // In Portuguese for users
}
```

### Role-Based Access
- **Patient**: Own data only
- **Doctor**: Assigned patients only
- **Secretary**: Administrative access
- **Admin**: Full system access

## Compliance Checklist

Before any deployment:

- [ ] All user-facing text is in Portuguese
- [ ] Privacy policy in Portuguese is available
- [ ] Explicit consent mechanism implemented
- [ ] Data subject rights endpoints working
- [ ] Audit logs for sensitive data access
- [ ] Encryption at rest and in transit
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Password hashing with bcrypt (cost 12)
- [ ] Role-based access control enforced
- [ ] DPO contact information displayed
- [ ] Data retention policies implemented
- [ ] Incident response plan documented

## Important Notes

⚠️ **This is a medical application handling sensitive health data**

- Always prioritize patient privacy and data protection
- Follow LGPD requirements strictly
- Maintain medical confidentiality (Sigilo Médico)
- Keep audit trails for compliance
- Never compromise on security

🇧🇷 **Brazilian Context**

- Primary language: Portuguese (pt-BR)
- Compliance: LGPD + CFM regulations
- Client: Clínica Serenitas
- Medical records retention: 20 years minimum

## Getting Help

When working with AI assistance:
- These steering rules are automatically applied
- Reference specific steering files for detailed guidance
- Ask for clarification on LGPD or medical compliance requirements
- Request code reviews for security-sensitive changes

## References

- [LGPD - Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD - Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/pt-br)
- [CFM - Código de Ética Médica](https://portal.cfm.org.br/etica-medica/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
