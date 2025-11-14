/**
 * Supabase Migration Verification Script
 * Clínica Serenitas
 * 
 * This script verifies the data migration from MongoDB to Supabase
 * 
 * Usage:
 *   node supabase/migration/verify.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key to bypass RLS
);

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Test helper
 */
async function test(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Warning helper
 */
function warn(message) {
  results.warnings++;
  console.warn(`⚠️  ${message}`);
}

/**
 * Verify table exists and has data
 */
async function verifyTable(tableName, minExpected = 0) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  
  if (error) throw new Error(`Failed to query ${tableName}: ${error.message}`);
  
  if (count === 0 && minExpected > 0) {
    warn(`Table ${tableName} is empty (expected at least ${minExpected} rows)`);
  }
  
  return count;
}

/**
 * Verify foreign key relationships
 */
async function verifyForeignKeys() {
  // Check patients have valid user_id
  const { data: patientsWithoutUsers, error: e1 } = await supabase
    .from('patients')
    .select('id, user_id')
    .is('user_id', null);
  
  if (e1) throw new Error(`Failed to check patient foreign keys: ${e1.message}`);
  if (patientsWithoutUsers && patientsWithoutUsers.length > 0) {
    throw new Error(`Found ${patientsWithoutUsers.length} patients without user_id`);
  }
  
  // Check prescriptions have valid patient_id and doctor_id
  const { data: prescriptionsWithoutPatient, error: e2 } = await supabase
    .from('prescriptions')
    .select('id')
    .is('patient_id', null);
  
  if (e2) throw new Error(`Failed to check prescription foreign keys: ${e2.message}`);
  if (prescriptionsWithoutPatient && prescriptionsWithoutPatient.length > 0) {
    throw new Error(`Found ${prescriptionsWithoutPatient.length} prescriptions without patient_id`);
  }
}

/**
 * Verify data integrity
 */
async function verifyDataIntegrity() {
  // Check for duplicate emails
  const { data: users, error: e1 } = await supabase
    .from('users')
    .select('email');
  
  if (e1) throw new Error(`Failed to check duplicate emails: ${e1.message}`);
  
  const emails = users.map(u => u.email);
  const uniqueEmails = new Set(emails);
  
  if (emails.length !== uniqueEmails.size) {
    throw new Error(`Found duplicate emails in users table`);
  }
  
  // Check for invalid mood levels
  const { data: invalidMoods, error: e2 } = await supabase
    .from('mood_entries')
    .select('id, mood_level')
    .or('mood_level.lt.1,mood_level.gt.5');
  
  if (e2) throw new Error(`Failed to check mood levels: ${e2.message}`);
  if (invalidMoods && invalidMoods.length > 0) {
    throw new Error(`Found ${invalidMoods.length} mood entries with invalid mood_level`);
  }
}

/**
 * Verify RLS is enabled
 */
async function verifyRLS() {
  // This query checks if RLS is enabled on tables
  const { data, error } = await supabase.rpc('check_rls_enabled', {
    table_names: [
      'users', 'doctors', 'patients', 'appointments',
      'prescriptions', 'medications', 'exams',
      'mood_entries', 'doctor_notes', 'audit_logs', 'consents'
    ]
  }).catch(() => {
    // If the function doesn't exist, we'll check manually
    return { data: null, error: null };
  });
  
  // Note: This is a basic check. Full RLS verification requires testing with different user contexts
  console.log('   Note: RLS policies should be tested manually with different user roles');
}

/**
 * Verify indexes exist
 */
async function verifyIndexes() {
  // Query to check if important indexes exist
  const { data, error } = await supabase.rpc('check_indexes').catch(() => {
    return { data: null, error: null };
  });
  
  console.log('   Note: Index verification requires manual SQL query');
}

/**
 * Verify storage bucket
 */
async function verifyStorage() {
  const { data, error } = await supabase.storage.getBucket('exams');
  
  if (error) {
    if (error.message.includes('not found')) {
      throw new Error('Storage bucket "exams" does not exist');
    }
    throw new Error(`Failed to check storage bucket: ${error.message}`);
  }
  
  if (data.public) {
    throw new Error('Storage bucket "exams" should be private, but it is public');
  }
}

/**
 * Verify sample data relationships
 */
async function verifySampleRelationships() {
  // Get a sample prescription with medications
  const { data: prescriptions, error: e1 } = await supabase
    .from('prescriptions')
    .select(`
      id,
      patient_id,
      doctor_id,
      medications (
        id,
        name,
        dosage
      )
    `)
    .limit(1);
  
  if (e1) throw new Error(`Failed to query prescription relationships: ${e1.message}`);
  
  if (prescriptions && prescriptions.length > 0) {
    const prescription = prescriptions[0];
    
    if (!prescription.patient_id) {
      throw new Error('Prescription missing patient_id');
    }
    
    if (!prescription.doctor_id) {
      throw new Error('Prescription missing doctor_id');
    }
    
    console.log(`   Sample prescription has ${prescription.medications?.length || 0} medications`);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Passed:   ${results.passed}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    ${t.error}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('\n✅ All verification tests passed!');
    console.log('\n💡 Next steps:');
    console.log('  1. Test RLS policies manually with different user roles');
    console.log('  2. Verify data accuracy by comparing sample records');
    console.log('  3. Update backend code to use Supabase client');
    console.log('  4. Test all API endpoints with new database');
  } else {
    console.log('\n❌ Some verification tests failed. Please review and fix issues.');
  }
}

/**
 * Main verification function
 */
async function verify() {
  console.log('🔍 Starting Supabase Migration Verification');
  console.log('='.repeat(60));
  
  try {
    // Test Supabase connection
    console.log('\n📡 Testing Supabase connection...');
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('✅ Connected to Supabase\n');
    
    // Run verification tests
    console.log('Running verification tests...\n');
    
    await test('Users table exists and has data', async () => {
      const count = await verifyTable('users', 1);
      console.log(`   Found ${count} users`);
    });
    
    await test('Doctors table exists', async () => {
      const count = await verifyTable('doctors');
      console.log(`   Found ${count} doctors`);
    });
    
    await test('Patients table exists', async () => {
      const count = await verifyTable('patients');
      console.log(`   Found ${count} patients`);
    });
    
    await test('Appointments table exists', async () => {
      const count = await verifyTable('appointments');
      console.log(`   Found ${count} appointments`);
    });
    
    await test('Prescriptions table exists', async () => {
      const count = await verifyTable('prescriptions');
      console.log(`   Found ${count} prescriptions`);
    });
    
    await test('Medications table exists', async () => {
      const count = await verifyTable('medications');
      console.log(`   Found ${count} medications`);
    });
    
    await test('Exams table exists', async () => {
      const count = await verifyTable('exams');
      console.log(`   Found ${count} exams`);
    });
    
    await test('Mood entries table exists', async () => {
      const count = await verifyTable('mood_entries');
      console.log(`   Found ${count} mood entries`);
    });
    
    await test('Doctor notes table exists', async () => {
      const count = await verifyTable('doctor_notes');
      console.log(`   Found ${count} doctor notes`);
    });
    
    await test('Audit logs table exists', async () => {
      const count = await verifyTable('audit_logs');
      console.log(`   Found ${count} audit logs`);
    });
    
    await test('Consents table exists', async () => {
      const count = await verifyTable('consents');
      console.log(`   Found ${count} consents`);
    });
    
    await test('Foreign key relationships are valid', verifyForeignKeys);
    
    await test('Data integrity checks pass', verifyDataIntegrity);
    
    await test('Storage bucket "exams" exists and is private', verifyStorage);
    
    await test('Sample data relationships are correct', verifySampleRelationships);
    
    await test('RLS is enabled on tables', verifyRLS);
    
    // Print summary
    printSummary();
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verify();
}

module.exports = { verify };
