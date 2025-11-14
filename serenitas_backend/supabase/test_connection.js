/**
 * Quick Supabase Connection Test
 * 
 * This script tests your Supabase connection and RLS setup
 * 
 * Usage: node supabase/test_connection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🔍 Testing Supabase Connection\n', 'cyan');
  log('='.repeat(60), 'blue');
  
  // Check environment variables
  log('\n📋 Checking Environment Variables...', 'yellow');
  
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
  let allVarsPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(`  ✅ ${varName}: Set`, 'green');
    } else {
      log(`  ❌ ${varName}: Missing`, 'red');
      allVarsPresent = false;
    }
  }
  
  if (!allVarsPresent) {
    log('\n❌ Missing required environment variables!', 'red');
    log('Please check your .env file\n', 'yellow');
    process.exit(1);
  }
  
  // Test with service role key (bypasses RLS)
  log('\n🔐 Testing with Service Role Key (bypasses RLS)...', 'yellow');
  
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Test connection by querying users table
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      log(`  ❌ Connection failed: ${error.message}`, 'red');
      process.exit(1);
    }
    
    log('  ✅ Connection successful!', 'green');
    log(`  📊 Users table has ${count} records`, 'cyan');
  } catch (err) {
    log(`  ❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
  
  // Test with anon key (respects RLS)
  log('\n🔓 Testing with Anon Key (respects RLS)...', 'yellow');
  
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // This should fail or return empty because no JWT is provided
    const { data, error } = await supabaseAnon
      .from('users')
      .select('*');
    
    if (error) {
      log('  ✅ RLS is working! (Query blocked without JWT)', 'green');
      log(`     Error: ${error.message}`, 'cyan');
    } else if (data && data.length === 0) {
      log('  ✅ RLS is working! (No data returned without JWT)', 'green');
    } else {
      log('  ⚠️  Warning: Data returned without JWT - RLS may not be configured correctly', 'yellow');
    }
  } catch (err) {
    log(`  ❌ Error: ${err.message}`, 'red');
  }
  
  // Check all tables exist
  log('\n📊 Checking Tables...', 'yellow');
  
  const tables = [
    'users', 'doctors', 'patients', 'appointments',
    'prescriptions', 'medications', 'exams',
    'mood_entries', 'doctor_notes', 'audit_logs', 'consents'
  ];
  
  for (const table of tables) {
    try {
      const { error, count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        log(`  ❌ ${table}: Error - ${error.message}`, 'red');
      } else {
        log(`  ✅ ${table}: ${count} records`, 'green');
      }
    } catch (err) {
      log(`  ❌ ${table}: ${err.message}`, 'red');
    }
  }
  
  // Check storage bucket
  log('\n📦 Checking Storage Bucket...', 'yellow');
  
  try {
    const { data: bucket, error } = await supabaseAdmin.storage.getBucket('exams');
    
    if (error) {
      log(`  ❌ Bucket "exams": ${error.message}`, 'red');
    } else {
      log('  ✅ Bucket "exams" exists', 'green');
      log(`     Public: ${bucket.public}`, 'cyan');
      log(`     File size limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024) + 'MB' : 'Not set'}`, 'cyan');
    }
  } catch (err) {
    log(`  ❌ Error checking bucket: ${err.message}`, 'red');
  }
  
  // Check helper functions
  log('\n🔧 Checking Helper Functions...', 'yellow');
  
  try {
    const { data, error } = await supabaseAdmin.rpc('get_user_id').catch(() => ({ data: null, error: null }));
    
    if (error && error.message.includes('does not exist')) {
      log('  ⚠️  Helper functions may not be created yet', 'yellow');
      log('     Make sure you ran 04_rls_policies.sql', 'cyan');
    } else {
      log('  ✅ Helper functions appear to be created', 'green');
    }
  } catch (err) {
    log('  ⚠️  Could not verify helper functions', 'yellow');
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('\n✅ Connection Test Complete!\n', 'green');
  
  log('Next Steps:', 'cyan');
  log('  1. If tables are empty, you can add test data', 'reset');
  log('  2. Update your backend to use Supabase client', 'reset');
  log('  3. Ensure JWT tokens include user_id and role claims', 'reset');
  log('  4. Test RLS policies with different user roles\n', 'reset');
}

// Run the test
testConnection().catch(err => {
  log(`\n❌ Test failed: ${err.message}\n`, 'red');
  process.exit(1);
});
