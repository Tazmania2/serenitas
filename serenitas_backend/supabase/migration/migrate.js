/**
 * MongoDB to Supabase Migration Script
 * Clínica Serenitas
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 * 
 * This script migrates data from MongoDB to Supabase PostgreSQL
 * 
 * Usage:
 *   node supabase/migration/migrate.js
 * 
 * Prerequisites:
 *   1. MongoDB connection configured in .env (MONGODB_URI)
 *   2. Supabase credentials configured in .env
 *   3. Supabase tables created (run migrations 01-05)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

// MongoDB Models
const User = require('../../models/User');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const Prescription = require('../../models/Prescription');
const Exam = require('../../models/Exam');
const MoodEntry = require('../../models/MoodEntry');

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key to bypass RLS
);

// Migration statistics
const stats = {
  users: { total: 0, migrated: 0, failed: 0 },
  doctors: { total: 0, migrated: 0, failed: 0 },
  patients: { total: 0, migrated: 0, failed: 0 },
  appointments: { total: 0, migrated: 0, failed: 0 },
  prescriptions: { total: 0, migrated: 0, failed: 0 },
  medications: { total: 0, migrated: 0, failed: 0 },
  exams: { total: 0, migrated: 0, failed: 0 },
  moodEntries: { total: 0, migrated: 0, failed: 0 }
};

// ID mapping (MongoDB ObjectId -> Supabase UUID)
const idMap = {
  users: new Map(),
  doctors: new Map(),
  patients: new Map(),
  appointments: new Map(),
  prescriptions: new Map()
};

/**
 * Transform MongoDB User to Supabase format
 */
function transformUser(mongoUser) {
  return {
    email: mongoUser.email,
    password_hash: mongoUser.password, // Already hashed by bcrypt
    name: mongoUser.name,
    phone: mongoUser.phone || null,
    role: mongoUser.role,
    created_at: mongoUser.createdAt,
    updated_at: mongoUser.updatedAt
  };
}

/**
 * Transform MongoDB Doctor to Supabase format
 */
function transformDoctor(mongoDoctor, userUuid) {
  return {
    user_id: userUuid,
    specialization: mongoDoctor.specialization,
    license_number: mongoDoctor.licenseNumber,
    consultation_fee: mongoDoctor.consultationFee || null,
    experience_years: mongoDoctor.experience || null,
    education: mongoDoctor.education || [],
    certifications: mongoDoctor.certifications || [],
    created_at: mongoDoctor.createdAt,
    updated_at: mongoDoctor.updatedAt
  };
}

/**
 * Transform MongoDB Patient to Supabase format
 */
function transformPatient(mongoPatient, userUuid, doctorUuid) {
  return {
    user_id: userUuid,
    doctor_id: doctorUuid || null,
    blood_type: mongoPatient.bloodType || null,
    height: mongoPatient.height || null,
    weight: mongoPatient.weight || null,
    emergency_contact_name: mongoPatient.emergencyContact?.name || null,
    emergency_contact_phone: mongoPatient.emergencyContact?.phone || null,
    emergency_contact_relationship: mongoPatient.emergencyContact?.relationship || null,
    medical_history: mongoPatient.medicalHistory || [],
    allergies: mongoPatient.allergies || [],
    insurance_provider: mongoPatient.insuranceProvider || null,
    insurance_number: mongoPatient.insuranceNumber || null,
    created_at: mongoPatient.createdAt,
    updated_at: mongoPatient.updatedAt
  };
}

/**
 * Transform MongoDB Appointment to Supabase format
 */
function transformAppointment(mongoAppointment, patientUuid, doctorUuid) {
  const appointmentDate = new Date(mongoAppointment.date);
  
  return {
    patient_id: patientUuid,
    doctor_id: doctorUuid,
    appointment_date: appointmentDate.toISOString().split('T')[0],
    appointment_time: mongoAppointment.time,
    duration_minutes: mongoAppointment.duration || 60,
    type: mongoAppointment.type || 'consultation',
    status: mongoAppointment.status || 'scheduled',
    notes: mongoAppointment.notes || null,
    symptoms: mongoAppointment.symptoms || [],
    diagnosis: mongoAppointment.diagnosis || null,
    treatment: mongoAppointment.treatment || null,
    created_at: mongoAppointment.createdAt,
    updated_at: mongoAppointment.updatedAt
  };
}

/**
 * Transform MongoDB Prescription to Supabase format
 */
function transformPrescription(mongoPrescription, patientUuid, doctorUuid, appointmentUuid) {
  const prescriptionDate = new Date(mongoPrescription.date);
  
  return {
    patient_id: patientUuid,
    doctor_id: doctorUuid,
    appointment_id: appointmentUuid || null,
    prescription_date: prescriptionDate.toISOString().split('T')[0],
    duration_days: mongoPrescription.duration,
    status: mongoPrescription.status || 'active',
    instructions: mongoPrescription.instructions || null,
    doctor_notes: mongoPrescription.doctorNotes || null,
    patient_notes: mongoPrescription.patientNotes || null,
    created_at: mongoPrescription.createdAt,
    updated_at: mongoPrescription.updatedAt
  };
}

/**
 * Transform MongoDB Medication to Supabase format
 */
function transformMedication(mongoMedication, prescriptionUuid) {
  return {
    prescription_id: prescriptionUuid,
    name: mongoMedication.name,
    dosage: mongoMedication.dosage,
    frequency: mongoMedication.frequency,
    quantity: mongoMedication.quantity,
    instructions: mongoMedication.instructions || null,
    is_taken: mongoMedication.isTaken || false,
    last_taken_at: mongoMedication.lastTaken || null,
    next_dose_time: mongoMedication.nextDose || null
  };
}

/**
 * Transform MongoDB Exam to Supabase format
 */
function transformExam(mongoExam, patientUuid, doctorUuid) {
  const examDate = new Date(mongoExam.date);
  
  return {
    patient_id: patientUuid,
    doctor_id: doctorUuid || null,
    exam_date: examDate.toISOString().split('T')[0],
    exam_type: mongoExam.type,
    exam_name: mongoExam.name,
    results: mongoExam.results || null,
    status: mongoExam.status || 'pending',
    notes: mongoExam.notes || null,
    doctor_notes: mongoExam.doctorNotes || null,
    file_url: mongoExam.fileUrl || null,
    file_size: mongoExam.fileSize ? parseInt(mongoExam.fileSize) : null,
    upload_date: mongoExam.uploadDate || null,
    created_at: mongoExam.createdAt,
    updated_at: mongoExam.updatedAt
  };
}

/**
 * Transform MongoDB MoodEntry to Supabase format
 */
function transformMoodEntry(mongoMoodEntry, patientUuid) {
  const entryDate = new Date(mongoMoodEntry.date);
  
  return {
    patient_id: patientUuid,
    entry_date: entryDate.toISOString().split('T')[0],
    mood_level: mongoMoodEntry.mood,
    stress_level: mongoMoodEntry.stressLevel || null,
    anxiety_level: mongoMoodEntry.anxietyLevel || null,
    depression_level: mongoMoodEntry.depressionLevel || null,
    sleep_hours: mongoMoodEntry.sleepHours || null,
    exercise_minutes: mongoMoodEntry.exerciseMinutes || null,
    social_interaction: mongoMoodEntry.socialInteraction || null,
    medication_taken: mongoMoodEntry.medicationTaken || false,
    notes: mongoMoodEntry.notes || null,
    activities: mongoMoodEntry.activities || [],
    created_at: mongoMoodEntry.createdAt
  };
}

/**
 * Migrate Users
 */
async function migrateUsers() {
  console.log('\n📋 Migrating Users...');
  
  const mongoUsers = await User.find({});
  stats.users.total = mongoUsers.length;
  
  for (const mongoUser of mongoUsers) {
    try {
      const supabaseUser = transformUser(mongoUser);
      
      const { data, error } = await supabase
        .from('users')
        .insert(supabaseUser)
        .select()
        .single();
      
      if (error) throw error;
      
      // Store ID mapping
      idMap.users.set(mongoUser._id.toString(), data.id);
      stats.users.migrated++;
      
      console.log(`  ✓ User: ${mongoUser.email} (${mongoUser.role})`);
    } catch (error) {
      stats.users.failed++;
      console.error(`  ✗ Failed to migrate user ${mongoUser.email}:`, error.message);
    }
  }
  
  console.log(`✅ Users: ${stats.users.migrated}/${stats.users.total} migrated`);
}

/**
 * Migrate Doctors
 */
async function migrateDoctors() {
  console.log('\n👨‍⚕️ Migrating Doctors...');
  
  const mongoDoctors = await Doctor.find({});
  stats.doctors.total = mongoDoctors.length;
  
  for (const mongoDoctor of mongoDoctors) {
    try {
      const userUuid = idMap.users.get(mongoDoctor.userId.toString());
      if (!userUuid) {
        throw new Error('User UUID not found in mapping');
      }
      
      const supabaseDoctor = transformDoctor(mongoDoctor, userUuid);
      
      const { data, error } = await supabase
        .from('doctors')
        .insert(supabaseDoctor)
        .select()
        .single();
      
      if (error) throw error;
      
      // Store ID mapping
      idMap.doctors.set(mongoDoctor._id.toString(), data.id);
      stats.doctors.migrated++;
      
      console.log(`  ✓ Doctor: ${mongoDoctor.specialization} (License: ${mongoDoctor.licenseNumber})`);
    } catch (error) {
      stats.doctors.failed++;
      console.error(`  ✗ Failed to migrate doctor:`, error.message);
    }
  }
  
  console.log(`✅ Doctors: ${stats.doctors.migrated}/${stats.doctors.total} migrated`);
}

/**
 * Migrate Patients
 */
async function migratePatients() {
  console.log('\n🏥 Migrating Patients...');
  
  const mongoPatients = await Patient.find({});
  stats.patients.total = mongoPatients.length;
  
  for (const mongoPatient of mongoPatients) {
    try {
      const userUuid = idMap.users.get(mongoPatient.userId.toString());
      if (!userUuid) {
        throw new Error('User UUID not found in mapping');
      }
      
      const doctorUuid = mongoPatient.doctorId 
        ? idMap.doctors.get(mongoPatient.doctorId.toString())
        : null;
      
      const supabasePatient = transformPatient(mongoPatient, userUuid, doctorUuid);
      
      const { data, error } = await supabase
        .from('patients')
        .insert(supabasePatient)
        .select()
        .single();
      
      if (error) throw error;
      
      // Store ID mapping
      idMap.patients.set(mongoPatient._id.toString(), data.id);
      stats.patients.migrated++;
      
      console.log(`  ✓ Patient: ${data.id}`);
    } catch (error) {
      stats.patients.failed++;
      console.error(`  ✗ Failed to migrate patient:`, error.message);
    }
  }
  
  console.log(`✅ Patients: ${stats.patients.migrated}/${stats.patients.total} migrated`);
}

/**
 * Migrate Appointments
 */
async function migrateAppointments() {
  console.log('\n📅 Migrating Appointments...');
  
  const mongoAppointments = await Appointment.find({});
  stats.appointments.total = mongoAppointments.length;
  
  for (const mongoAppointment of mongoAppointments) {
    try {
      const patientUuid = idMap.patients.get(mongoAppointment.patientId.toString());
      const doctorUuid = idMap.doctors.get(mongoAppointment.doctorId.toString());
      
      if (!patientUuid || !doctorUuid) {
        throw new Error('Patient or Doctor UUID not found in mapping');
      }
      
      const supabaseAppointment = transformAppointment(mongoAppointment, patientUuid, doctorUuid);
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(supabaseAppointment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Store ID mapping
      idMap.appointments.set(mongoAppointment._id.toString(), data.id);
      stats.appointments.migrated++;
      
      console.log(`  ✓ Appointment: ${data.appointment_date} ${data.appointment_time}`);
    } catch (error) {
      stats.appointments.failed++;
      console.error(`  ✗ Failed to migrate appointment:`, error.message);
    }
  }
  
  console.log(`✅ Appointments: ${stats.appointments.migrated}/${stats.appointments.total} migrated`);
}

/**
 * Migrate Prescriptions and Medications
 */
async function migratePrescriptions() {
  console.log('\n💊 Migrating Prescriptions...');
  
  const mongoPrescriptions = await Prescription.find({});
  stats.prescriptions.total = mongoPrescriptions.length;
  
  for (const mongoPrescription of mongoPrescriptions) {
    try {
      const patientUuid = idMap.patients.get(mongoPrescription.patientId.toString());
      const doctorUuid = idMap.doctors.get(mongoPrescription.doctorId.toString());
      const appointmentUuid = mongoPrescription.appointmentId
        ? idMap.appointments.get(mongoPrescription.appointmentId.toString())
        : null;
      
      if (!patientUuid || !doctorUuid) {
        throw new Error('Patient or Doctor UUID not found in mapping');
      }
      
      const supabasePrescription = transformPrescription(
        mongoPrescription,
        patientUuid,
        doctorUuid,
        appointmentUuid
      );
      
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(supabasePrescription)
        .select()
        .single();
      
      if (prescriptionError) throw prescriptionError;
      
      // Store ID mapping
      idMap.prescriptions.set(mongoPrescription._id.toString(), prescriptionData.id);
      stats.prescriptions.migrated++;
      
      // Migrate medications
      if (mongoPrescription.medications && mongoPrescription.medications.length > 0) {
        const medications = mongoPrescription.medications.map(med =>
          transformMedication(med, prescriptionData.id)
        );
        
        const { error: medicationsError } = await supabase
          .from('medications')
          .insert(medications);
        
        if (medicationsError) throw medicationsError;
        
        stats.medications.total += medications.length;
        stats.medications.migrated += medications.length;
        
        console.log(`  ✓ Prescription with ${medications.length} medications`);
      } else {
        console.log(`  ✓ Prescription (no medications)`);
      }
    } catch (error) {
      stats.prescriptions.failed++;
      console.error(`  ✗ Failed to migrate prescription:`, error.message);
    }
  }
  
  console.log(`✅ Prescriptions: ${stats.prescriptions.migrated}/${stats.prescriptions.total} migrated`);
  console.log(`✅ Medications: ${stats.medications.migrated}/${stats.medications.total} migrated`);
}

/**
 * Migrate Exams
 */
async function migrateExams() {
  console.log('\n🔬 Migrating Exams...');
  
  const mongoExams = await Exam.find({});
  stats.exams.total = mongoExams.length;
  
  for (const mongoExam of mongoExams) {
    try {
      const patientUuid = idMap.patients.get(mongoExam.patientId.toString());
      const doctorUuid = mongoExam.doctorId
        ? idMap.doctors.get(mongoExam.doctorId.toString())
        : null;
      
      if (!patientUuid) {
        throw new Error('Patient UUID not found in mapping');
      }
      
      const supabaseExam = transformExam(mongoExam, patientUuid, doctorUuid);
      
      const { error } = await supabase
        .from('exams')
        .insert(supabaseExam);
      
      if (error) throw error;
      
      stats.exams.migrated++;
      console.log(`  ✓ Exam: ${mongoExam.name} (${mongoExam.type})`);
    } catch (error) {
      stats.exams.failed++;
      console.error(`  ✗ Failed to migrate exam:`, error.message);
    }
  }
  
  console.log(`✅ Exams: ${stats.exams.migrated}/${stats.exams.total} migrated`);
}

/**
 * Migrate Mood Entries
 */
async function migrateMoodEntries() {
  console.log('\n😊 Migrating Mood Entries...');
  
  const mongoMoodEntries = await MoodEntry.find({});
  stats.moodEntries.total = mongoMoodEntries.length;
  
  for (const mongoMoodEntry of mongoMoodEntries) {
    try {
      const patientUuid = idMap.patients.get(mongoMoodEntry.patientId.toString());
      
      if (!patientUuid) {
        throw new Error('Patient UUID not found in mapping');
      }
      
      const supabaseMoodEntry = transformMoodEntry(mongoMoodEntry, patientUuid);
      
      const { error } = await supabase
        .from('mood_entries')
        .insert(supabaseMoodEntry);
      
      if (error) throw error;
      
      stats.moodEntries.migrated++;
      console.log(`  ✓ Mood Entry: ${mongoMoodEntry.date.toISOString().split('T')[0]}`);
    } catch (error) {
      stats.moodEntries.failed++;
      console.error(`  ✗ Failed to migrate mood entry:`, error.message);
    }
  }
  
  console.log(`✅ Mood Entries: ${stats.moodEntries.migrated}/${stats.moodEntries.total} migrated`);
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(stats).forEach(([entity, counts]) => {
    const successRate = counts.total > 0
      ? ((counts.migrated / counts.total) * 100).toFixed(1)
      : 0;
    
    console.log(`\n${entity.toUpperCase()}:`);
    console.log(`  Total:    ${counts.total}`);
    console.log(`  Migrated: ${counts.migrated} (${successRate}%)`);
    console.log(`  Failed:   ${counts.failed}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting MongoDB to Supabase Migration');
  console.log('='.repeat(60));
  
  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test Supabase connection
    console.log('\n📡 Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows, which is ok
    console.log('✅ Connected to Supabase');
    
    // Run migrations in order
    await migrateUsers();
    await migrateDoctors();
    await migratePatients();
    await migrateAppointments();
    await migratePrescriptions();
    await migrateExams();
    await migrateMoodEntries();
    
    // Print summary
    printSummary();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Run verification: node supabase/migration/verify.js');
    console.log('  2. Test RLS policies with different user roles');
    console.log('  3. Update backend to use Supabase client');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
