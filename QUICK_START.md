# 🚀 Quick Start - Clínica Serenitas

## ✅ Your Setup is Complete!

Everything is configured and ready. Here's how to start working:

---

## 🎯 Start Development (3 Steps)

### 1. Start Backend
```bash
cd serenitas_backend
npm run dev
```

Expected output:
```
🚀 Server running on port 5000
🌍 Environment: development
📊 Health check: http://localhost:5000
🔗 API base: http://localhost:5000/api
```

### 2. Test API
Open browser or use curl:
```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {
#   "status": "healthy",
#   "checks": {
#     "database": "connected",
#     "storage": "connected"
#   }
# }
```

### 3. Start Frontend
```bash
cd serenitas_app
npm run dev
```

---

## 📋 Quick Commands

### Backend
```bash
# Start development server
npm run dev

# Run tests
npm test

# Check test coverage
npm run test:coverage

# Verify Supabase setup
node supabase/test_connection.js
```

### Database
```bash
# Test connection
node serenitas_backend/supabase/test_connection.js

# Check RLS status
node serenitas_backend/supabase/check_rls_status.js

# Verify everything
node serenitas_backend/supabase/migration/verify.js
```

---

## 🔑 Test Credentials

If you created test users, use these to login:

**Test Patient**
- Email: `paciente.teste@clinicaserenitas.com.br`
- Password: `password123`

**Test Doctor**
- Email: `dr.silva@clinicaserenitas.com.br`
- Password: `password123`

---

## 🌐 API Endpoints

Base URL: `http://localhost:5000/api`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/profile` - Get current user profile

### Patients
- `GET /patients` - List patients
- `GET /patients/:id` - Get patient details
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient

### Doctors
- `GET /doctors` - List doctors
- `GET /doctors/:id` - Get doctor details
- `PUT /doctors/:id` - Update doctor

### Appointments
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

### Prescriptions
- `GET /prescriptions` - List prescriptions
- `POST /prescriptions` - Create prescription
- `GET /prescriptions/:id` - Get prescription details

### Exams
- `GET /exams` - List exams
- `POST /exams` - Upload exam
- `GET /exams/:id` - Get exam details
- `DELETE /exams/:id` - Delete exam

### Mood Entries
- `GET /mood-entries` - List mood entries
- `POST /mood-entries` - Create mood entry
- `GET /mood-entries/:id` - Get mood entry

### LGPD
- `GET /lgpd/my-data` - Export user data
- `POST /lgpd/revoke-consent` - Revoke consent
- `DELETE /lgpd/delete-account` - Delete account

---

## 🔐 Authentication

All protected endpoints require JWT token in header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/patients
```

Get token by logging in:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## 📊 Supabase Console

Access your database directly:

**Dashboard**: https://supabase.com/dashboard/project/rwufuxnweznqjmmcwcva

### Quick Actions:
- **Table Editor**: View/edit data
- **SQL Editor**: Run custom queries
- **Storage**: Manage uploaded files
- **Logs**: Monitor activity
- **Authentication**: Manage users

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check environment variables
cat serenitas_backend/.env

# Should have:
# SUPABASE_URL=https://rwufuxnweznqjmmcwcva.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...
# JWT_SECRET=...
```

### Database connection fails
```bash
# Test connection
node serenitas_backend/supabase/test_connection.js

# Should show all green ✅
```

### API returns 401 Unauthorized
- Check JWT token is included in Authorization header
- Verify token hasn't expired (7 days default)
- Login again to get fresh token

### API returns 403 Forbidden
- Check user role has permission for this action
- Verify RLS policies allow this operation
- Check doctor-patient relationship for medical data

---

## 📚 Documentation

### Full Guides
- `SUPABASE_STATUS_REPORT.md` - Complete setup status
- `SUPABASE_ACTION_PLAN.md` - Detailed action plan
- `serenitas_backend/supabase/SETUP_GUIDE.md` - Setup instructions

### Backend Docs
- `serenitas_backend/DEVELOPER_GUIDE.md` - Developer guide
- `serenitas_backend/LGPD_IMPLEMENTATION.md` - LGPD compliance
- `serenitas_backend/DEPLOYMENT.md` - Deployment guide

### Steering Rules
- `.kiro/steering/product.md` - Product overview
- `.kiro/steering/tech.md` - Tech stack
- `.kiro/steering/security.md` - Security standards
- `.kiro/steering/compliance-lgpd.md` - LGPD requirements

---

## ✨ What's Working

✅ **Database**: 11 tables, all configured  
✅ **Security**: RLS enabled on all tables  
✅ **Storage**: File uploads configured  
✅ **Backend**: API fully integrated  
✅ **LGPD**: Compliance features active  
✅ **Auth**: JWT authentication working  

---

## 🎯 Next Steps

1. **Test API endpoints** - Use Postman or curl
2. **Create sample data** - Add test users, appointments
3. **Build frontend features** - Connect to API
4. **Test RLS policies** - Verify access control
5. **Deploy to production** - When ready

---

## 💡 Pro Tips

### Development
- Use `npm run dev` for auto-reload
- Check logs in `serenitas_backend/logs/`
- Use Supabase console to inspect data

### Testing
- Test with different user roles
- Verify RLS blocks unauthorized access
- Check audit logs for compliance

### Deployment
- Update environment variables for production
- Use HTTPS in production
- Monitor Supabase dashboard for performance

---

## 🆘 Need Help?

1. Check `SUPABASE_STATUS_REPORT.md` for detailed status
2. Run verification: `node serenitas_backend/supabase/migration/verify.js`
3. Check Supabase logs in dashboard
4. Review backend logs: `tail -f serenitas_backend/logs/combined.log`

---

**Status**: ✅ Ready for Development  
**Last Updated**: November 14, 2025  
**Action**: Start coding! 🚀
