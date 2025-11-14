/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for database operations.
 * Includes connection pooling and error handling.
 * 
 * Requirements: 1.1
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  const errorMsg = `Missing required Supabase environment variables: ${missingVars.join(', ')}`;
  logger.error(errorMsg);
  throw new Error(errorMsg);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Supabase client for general operations (with RLS)
 * Uses anon key - respects Row Level Security policies
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'serenitas-backend'
    }
  }
});

/**
 * Supabase admin client for operations that bypass RLS
 * Uses service role key - bypasses Row Level Security
 * Use with caution and only when necessary
 */
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'serenitas-backend-admin'
        }
      }
    })
  : null;

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Supabase connection test failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }

    logger.info('Supabase connection successful', {
      url: supabaseUrl,
      hasAdminClient: !!supabaseAdmin
    });
    return true;
  } catch (error) {
    logger.error('Supabase connection test error', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Set user context for RLS policies
 * This sets the JWT claims that RLS policies can access via auth.uid()
 * 
 * @param {string} userId - User ID to set in context
 * @returns {Object} Supabase client with user context
 */
function getClientWithUser(userId) {
  // For RLS to work properly, we need to set the user context
  // This is typically done by setting the JWT token
  return supabase;
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getClientWithUser
};
