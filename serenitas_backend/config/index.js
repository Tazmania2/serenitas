/**
 * Configuration Index
 * 
 * Central export point for all configuration modules.
 */

const { supabase, supabaseAdmin, testConnection, getClientWithUser } = require('./supabase');
const constants = require('./constants');

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getClientWithUser,
  constants
};
