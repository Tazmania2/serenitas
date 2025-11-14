# Localization and Language Standards

## Primary Language

**Portuguese (Brazil) - pt-BR** is the primary language for this application.

## Language Requirements

### User-Facing Content
- All UI text, labels, buttons, and messages must be in Portuguese (pt-BR)
- Error messages must be clear and in Portuguese
- Email notifications and SMS must be in Portuguese
- Privacy policy, terms of use, and consent forms must be in Portuguese

### Code and Documentation
- Code comments can be in English or Portuguese
- Variable names and function names should be in English (standard practice)
- API documentation should be bilingual when possible
- Technical logs can be in English
- User-facing logs must be in Portuguese

### Medical Terminology
- Use proper Brazilian Portuguese medical terminology
- Follow CFM (Conselho Federal de Medicina) terminology standards
- Common terms:
  - Paciente (Patient)
  - Médico/Médica (Doctor)
  - Prescrição (Prescription)
  - Exame (Exam/Test)
  - Consulta (Appointment/Consultation)
  - Prontuário (Medical Record)
  - Receita Médica (Medical Prescription)
  - Diagnóstico (Diagnosis)
  - Tratamento (Treatment)
  - Medicamento/Remédio (Medication/Medicine)

## Example Implementations

### API Response Messages

```javascript
// Good - Portuguese messages for users
res.status(400).json({
  success: false,
  message: 'Email inválido',
  error: 'O formato do email fornecido não é válido'
});

// Good - Technical logs in English
logger.error('Invalid email format', {
  email: req.body.email,
  userId: req.user?._id
});
```

### Validation Messages

```javascript
const { body, validationResult } = require('express-validator');

// Validation with Portuguese messages
const validateAppointment = [
  body('date')
    .notEmpty()
    .withMessage('A data da consulta é obrigatória')
    .isISO8601()
    .withMessage('Formato de data inválido'),
  
  body('time')
    .notEmpty()
    .withMessage('O horário da consulta é obrigatório')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de horário inválido (use HH:MM)'),
  
  body('doctorId')
    .notEmpty()
    .withMessage('O médico é obrigatório')
    .isMongoId()
    .withMessage('ID do médico inválido')
];
```

### User Roles in Portuguese

```javascript
// Display names in Portuguese
const roleDisplayNames = {
  patient: 'Paciente',
  doctor: 'Médico',
  secretary: 'Secretária',
  admin: 'Administrador'
};

// Internal role names can remain in English for consistency
const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['patient', 'doctor', 'secretary', 'admin'],
    default: 'patient'
  }
});
```

### Date and Time Formatting

```javascript
// Use Brazilian date format: DD/MM/YYYY
const formatDateBR = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
};

// Use Brazilian time format: HH:MM
const formatTimeBR = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
};

// Example usage
const appointment = {
  date: new Date('2024-03-15T14:30:00'),
  formattedDate: formatDateBR(appointment.date), // "15/03/2024"
  formattedTime: formatTimeBR(appointment.date)  // "14:30"
};
```

### Currency Formatting

```javascript
// Brazilian Real (BRL)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

// Example: formatCurrency(150.50) => "R$ 150,50"
```

### Phone Number Format

```javascript
// Brazilian phone format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
const formatPhoneBR = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // Mobile: (XX) XXXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};
```

### CPF Validation and Formatting

```javascript
// CPF (Cadastro de Pessoas Físicas) - Brazilian tax ID
const formatCPF = (cpf) => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const validateCPF = (cpf) => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // All same digits
  
  // CPF validation algorithm
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
};
```

## Email Templates

### Appointment Confirmation (Portuguese)

```javascript
const appointmentConfirmationEmail = {
  subject: 'Confirmação de Consulta - Clínica Serenitas',
  body: `
    Olá, ${patientName}!
    
    Sua consulta foi agendada com sucesso.
    
    Detalhes da Consulta:
    - Data: ${formatDateBR(appointment.date)}
    - Horário: ${formatTimeBR(appointment.time)}
    - Médico(a): Dr(a). ${doctorName}
    - Especialidade: ${specialization}
    
    Por favor, chegue com 15 minutos de antecedência.
    
    Em caso de dúvidas, entre em contato conosco.
    
    Atenciosamente,
    Clínica Serenitas
  `
};
```

### Password Reset (Portuguese)

```javascript
const passwordResetEmail = {
  subject: 'Redefinição de Senha - Clínica Serenitas',
  body: `
    Olá, ${userName}!
    
    Recebemos uma solicitação para redefinir sua senha.
    
    Clique no link abaixo para criar uma nova senha:
    ${resetLink}
    
    Este link expira em 1 hora.
    
    Se você não solicitou esta redefinição, ignore este email.
    
    Atenciosamente,
    Clínica Serenitas
  `
};
```

## Common Portuguese Phrases for UI

```javascript
const uiTranslations = {
  // Authentication
  login: 'Entrar',
  logout: 'Sair',
  register: 'Cadastrar',
  forgotPassword: 'Esqueci minha senha',
  resetPassword: 'Redefinir senha',
  
  // Common actions
  save: 'Salvar',
  cancel: 'Cancelar',
  delete: 'Excluir',
  edit: 'Editar',
  view: 'Visualizar',
  search: 'Buscar',
  filter: 'Filtrar',
  export: 'Exportar',
  
  // Forms
  required: 'Obrigatório',
  optional: 'Opcional',
  submit: 'Enviar',
  
  // Messages
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
  
  // Appointments
  scheduleAppointment: 'Agendar Consulta',
  myAppointments: 'Minhas Consultas',
  upcomingAppointments: 'Próximas Consultas',
  pastAppointments: 'Consultas Anteriores',
  
  // Prescriptions
  myPrescriptions: 'Minhas Prescrições',
  activePrescriptions: 'Prescrições Ativas',
  prescriptionHistory: 'Histórico de Prescrições',
  
  // Exams
  myExams: 'Meus Exames',
  examResults: 'Resultados de Exames',
  uploadExam: 'Enviar Exame',
  
  // Mood tracking
  moodTracking: 'Registro de Humor',
  dailyMood: 'Humor Diário',
  moodHistory: 'Histórico de Humor',
  
  // Dashboard
  dashboard: 'Painel',
  overview: 'Visão Geral',
  profile: 'Perfil',
  settings: 'Configurações'
};
```

## Timezone

Brazil has multiple timezones. Default to **America/Sao_Paulo** (Brasília Time - BRT/BRST).

```javascript
// Use moment-timezone or date-fns-tz
const moment = require('moment-timezone');

const brazilTime = moment().tz('America/Sao_Paulo');
```

## Accessibility (Acessibilidade)

- Follow WCAG 2.1 guidelines
- Provide alt text in Portuguese for images
- Ensure screen reader compatibility with Portuguese content
- Use semantic HTML with Portuguese labels
