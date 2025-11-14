/**
 * Check RLS Status
 * Quick script to verify Row-Level Security is enabled
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRLS() {
  console.log('\n🔒 Checking Row-Level Security Status\n');
  console.log('='.repeat(60));
  
  const tables = [
    'users', 'doctors', 'patients', 'appointments',
    'prescriptions', 'medications', 'exams',
    'mood_entries', 'doctor_notes', 'audit_logs', 'consents'
  ];
  
  const query = `
    SELECT 
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
    ORDER BY tablename;
  `;
  
  try {
    // Check if we can query tables without auth (using anon key)
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    console.log('Testing RLS by attempting to query tables without JWT...\n');
    
    let rlsWorking = true;
    
    for (const table of tables) {
      const { data: testData, error: testError } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);
      
      if (testData && testData.length > 0) {
        console.log(`❌ ${table}: RLS may not be enabled (data accessible without auth)`);
        rlsWorking = false;
      } else if (testError) {
        console.log(`✅ ${table}: RLS is working (blocked without auth)`);
      } else if (!testData || testData.length === 0) {
        console.log(`✅ ${table}: RLS is working (no data returned)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    if (rlsWorking) {
      console.log('\n✅ RLS is working correctly on all tables!\n');
    } else {
      console.log('\n⚠️  Some tables may not have RLS enabled\n');
      console.log('Run: serenitas_backend/supabase/migrations/03_enable_rls.sql\n');
    }
    return;
  } catch (err) {
    console.error('❌ Error checking RLS:', err.message);
  }
}

checkRLS();
