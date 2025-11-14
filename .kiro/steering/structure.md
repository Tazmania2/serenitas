# Project Structure

## Repository Layout

```
serenitas/
├── serenitas_backend/     # Node.js/Express API server
├── serenitas_app/         # React Native mobile app (empty)
├── DEPLOYMENT.md          # Deployment guide
└── .gitignore            # Git ignore rules
```

## Backend Structure (serenitas_backend/)

```
serenitas_backend/
├── index.js              # Main application entry point
├── db.js                 # MongoDB connection configuration
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (not in git)
├── env.example           # Environment template
├── models/               # Mongoose data models
│   ├── User.js          # User accounts (all roles)
│   ├── Patient.js       # Patient-specific data
│   ├── Doctor.js        # Doctor-specific data
│   ├── Appointment.js   # Appointment scheduling
│   ├── Prescription.js  # Prescription records
│   ├── Exam.js          # Medical exam results
│   └── MoodEntry.js     # Daily mood tracking
├── routes/              # API route handlers
│   ├── auth.js          # Authentication endpoints
│   ├── users.js         # User management
│   ├── patients.js      # Patient operations
│   ├── doctors.js       # Doctor operations
│   ├── appointments.js  # Appointment CRUD
│   ├── prescriptions.js # Prescription CRUD
│   ├── exams.js         # Exam CRUD
│   └── mood-entries.js  # Mood tracking CRUD
└── middleware/          # Express middleware
    ├── auth.js          # JWT authentication
    └── validation.js    # Request validation
```

## Code Organization Patterns

### Models
- One file per Mongoose model
- Use timestamps: `{ timestamps: true }`
- Define schema with proper validation and types
- Export as: `module.exports = mongoose.model('ModelName', schema)`

### Routes
- One file per resource/domain
- Use Express Router
- Group related endpoints together
- Export router: `module.exports = router`
- All routes mounted under `/api` prefix in main app

### Middleware
- Authentication middleware checks JWT tokens
- Validation middleware uses express-validator
- Applied per-route or globally as needed

### API Response Format
Routes use a consistent response wrapper:
```javascript
{
  success: boolean,
  data: object | null,
  message: string,
  error: string | null
}
```

### API Endpoints Structure
- `/api/auth/*` - Authentication (register, login, profile)
- `/api/users/*` - User management
- `/api/patients/*` - Patient operations
- `/api/doctors/*` - Doctor operations
- `/api/appointments/*` - Appointment management
- `/api/prescriptions/*` - Prescription management
- `/api/exams/*` - Exam management
- `/api/mood-entries/*` - Mood tracking

### Authentication Flow
1. User registers/logs in via `/api/auth`
2. Server returns JWT token
3. Client includes token in `Authorization: Bearer <token>` header
4. Auth middleware validates token on protected routes
5. User object attached to `req.user` for authenticated requests

## Naming Conventions

- **Files**: kebab-case for multi-word files (`mood-entries.js`)
- **Models**: PascalCase (`User.js`, `MoodEntry.js`)
- **Routes**: kebab-case matching resource names
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE for environment variables
