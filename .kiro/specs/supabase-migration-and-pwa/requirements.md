# Requirements Document - Clínica Serenitas System

## Introduction

This document outlines the requirements for migrating the Clínica Serenitas mental health clinic management system from MongoDB to Supabase and building a complete Progressive Web App (PWA) with role-based dashboards. The system must comply with Brazilian LGPD regulations and medical confidentiality requirements.

## Glossary

- **System**: The Clínica Serenitas web application
- **User**: Any authenticated person using THE System (Patient, Doctor, Secretary, or Admin)
- **Patient**: A User with patient role who receives mental health care
- **Doctor**: A User with doctor role who provides mental health care
- **Secretary**: A User with secretary role who manages administrative tasks
- **Admin**: A User with admin role who has full system access
- **Supabase**: The PostgreSQL-based backend-as-a-service platform
- **PWA**: Progressive Web App - installable web application
- **RLS**: Row-Level Security - Supabase's data access control mechanism
- **LGPD**: Lei Geral de Proteção de Dados - Brazilian data protection law
- **Prescription**: Medical prescription containing medications and instructions
- **Exam**: Medical examination with results and files
- **Mood Entry**: Patient's self-reported mental health status
- **Appointment**: Scheduled consultation between Patient and Doctor
- **Doctor Notes**: Clinical notes written by Doctor about Patient

## Requirements

### Requirement 1: Database Migration to Supabase

**User Story:** As a system administrator, I want to migrate from MongoDB to Supabase, so that we have better LGPD compliance, lower costs, and built-in features.

#### Acceptance Criteria

1.1 WHEN THE System initializes, THE System SHALL connect to Supabase PostgreSQL database using environment variables

1.2 WHEN data migration occurs, THE System SHALL preserve all existing User accounts with hashed passwords

1.3 WHEN data migration occurs, THE System SHALL preserve all Patient profiles with medical history

1.4 WHEN data migration occurs, THE System SHALL preserve all Doctor profiles with specializations

1.5 WHEN data migration occurs, THE System SHALL preserve all Appointment records with relationships

1.6 WHEN data migration occurs, THE System SHALL preserve all Prescription records with medications

1.7 WHEN data migration occurs, THE System SHALL preserve all Exam records with file references

1.8 WHEN data migration occurs, THE System SHALL preserve all Mood Entry records with timestamps

### Requirement 2: User Authentication and Authorization

**User Story:** As a User, I want to securely log in with my credentials, so that I can access my role-specific dashboard.

#### Acceptance Criteria

2.1 THE System SHALL support four User roles: patient, doctor, secretary, and admin

2.2 WHEN a User registers, THE System SHALL hash the password using bcrypt with cost factor 12

2.3 WHEN a User logs in with valid credentials, THE System SHALL return a JWT token valid for 7 days

2.4 WHEN a User logs in with invalid credentials, THE System SHALL return an error message in Portuguese

2.5 WHEN a User accesses a protected resource without authentication, THE System SHALL return HTTP 401 status

2.6 WHEN a User accesses a resource without authorization, THE System SHALL return HTTP 403 status

2.7 WHEN a User role is patient, THE System SHALL restrict access to own data only

2.8 WHEN a User role is doctor, THE System SHALL restrict access to assigned Patients only

2.9 WHEN a User role is secretary, THE System SHALL grant access to administrative functions

2.10 WHEN a User role is admin, THE System SHALL grant full system access

### Requirement 3: Row-Level Security (RLS) Implementation

**User Story:** As a compliance officer, I want data access controlled at the database level, so that LGPD requirements are enforced automatically.

#### Acceptance Criteria

3.1 THE System SHALL implement RLS policies on all tables containing sensitive health data

3.2 WHEN a Patient queries their data, THE System SHALL return only records where patient_id matches authenticated User

3.3 WHEN a Doctor queries Patient data, THE System SHALL return only records for assigned Patients

3.4 WHEN a Secretary queries data, THE System SHALL return records based on administrative permissions

3.5 WHEN an Admin queries data, THE System SHALL return all records without restriction

3.6 WHEN RLS policy is violated, THE System SHALL prevent data access at database level

### Requirement 4: Patient Dashboard and Features

**User Story:** As a Patient, I want to view my health information and communicate with my Doctor, so that I can manage my mental health care.

#### Acceptance Criteria

4.1 WHEN a Patient logs in, THE System SHALL display a dashboard with upcoming Appointments

4.2 THE System SHALL allow Patient to view all active Prescriptions with medication details

4.3 THE System SHALL allow Patient to view Prescription history with status

4.4 THE System SHALL allow Patient to view all Exam results with download links

4.5 THE System SHALL allow Patient to upload Exam files in PDF, JPEG, or PNG format

4.6 WHERE Exam file exceeds 5MB, THE System SHALL reject the upload with error message

4.7 THE System SHALL allow Patient to view Doctor Notes written about them

4.8 THE System SHALL allow Patient to create weekly Mood Entry with mood scale 1-5

4.9 THE System SHALL allow Patient to view Mood Entry history with charts

4.10 THE System SHALL allow Patient to update personal health status information

4.11 THE System SHALL display all Patient-facing content in Portuguese (pt-BR)

### Requirement 5: Doctor Dashboard and Features

**User Story:** As a Doctor, I want to manage my Patients and clinical data, so that I can provide effective mental health care.

#### Acceptance Criteria

5.1 WHEN a Doctor logs in, THE System SHALL display a dashboard with today's Appointments

5.2 THE System SHALL allow Doctor to view list of assigned Patients

5.3 WHEN Doctor selects a Patient, THE System SHALL display Patient's complete medical profile

5.4 THE System SHALL allow Doctor to create Prescription for assigned Patient

5.5 THE System SHALL allow Doctor to update existing Prescription status

5.6 THE System SHALL allow Doctor to write clinical notes for assigned Patient

5.7 THE System SHALL allow Doctor to view Patient's Mood Entry history

5.8 THE System SHALL allow Doctor to view Patient's Exam results

5.9 THE System SHALL allow Doctor to update Appointment status and notes

5.10 WHEN Doctor attempts to access unassigned Patient, THE System SHALL deny access with error message

### Requirement 6: Secretary Dashboard and Features

**User Story:** As a Secretary, I want to manage appointments and administrative tasks, so that the clinic operates efficiently.

#### Acceptance Criteria

6.1 WHEN a Secretary logs in, THE System SHALL display a dashboard with all Appointments

6.2 THE System SHALL allow Secretary to create new Appointment for any Patient and Doctor

6.3 THE System SHALL allow Secretary to update Appointment date, time, and status

6.4 THE System SHALL allow Secretary to cancel Appointment with reason

6.5 THE System SHALL allow Secretary to view all Patients and Doctors

6.6 THE System SHALL allow Secretary to register new Patient with profile creation

6.7 THE System SHALL allow Secretary to update Patient contact information

6.8 THE System SHALL allow Secretary to view Doctor schedules and availability

6.9 WHEN Secretary creates Appointment, THE System SHALL validate Doctor availability

6.10 THE System SHALL prevent Secretary from accessing sensitive medical data

### Requirement 7: Admin Dashboard and Features

**User Story:** As an Admin, I want full system control, so that I can manage all entities and ensure system integrity.

#### Acceptance Criteria

7.1 WHEN an Admin logs in, THE System SHALL display a dashboard with system statistics

7.2 THE System SHALL allow Admin to create new User with any role

7.3 THE System SHALL allow Admin to update any User profile and role

7.4 THE System SHALL allow Admin to delete any User account

7.5 THE System SHALL allow Admin to view all Patients, Doctors, Appointments, Prescriptions, and Exams

7.6 THE System SHALL allow Admin to modify any Prescription, Exam, or Appointment

7.7 THE System SHALL allow Admin to delete any record with confirmation

7.8 THE System SHALL allow Admin to view audit logs of all data access

7.9 THE System SHALL allow Admin to export system data for compliance

7.10 THE System SHALL display warning message before Admin deletes any record

### Requirement 8: LGPD Compliance Features

**User Story:** As a data subject, I want to exercise my LGPD rights, so that I control my personal data.

#### Acceptance Criteria

8.1 THE System SHALL provide endpoint for User to export all personal data in JSON format

8.2 THE System SHALL provide endpoint for User to request account deletion

8.3 WHEN User requests account deletion, THE System SHALL schedule deletion after 30-day grace period

8.4 THE System SHALL provide endpoint for User to view data processing purposes

8.5 THE System SHALL provide endpoint for User to revoke consent

8.6 THE System SHALL log all access to sensitive health data with User ID, timestamp, and IP address

8.7 THE System SHALL display DPO contact information in privacy policy

8.8 WHEN User registers, THE System SHALL require explicit consent for sensitive health data processing

8.9 THE System SHALL retain medical records for minimum 20 years per CFM Resolution 1.821/2007

8.10 THE System SHALL encrypt sensitive health data at rest using AES-256-GCM

### Requirement 9: Progressive Web App (PWA) Features

**User Story:** As a User, I want to install the app on my mobile device, so that I have native-like experience.

#### Acceptance Criteria

9.1 THE System SHALL provide a web manifest file with app metadata

9.2 THE System SHALL register a service worker for offline functionality

9.3 WHEN User visits on mobile browser, THE System SHALL prompt to install app

9.4 WHEN User installs app, THE System SHALL display app icon on device home screen

9.5 THE System SHALL cache static assets for offline access

9.6 WHEN User is offline, THE System SHALL display cached content

9.7 THE System SHALL use responsive design optimized for mobile screens

9.8 THE System SHALL support touch gestures for mobile interaction

9.9 THE System SHALL display splash screen during app launch

9.10 THE System SHALL work on both Android and iOS devices

### Requirement 10: File Storage and Management

**User Story:** As a User, I want to upload and download exam files securely, so that medical records are accessible.

#### Acceptance Criteria

10.1 THE System SHALL use Supabase Storage for file uploads

10.2 THE System SHALL accept PDF, JPEG, and PNG file formats for Exams

10.3 WHERE file size exceeds 5MB, THE System SHALL reject upload with error message

10.4 WHEN Patient uploads Exam file, THE System SHALL store file with unique identifier

10.5 WHEN User downloads Exam file, THE System SHALL verify authorization before serving file

10.6 THE System SHALL generate signed URLs for secure file access

10.7 THE System SHALL organize files in buckets by type (exams, prescriptions)

10.8 WHEN User deletes Exam, THE System SHALL also delete associated file from storage

10.9 THE System SHALL scan uploaded files for malware before storage

10.10 THE System SHALL sanitize filenames to prevent path traversal attacks

### Requirement 11: Audit Logging and Monitoring

**User Story:** As a compliance officer, I want comprehensive audit logs, so that I can track all data access for LGPD compliance.

#### Acceptance Criteria

11.1 THE System SHALL log all User login attempts with timestamp and IP address

11.2 THE System SHALL log all access to sensitive health data with User ID and resource ID

11.3 THE System SHALL log all data modifications with before and after values

11.4 THE System SHALL log all data deletions with User ID and timestamp

11.5 THE System SHALL log all consent grants and revocations

11.6 THE System SHALL log all data export requests

11.7 THE System SHALL retain audit logs for minimum 5 years

11.8 WHEN security incident occurs, THE System SHALL log incident details immediately

11.9 THE System SHALL provide Admin interface to query audit logs

11.10 THE System SHALL export audit logs in CSV format for compliance reporting

### Requirement 12: Security and Data Protection

**User Story:** As a security officer, I want robust security measures, so that patient data is protected from unauthorized access.

#### Acceptance Criteria

12.1 THE System SHALL enforce HTTPS in production environment

12.2 THE System SHALL implement rate limiting of 100 requests per 15 minutes per IP

12.3 WHERE authentication endpoint is accessed, THE System SHALL limit to 5 attempts per 15 minutes

12.4 THE System SHALL validate and sanitize all User inputs before processing

12.5 THE System SHALL use parameterized queries to prevent SQL injection

12.6 THE System SHALL set security headers using Helmet middleware

12.7 THE System SHALL implement CORS with whitelist of allowed origins

12.8 THE System SHALL hash passwords using bcrypt with cost factor 12

12.9 THE System SHALL expire JWT tokens after 7 days

12.10 WHEN User changes password, THE System SHALL invalidate all existing tokens

### Requirement 13: Localization and Brazilian Standards

**User Story:** As a Brazilian User, I want the app in Portuguese with local formats, so that I can use it naturally.

#### Acceptance Criteria

13.1 THE System SHALL display all User-facing text in Portuguese (pt-BR)

13.2 THE System SHALL format dates as DD/MM/YYYY

13.3 THE System SHALL format times as HH:MM in 24-hour format

13.4 THE System SHALL format currency as R$ with Brazilian decimal separator

13.5 THE System SHALL format phone numbers as (XX) XXXXX-XXXX or (XX) XXXX-XXXX

13.6 WHERE User enters CPF, THE System SHALL validate using CPF algorithm

13.7 THE System SHALL format CPF as XXX.XXX.XXX-XX

13.8 THE System SHALL use America/Sao_Paulo timezone for all timestamps

13.9 THE System SHALL use Brazilian Portuguese medical terminology

13.10 THE System SHALL provide error messages in clear Portuguese

### Requirement 14: Performance and Scalability

**User Story:** As a User, I want fast page loads and responsive interactions, so that I can work efficiently.

#### Acceptance Criteria

14.1 WHEN User navigates to any page, THE System SHALL load page within 2 seconds

14.2 WHEN User submits form, THE System SHALL provide feedback within 1 second

14.3 THE System SHALL implement pagination for lists exceeding 50 items

14.4 THE System SHALL lazy load images and non-critical resources

14.5 THE System SHALL cache API responses where appropriate

14.6 THE System SHALL optimize database queries with proper indexes

14.7 THE System SHALL compress API responses using gzip

14.8 THE System SHALL minimize bundle size for faster initial load

14.9 THE System SHALL use code splitting for route-based loading

14.10 THE System SHALL support concurrent Users without performance degradation
