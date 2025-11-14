# Production Smoke Tests

Comprehensive smoke testing checklist for verifying the Clínica Serenitas application in production.

## Overview

Smoke tests are quick, high-level tests to verify that critical functionality works after deployment. Run these tests immediately after deploying to production.

---

## Pre-Test Setup

### Test Accounts

Create test accounts for each role:

```
Patient:
- Email: test.patient@example.com
- Password: TestPatient123!

Doctor:
- Email: test.doctor@example.com
- Password: TestDoctor123!

Secretary:
- Email: test.secretary@example.com
- Password: TestSecretary123!

Admin:
- Email: test.admin@example.com
- Password: TestAdmin123!
```

### Test Data

Prepare test data:
- Sample patient profile
- Sample prescription
- Sample exam file (PDF, < 5MB)
- Sample mood entry

---

## 1. Infrastructure Tests

### 1.1 Domain and SSL

- [ ] `https://serenitas.app` loads successfully
- [ ] `https://www.serenitas.app` redirects to `https://serenitas.app`
- [ ] `https://api.serenitas.app` is accessible
- [ ] SSL certificate is valid (no warnings)
- [ ] Certificate expiration date is > 30 days away

**Test Commands:**
```bash
# Check SSL certificate
openssl s_client -connect serenitas.app:443 -servername serenitas.app < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Check HTTP to HTTPS redirect
curl -I http://serenitas.app

# Check API health
curl https://api.serenitas.app/health
```

### 1.2 API Health Check

- [ ] `/health` endpoint returns 200 status
- [ ] Response contains `"status":"healthy"`
- [ ] Response contains `"database":"connected"`
- [ ] Response time < 1 second

**Test:**
```bash
curl -w "\nTime: %{time_total}s\n" https://api.serenitas.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### 1.3 CORS Configuration

- [ ] Frontend can make API requests
- [ ] CORS headers are present
- [ ] Preflight requests work

**Test:**
```bash
curl -H "Origin: https://serenitas.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.serenitas.app/api/auth/login \
     -v
```

---

## 2. Authentication Tests

### 2.1 User Registration

- [ ] Registration page loads
- [ ] Can register new patient account
- [ ] Email validation works
- [ ] Password validation works
- [ ] CPF validation works (if applicable)
- [ ] Success message in Portuguese
- [ ] Redirects to login after registration

**Test Steps:**
1. Go to `https://serenitas.app/register`
2. Fill in registration form
3. Submit form
4. Verify success message
5. Verify redirect to login

**API Test:**
```bash
curl -X POST https://api.serenitas.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test.new@example.com",
    "password": "SecurePass123!",
    "phone": "(11) 98765-4321",
    "role": "patient"
  }'
```

### 2.2 User Login

- [ ] Login page loads
- [ ] Can login with valid credentials
- [ ] Invalid credentials show error in Portuguese
- [ ] JWT token is stored in localStorage
- [ ] Redirects to appropriate dashboard
- [ ] Rate limiting works (5 attempts max)

**Test Steps:**
1. Go to `https://serenitas.app/login`
2. Enter test credentials
3. Submit form
4. Verify redirect to dashboard
5. Check localStorage for token

**API Test:**
```bash
curl -X POST https://api.serenitas.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.patient@example.com",
    "password": "TestPatient123!"
  }'
```

### 2.3 Protected Routes

- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users can access dashboard
- [ ] JWT token is sent in Authorization header
- [ ] Expired tokens are rejected

**Test:**
```bash
# Without token (should fail)
curl https://api.serenitas.app/api/auth/profile

# With token (should succeed)
curl https://api.serenitas.app/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2.4 Logout

- [ ] Logout button works
- [ ] JWT token is removed from localStorage
- [ ] Redirects to login page
- [ ] Cannot access protected routes after logout

---

## 3. Role-Based Dashboard Tests

### 3.1 Patient Dashboard

Login as patient and verify:

- [ ] Dashboard loads successfully
- [ ] Upcoming appointments displayed
- [ ] Active prescriptions summary shown
- [ ] Recent mood entries chart visible
- [ ] Quick actions available
- [ ] All text in Portuguese
- [ ] Responsive on mobile

**Navigation Tests:**
- [ ] Can navigate to Prescriptions
- [ ] Can navigate to Exams
- [ ] Can navigate to Mood Tracker
- [ ] Can navigate to Doctor Notes
- [ ] Can navigate to Profile

### 3.2 Doctor Dashboard

Login as doctor and verify:

- [ ] Dashboard loads successfully
- [ ] Today's appointments displayed
- [ ] Assigned patients count shown
- [ ] Quick actions available
- [ ] All text in Portuguese

**Navigation Tests:**
- [ ] Can navigate to Patient List
- [ ] Can navigate to Appointments
- [ ] Can view patient details
- [ ] Can create prescription
- [ ] Can write doctor notes

### 3.3 Secretary Dashboard

Login as secretary and verify:

- [ ] Dashboard loads successfully
- [ ] All appointments for the day displayed
- [ ] Quick actions available
- [ ] Statistics shown
- [ ] All text in Portuguese

**Navigation Tests:**
- [ ] Can navigate to Appointment Manager
- [ ] Can navigate to Patient Registration
- [ ] Can navigate to Patient Management
- [ ] Can view doctor schedules

### 3.4 Admin Dashboard

Login as admin and verify:

- [ ] Dashboard loads successfully
- [ ] System statistics displayed
- [ ] Recent activity shown
- [ ] Quick actions available
- [ ] All text in Portuguese

**Navigation Tests:**
- [ ] Can navigate to User Management
- [ ] Can navigate to Audit Logs
- [ ] Can navigate to Data Management
- [ ] Can view all entities

---

## 4. Core Functionality Tests

### 4.1 Patient Features

#### View Prescriptions

- [ ] Prescriptions list loads
- [ ] Active prescriptions displayed
- [ ] Prescription details visible
- [ ] Medications listed correctly
- [ ] Dates formatted as DD/MM/YYYY
- [ ] Status indicators work

#### Upload Exam

- [ ] Exam upload form loads
- [ ] Can select PDF file
- [ ] Can select JPEG/PNG file
- [ ] File size validation works (5MB max)
- [ ] File type validation works
- [ ] Upload progress shown
- [ ] Success message displayed
- [ ] Exam appears in list

**Test:**
1. Go to Exams page
2. Click "Upload Exam"
3. Select test file
4. Fill in exam details
5. Submit
6. Verify success

#### Create Mood Entry

- [ ] Mood tracker form loads
- [ ] Can select mood level (1-5)
- [ ] Can enter stress, anxiety, depression levels
- [ ] Can enter sleep hours
- [ ] Can enter activities
- [ ] Form validation works
- [ ] Success message displayed
- [ ] Entry appears in history

#### View Doctor Notes

- [ ] Doctor notes list loads
- [ ] Only visible notes shown
- [ ] Note details displayed
- [ ] Dates formatted correctly

### 4.2 Doctor Features

#### View Assigned Patients

- [ ] Patient list loads
- [ ] Only assigned patients shown
- [ ] Search functionality works
- [ ] Filter functionality works
- [ ] Can click to view patient details

#### Create Prescription

- [ ] Prescription form loads
- [ ] Can select patient
- [ ] Can add medications
- [ ] Can set dosage and frequency
- [ ] Can add instructions
- [ ] Form validation works
- [ ] Success message displayed
- [ ] Prescription appears in patient's list

**Test:**
1. Go to Patient Detail
2. Click "Create Prescription"
3. Fill in prescription details
4. Add medications
5. Submit
6. Verify success

#### Write Doctor Note

- [ ] Note form loads
- [ ] Can enter title and content
- [ ] Can set visibility to patient
- [ ] Can link to appointment
- [ ] Form validation works
- [ ] Success message displayed
- [ ] Note appears in patient's notes

### 4.3 Secretary Features

#### Schedule Appointment

- [ ] Appointment form loads
- [ ] Can select patient
- [ ] Can select doctor
- [ ] Can select date and time
- [ ] Doctor availability validation works
- [ ] Form validation works
- [ ] Success message displayed
- [ ] Appointment appears in calendar

#### Register Patient

- [ ] Registration form loads
- [ ] Can enter patient details
- [ ] Can assign doctor
- [ ] CPF validation works
- [ ] Phone validation works
- [ ] Form validation works
- [ ] Success message displayed
- [ ] Patient appears in list

### 4.4 Admin Features

#### Manage Users

- [ ] User list loads
- [ ] Can create new user
- [ ] Can edit user
- [ ] Can delete user (with confirmation)
- [ ] Can filter by role
- [ ] Search functionality works

#### View Audit Logs

- [ ] Audit logs list loads
- [ ] Can filter by user
- [ ] Can filter by action
- [ ] Can filter by date range
- [ ] Can export to CSV

---

## 5. LGPD Compliance Tests

### 5.1 Data Export

- [ ] Data export page loads
- [ ] Can request data export
- [ ] Export includes all user data
- [ ] Export is in JSON format
- [ ] Export can be downloaded
- [ ] Export timestamp is shown

**API Test:**
```bash
curl https://api.serenitas.app/api/lgpd/my-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.2 Account Deletion

- [ ] Account deletion page loads
- [ ] Warning about 30-day grace period shown
- [ ] Confirmation required
- [ ] Can request account deletion
- [ ] Scheduled deletion date shown
- [ ] Can cancel during grace period

### 5.3 Consent Management

- [ ] Consent management page loads
- [ ] List of consents displayed
- [ ] Can revoke consent
- [ ] Consent history shown
- [ ] DPO contact information displayed

### 5.4 Privacy Policy

- [ ] Privacy policy page loads
- [ ] Content in Portuguese
- [ ] Data processing purposes explained
- [ ] DPO contact information shown
- [ ] Link to consent management works

---

## 6. Security Tests

### 6.1 HTTPS Enforcement

- [ ] HTTP requests redirect to HTTPS
- [ ] No mixed content warnings
- [ ] Security headers present

**Test:**
```bash
curl -I https://serenitas.app | grep -i "strict-transport-security"
curl -I https://serenitas.app | grep -i "x-content-type-options"
curl -I https://serenitas.app | grep -i "x-frame-options"
```

### 6.2 Rate Limiting

- [ ] Rate limiting works on API endpoints
- [ ] Auth endpoints have stricter limits
- [ ] Error message in Portuguese

**Test:**
```bash
# Make 6 rapid login attempts
for i in {1..6}; do
  curl -X POST https://api.serenitas.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

### 6.3 Authorization

- [ ] Patients cannot access other patients' data
- [ ] Doctors cannot access unassigned patients
- [ ] Secretaries cannot access medical data
- [ ] Unauthorized requests return 403

**Test:**
```bash
# Try to access another user's data
curl https://api.serenitas.app/api/patients/OTHER_PATIENT_ID \
  -H "Authorization: Bearer PATIENT_JWT_TOKEN"
```

### 6.4 Input Validation

- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] Invalid data types rejected
- [ ] Required fields enforced

---

## 7. PWA Tests

### 7.1 Installation

**On Android:**
- [ ] Install prompt appears
- [ ] Can install app
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode
- [ ] Splash screen displays

**On iOS:**
- [ ] Can add to home screen
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode

### 7.2 Service Worker

- [ ] Service worker registers successfully
- [ ] Static assets are cached
- [ ] Offline mode works for cached pages
- [ ] Online/offline indicator works

**Test:**
1. Open DevTools → Application → Service Workers
2. Verify service worker is active
3. Go offline (DevTools → Network → Offline)
4. Refresh page
5. Verify cached content loads

### 7.3 Manifest

- [ ] manifest.json is accessible
- [ ] App name is correct
- [ ] Theme color is correct
- [ ] Icons are correct sizes
- [ ] Start URL is correct

**Test:**
```bash
curl https://serenitas.app/manifest.json
```

---

## 8. Performance Tests

### 8.1 Page Load Time

- [ ] Homepage loads in < 2 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] No render-blocking resources

**Test:**
```bash
# Using curl
curl -w "Time: %{time_total}s\n" -o /dev/null -s https://serenitas.app

# Or use Lighthouse
lighthouse https://serenitas.app --only-categories=performance
```

### 8.2 API Response Time

- [ ] Health check responds in < 1 second
- [ ] Login responds in < 1 second
- [ ] Data fetching responds in < 2 seconds

**Test:**
```bash
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s https://api.serenitas.app/health
```

### 8.3 Lighthouse Audit

Run Lighthouse audit and verify scores:

- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 90+
- [ ] PWA: 100

```bash
lighthouse https://serenitas.app --view
```

---

## 9. Localization Tests

### 9.1 Language

- [ ] All UI text in Portuguese (pt-BR)
- [ ] Error messages in Portuguese
- [ ] Success messages in Portuguese
- [ ] Form labels in Portuguese
- [ ] Button text in Portuguese

### 9.2 Date and Time Formatting

- [ ] Dates formatted as DD/MM/YYYY
- [ ] Times formatted as HH:MM (24-hour)
- [ ] Timezone is America/Sao_Paulo

### 9.3 Number Formatting

- [ ] Currency formatted as R$ X.XXX,XX
- [ ] Phone numbers formatted as (XX) XXXXX-XXXX
- [ ] CPF formatted as XXX.XXX.XXX-XX

---

## 10. Monitoring Tests

### 10.1 Error Tracking

- [ ] Sentry is capturing errors
- [ ] Frontend errors appear in Sentry
- [ ] Backend errors appear in Sentry
- [ ] Source maps are working

**Test:**
1. Trigger test error in frontend
2. Trigger test error in backend
3. Check Sentry dashboard
4. Verify errors are captured

### 10.2 Uptime Monitoring

- [ ] Uptime monitor is active
- [ ] Health check is being monitored
- [ ] Alerts are configured
- [ ] Status page is accessible

### 10.3 Logging

- [ ] Logs are being collected
- [ ] Log aggregation is working
- [ ] Can search logs
- [ ] Can filter logs

---

## Test Results Template

```markdown
# Production Smoke Test Results

**Date:** 2024-01-15
**Tester:** [Your Name]
**Environment:** Production
**Version:** 1.0.0

## Summary

- Total Tests: X
- Passed: X
- Failed: X
- Blocked: X

## Test Results

### 1. Infrastructure Tests
- [x] Domain and SSL: PASS
- [x] API Health Check: PASS
- [x] CORS Configuration: PASS

### 2. Authentication Tests
- [x] User Registration: PASS
- [x] User Login: PASS
- [x] Protected Routes: PASS
- [x] Logout: PASS

[Continue for all sections...]

## Issues Found

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]
   - **Status:** Open/Fixed

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Sign-off

- [ ] All critical tests passed
- [ ] All issues documented
- [ ] Team notified
- [ ] Ready for production use

**Approved by:** [Name]
**Date:** [Date]
```

---

## Automated Testing Script

Create `smoke-test.sh`:

```bash
#!/bin/bash

API_URL="https://api.serenitas.app"
APP_URL="https://serenitas.app"

echo "Running Production Smoke Tests..."
echo "=================================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
response=$(curl -s -w "\n%{http_code}" $API_URL/health)
status=$(echo "$response" | tail -n1)
if [ "$status" = "200" ]; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed (Status: $status)"
fi

# Test 2: Frontend
echo "2. Testing frontend..."
status=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL)
if [ "$status" = "200" ]; then
  echo "✓ Frontend accessible"
else
  echo "✗ Frontend not accessible (Status: $status)"
fi

# Test 3: SSL
echo "3. Testing SSL certificate..."
expiry=$(echo | openssl s_client -connect serenitas.app:443 -servername serenitas.app 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
echo "✓ SSL certificate expires: $expiry"

# Test 4: API Registration
echo "4. Testing user registration..."
response=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@example.com","password":"TestPass123!","role":"patient"}')
if echo "$response" | grep -q "success"; then
  echo "✓ Registration works"
else
  echo "✗ Registration failed"
fi

echo "=================================="
echo "Smoke tests completed!"
```

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
