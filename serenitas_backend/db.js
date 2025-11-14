/**
 * Database Connection Module
 * 
 * Now using Supabase instead of MongoDB
 * This file is kept for backward compatibility but no longer connects to MongoDB
 */

const { testConnection } = require('./config/supabase');
const logger = require('./utils/logger');

const connectDB = async () => {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Supabase connected successfully');
      logger.info('Supabase database connection established');
    } else {
      console.log('⚠️  Supabase connection test failed');
      logger.warn('Supabase connection test failed, but continuing...');
    }
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    logger.error('Supabase connection error', { error: err.message });
    console.log('⚠️  Continuing without database connection...');
  }
};

module.exports = connectDB; 