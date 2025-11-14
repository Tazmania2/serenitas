# Serenitas - Mental Health Clinic Management System

Serenitas is a comprehensive mental health clinic management platform consisting of a Node.js/Express backend API and a Progressive Web App (PWA) optimized for mobile use.

## Product Vision

A mobile-optimized web application that can be downloaded and installed on Android and iOS devices, providing a native-like experience for mental health clinic management.

**Location**: Brazil  
**Compliance**: LGPD (Lei Geral de Proteção de Dados Pessoais)  
**Healthcare Regulations**: CFM (Conselho Federal de Medicina), Medical Confidentiality (Sigilo Médico)  
**Client**: Clínica Serenitas

## Core Features

### Patient Features
- View and send exam results
- Check current prescribed remedies/medications
- Access full prescription history
- Read doctor's notes and recommendations
- Input weekly mood tracking
- Update personal health status
- Schedule and manage appointments

### Doctor Features
- View assigned patients
- Write and manage patient notes
- Create and manage prescriptions
- Review patient mood history and health status
- Manage appointment schedule
- Access patient exam results

### Secretary Features
- Manage appointment scheduling for all doctors
- Patient registration and profile management
- Administrative tasks and coordination
- Access to clinic-wide scheduling

### Admin Features
- Full CRUD access to all system entities
- User management (create, modify, delete users)
- System-wide oversight and reporting
- Configuration and settings management

## Access Levels

1. **Patient**: Limited to own data and interactions
2. **Doctor**: Access to assigned patients and clinical tools
3. **Secretary**: Administrative and scheduling access
4. **Admin**: Full system access and management

## Target Users

- Mental health patients seeking care management
- Doctors and therapists managing patient care
- Clinic administrative staff (secretaries)
- System administrators

## Architecture

The system follows a client-server architecture with:
- RESTful API backend for data management and business logic
- Progressive Web App (PWA) frontend for mobile-first, installable experience
- Database for persistent storage (MongoDB currently, considering Supabase migration)

## Design Principles

- Clean, clear interface using Clinica Serenitas brand colors
- Mobile-first responsive design
- Installable as native app on Android and iOS
- Role-based dashboards and navigation
- Intuitive user experience for all access levels
