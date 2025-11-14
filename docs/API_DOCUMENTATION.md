# API Documentation - Clínica Serenitas

## Overview

Base URL: `https://api.serenitas.app`

API Version: `v1`

All endpoints require HTTPS in production.

## Authentication

### Authentication Flow

1. User registers or logs in
2. Server returns JWT token
3. Client includes token in `Authorization` header for subsequent requests
4. Token expires after 7 days

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Response Format

All API responses follow this structure:

```json
{
  "success": boolean,
  "data": object | array | null,
  "message": string,
  "error": string | null
}
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Token expired |
| AUTH_003 | Invalid token |
| AUTH_004 | Unauthorized |
| AUTHZ_001 | Forbidden |
| AUTHZ_002 | Insufficient permissions |
| AUTHZ_003 | Doctor not assigned to patient |
| VAL_001 | Required field missing |
| VAL_002 | Invalid format |
| VAL_003 | Invalid CPF |
| VAL_004 | File too large |
| VAL_005 | Invalid file type |
| BUS_001 | Appointment conflict |
| BUS_002 | Prescription expired |
| BUS_003 | Patient not found |
| LGPD_001 | Consent required |
| LGPD_002 | Data retention violation |
| SYS_001 | Database error |
| SYS_002 | Storage error |
| SYS_003 | Internal server error |

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP


## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SecurePass123!",
  "phone": "(11) 98765-4321",
  "role": "patient"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "patient"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Usuário registrado com sucesso"
}
```

**Errors:**
- 400: Email já cadastrado
- 400: Senha muito fraca
- 400: Dados inválidos

---

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "joao@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "patient"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login realizado com sucesso"
}
```

**Errors:**
- 401: Credenciais inválidas
- 429: Muitas tentativas de login

---

### GET /api/auth/profile

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "(11) 98765-4321",
    "role": "patient",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- 401: Token inválido ou expirado

---

### POST /api/auth/change-password

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Senha alterada com sucesso"
}
```

**Errors:**
- 400: Senha antiga incorreta
- 400: Nova senha muito fraca
- 401: Não autenticado


## Patient Endpoints

### GET /api/patients

Get list of patients (admin/secretary/doctor only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by name or CPF

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "uuid",
        "userId": "uuid",
        "name": "João Silva",
        "email": "joao@example.com",
        "phone": "(11) 98765-4321",
        "dateOfBirth": "1990-05-15",
        "doctorId": "uuid",
        "doctorName": "Dr. Maria Santos"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

---

### GET /api/patients/:id

Get patient details.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "(11) 98765-4321",
    "dateOfBirth": "1990-05-15",
    "cpf": "123.456.789-00",
    "bloodType": "O+",
    "height": 175,
    "weight": 70,
    "emergencyContact": {
      "name": "Maria Silva",
      "phone": "(11) 98765-1234",
      "relationship": "Esposa"
    },
    "medicalHistory": ["Ansiedade", "Depressão"],
    "allergies": ["Penicilina"],
    "healthStatus": "Em tratamento",
    "doctorId": "uuid",
    "doctorName": "Dr. Maria Santos"
  }
}
```

**Errors:**
- 403: Acesso negado (doctor not assigned)
- 404: Paciente não encontrado

---

### PUT /api/patients/:id

Update patient information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "phone": "(11) 98765-4321",
  "emergencyContact": {
    "name": "Maria Silva",
    "phone": "(11) 98765-1234",
    "relationship": "Esposa"
  },
  "healthStatus": "Melhorando"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "(11) 98765-4321",
    "healthStatus": "Melhorando"
  },
  "message": "Perfil atualizado com sucesso"
}
```


## Prescription Endpoints

### GET /api/prescriptions

Get prescriptions (filtered by role).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientId` (optional): Filter by patient
- `status` (optional): active, completed, discontinued
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "patientName": "João Silva",
      "doctorId": "uuid",
      "doctorName": "Dr. Maria Santos",
      "prescriptionDate": "2024-01-15",
      "durationDays": 30,
      "status": "active",
      "instructions": "Tomar com alimentos",
      "medications": [
        {
          "id": "uuid",
          "name": "Sertralina",
          "dosage": "50mg",
          "frequency": "1x ao dia",
          "quantity": 30,
          "instructions": "Tomar pela manhã"
        }
      ]
    }
  ]
}
```

---

### GET /api/prescriptions/:id

Get prescription details.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "patientName": "João Silva",
    "doctorId": "uuid",
    "doctorName": "Dr. Maria Santos",
    "prescriptionDate": "2024-01-15",
    "durationDays": 30,
    "status": "active",
    "instructions": "Tomar com alimentos",
    "doctorNotes": "Paciente respondendo bem ao tratamento",
    "medications": [
      {
        "id": "uuid",
        "name": "Sertralina",
        "dosage": "50mg",
        "frequency": "1x ao dia",
        "quantity": 30,
        "instructions": "Tomar pela manhã"
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### POST /api/prescriptions

Create new prescription (doctor only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "patientId": "uuid",
  "durationDays": 30,
  "instructions": "Tomar com alimentos",
  "doctorNotes": "Iniciar com dose baixa",
  "medications": [
    {
      "name": "Sertralina",
      "dosage": "50mg",
      "frequency": "1x ao dia",
      "quantity": 30,
      "instructions": "Tomar pela manhã"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "status": "active",
    "prescriptionDate": "2024-01-15"
  },
  "message": "Prescrição criada com sucesso"
}
```

**Errors:**
- 403: Médico não autorizado para este paciente
- 400: Medicamentos obrigatórios

---

### PUT /api/prescriptions/:id

Update prescription (doctor only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "completed",
  "doctorNotes": "Tratamento concluído com sucesso"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed"
  },
  "message": "Prescrição atualizada"
}
```


## Exam Endpoints

### GET /api/exams

Get exams (filtered by role).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientId` (optional): Filter by patient
- `status` (optional): pending, completed, cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "patientName": "João Silva",
      "examDate": "2024-01-10",
      "examType": "Laboratorial",
      "examName": "Hemograma Completo",
      "status": "completed",
      "fileUrl": "https://storage.supabase.co/...",
      "fileName": "hemograma_2024-01-10.pdf"
    }
  ]
}
```

---

### POST /api/exams

Upload new exam with file.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `examType`: string (required)
- `examName`: string (required)
- `examDate`: date (required)
- `notes`: string (optional)
- `file`: file (required, max 5MB, PDF/JPEG/PNG)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "examType": "Laboratorial",
    "examName": "Hemograma Completo",
    "fileUrl": "https://storage.supabase.co/...",
    "fileName": "hemograma_2024-01-10.pdf"
  },
  "message": "Exame enviado com sucesso"
}
```

**Errors:**
- 400: Arquivo muito grande (máximo 5MB)
- 400: Tipo de arquivo inválido
- 400: Campos obrigatórios faltando

---

### GET /api/exams/:id

Get exam details with signed URL.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "examDate": "2024-01-10",
    "examType": "Laboratorial",
    "examName": "Hemograma Completo",
    "results": "Valores dentro da normalidade",
    "status": "completed",
    "notes": "Jejum de 12 horas",
    "doctorNotes": "Resultados normais",
    "fileUrl": "https://storage.supabase.co/...?token=...",
    "fileName": "hemograma_2024-01-10.pdf",
    "fileSize": 1024000,
    "uploadDate": "2024-01-10T14:30:00Z"
  }
}
```

---

### DELETE /api/exams/:id

Delete exam and associated file.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exame excluído com sucesso"
}
```


## Mood Entry Endpoints

### GET /api/mood-entries

Get mood entries (filtered by role).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientId` (optional): Filter by patient
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "entryDate": "2024-01-15",
      "moodLevel": 4,
      "stressLevel": 2,
      "anxietyLevel": 2,
      "depressionLevel": 1,
      "sleepHours": 7.5,
      "exerciseMinutes": 30,
      "socialInteraction": "moderate",
      "medicationTaken": true,
      "activities": ["Trabalho", "Caminhada", "Leitura"],
      "notes": "Dia produtivo"
    }
  ]
}
```

---

### POST /api/mood-entries

Create mood entry (patient only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "moodLevel": 4,
  "stressLevel": 2,
  "anxietyLevel": 2,
  "depressionLevel": 1,
  "sleepHours": 7.5,
  "exerciseMinutes": 30,
  "socialInteraction": "moderate",
  "medicationTaken": true,
  "activities": ["Trabalho", "Caminhada"],
  "notes": "Dia produtivo"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "entryDate": "2024-01-15",
    "moodLevel": 4
  },
  "message": "Registro de humor criado"
}
```

**Errors:**
- 400: Níveis devem estar entre 1 e 5
- 400: Horas de sono inválidas

---

## Doctor Notes Endpoints

### GET /api/doctor-notes

Get doctor notes (filtered by role).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientId` (optional): Filter by patient

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "doctorId": "uuid",
      "doctorName": "Dr. Maria Santos",
      "noteDate": "2024-01-15",
      "title": "Consulta de acompanhamento",
      "content": "Paciente apresenta melhora significativa...",
      "isVisibleToPatient": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/doctor-notes

Create doctor note (doctor only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "patientId": "uuid",
  "title": "Consulta de acompanhamento",
  "content": "Paciente apresenta melhora significativa...",
  "isVisibleToPatient": true,
  "appointmentId": "uuid"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "noteDate": "2024-01-15",
    "title": "Consulta de acompanhamento"
  },
  "message": "Nota criada com sucesso"
}
```


## Appointment Endpoints

### GET /api/appointments

Get appointments (filtered by role).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `date` (optional): Filter by date
- `doctorId` (optional): Filter by doctor
- `patientId` (optional): Filter by patient
- `status` (optional): scheduled, confirmed, completed, cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "patientName": "João Silva",
      "doctorId": "uuid",
      "doctorName": "Dr. Maria Santos",
      "appointmentDate": "2024-01-20",
      "appointmentTime": "14:00",
      "durationMinutes": 60,
      "type": "consultation",
      "status": "scheduled",
      "notes": "Primeira consulta"
    }
  ]
}
```

---

### POST /api/appointments

Create appointment (secretary/admin).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "appointmentDate": "2024-01-20",
  "appointmentTime": "14:00",
  "durationMinutes": 60,
  "type": "consultation",
  "notes": "Primeira consulta"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "appointmentDate": "2024-01-20",
    "appointmentTime": "14:00",
    "status": "scheduled"
  },
  "message": "Consulta agendada com sucesso"
}
```

**Errors:**
- 400: Conflito de horário
- 400: Médico não disponível

---

### PUT /api/appointments/:id

Update appointment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Consulta realizada com sucesso",
  "diagnosis": "Transtorno de ansiedade generalizada",
  "treatment": "Terapia cognitivo-comportamental"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed"
  },
  "message": "Consulta atualizada"
}
```

---

### DELETE /api/appointments/:id

Cancel appointment (secretary/admin).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "cancellationReason": "Paciente solicitou reagendamento"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Consulta cancelada"
}
```


## LGPD Endpoints

### GET /api/lgpd/my-data

Export all user data (data portability).

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "personalInfo": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "(11) 98765-4321"
    },
    "patientProfile": {
      "dateOfBirth": "1990-05-15",
      "cpf": "123.456.789-00",
      "medicalHistory": ["Ansiedade"]
    },
    "appointments": [...],
    "prescriptions": [...],
    "exams": [...],
    "moodEntries": [...],
    "consents": [...],
    "exportDate": "2024-01-15T10:00:00Z",
    "format": "JSON"
  },
  "message": "Dados exportados conforme LGPD Art. 18, V"
}
```

---

### POST /api/lgpd/data-portability

Request data export in JSON format.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.serenitas.app/downloads/export_uuid.json",
    "expiresAt": "2024-01-15T11:00:00Z"
  },
  "message": "Exportação preparada"
}
```

---

### DELETE /api/lgpd/delete-account

Request account deletion (30-day grace period).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "password": "SecurePass123!",
  "reason": "Não preciso mais do serviço"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deletionScheduledFor": "2024-02-14T10:00:00Z",
    "gracePeriodDays": 30
  },
  "message": "Exclusão agendada. Você tem 30 dias para cancelar."
}
```

---

### POST /api/lgpd/revoke-consent

Revoke specific consent.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "consentType": "marketing_communications"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Consentimento revogado"
}
```

---

### GET /api/lgpd/data-usage

Get information about data processing purposes.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "purposes": [
      {
        "type": "healthcare",
        "description": "Prestação de serviços de saúde mental",
        "legalBasis": "Tutela da saúde (LGPD Art. 11, II, f)"
      },
      {
        "type": "appointment_management",
        "description": "Gerenciamento de consultas",
        "legalBasis": "Execução de contrato (LGPD Art. 7, V)"
      }
    ],
    "dataRetention": {
      "medicalRecords": "20 anos (CFM 1.821/2007)",
      "auditLogs": "5 anos",
      "personalData": "Enquanto houver relação contratual"
    }
  }
}
```

---

### GET /api/dpo-contact

Get Data Protection Officer contact information.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Encarregado de Proteção de Dados",
    "email": "dpo@clinicaserenitas.com.br",
    "phone": "(11) 1234-5678",
    "address": "Rua Example, 123 - São Paulo, SP"
  },
  "message": "Contato do DPO conforme LGPD Art. 41"
}
```


## Admin Endpoints

### GET /api/admin/stats

Get system statistics (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalPatients": 1000,
    "totalDoctors": 25,
    "totalSecretaries": 10,
    "totalAppointments": 5000,
    "appointmentsToday": 45,
    "activePrescriptions": 800,
    "systemHealth": "healthy",
    "lastBackup": "2024-01-15T02:00:00Z"
  }
}
```

---

### GET /api/admin/audit-logs

Query audit logs (admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `userId` (optional): Filter by user
- `action` (optional): Filter by action type
- `startDate` (optional): From date
- `endDate` (optional): To date
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userName": "João Silva",
        "action": "SENSITIVE_DATA_ACCESS",
        "resourceType": "Prescription",
        "resourceId": "uuid",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-15T10:30:00Z",
        "details": {}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10000,
      "pages": 200
    }
  }
}
```

---

### GET /api/admin/users

Get all users with filters (admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `role` (optional): Filter by role
- `search` (optional): Search by name or email
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "João Silva",
        "email": "joao@example.com",
        "role": "patient",
        "lastLoginAt": "2024-01-15T09:00:00Z",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "pages": 25
    }
  }
}
```

---

### POST /api/admin/export-data

Export compliance data (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "exportType": "audit_logs",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "csv"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.serenitas.app/downloads/export_uuid.csv",
    "expiresAt": "2024-01-15T11:00:00Z"
  },
  "message": "Exportação preparada"
}
```

---

## User Management Endpoints

### GET /api/users

Get users list (admin/secretary).

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "patient",
      "phone": "(11) 98765-4321"
    }
  ]
}
```

---

### GET /api/users/:id

Get user details.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "(11) 98765-4321",
    "role": "patient",
    "createdAt": "2024-01-01T10:00:00Z",
    "lastLoginAt": "2024-01-15T09:00:00Z"
  }
}
```

---

### PUT /api/users/:id

Update user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "João Silva Santos",
  "phone": "(11) 98765-4321",
  "role": "patient"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva Santos"
  },
  "message": "Usuário atualizado"
}
```

---

### DELETE /api/users/:id

Delete user (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuário excluído"
}
```

---

## Health Check

### GET /health

Check system health (no authentication required).

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "database": "connected",
  "storage": "connected",
  "version": "1.0.0"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

---

## Webhooks (Future Feature)

### POST /api/webhooks/appointment-reminder

Webhook for appointment reminders.

**Payload:**
```json
{
  "event": "appointment.reminder",
  "appointmentId": "uuid",
  "patientEmail": "joao@example.com",
  "appointmentDate": "2024-01-20",
  "appointmentTime": "14:00"
}
```

---

## Testing

### Test Credentials

**Patient:**
- Email: `patient@test.com`
- Password: `Test123!`

**Doctor:**
- Email: `doctor@test.com`
- Password: `Test123!`

**Secretary:**
- Email: `secretary@test.com`
- Password: `Test123!`

**Admin:**
- Email: `admin@test.com`
- Password: `Test123!`

### Postman Collection

Download the Postman collection: [serenitas-api.postman_collection.json](./serenitas-api.postman_collection.json)

---

## Support

For API support:
- **Email:** api-support@clinicaserenitas.com.br
- **Documentation:** https://docs.serenitas.app
- **Status Page:** https://status.serenitas.app

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
