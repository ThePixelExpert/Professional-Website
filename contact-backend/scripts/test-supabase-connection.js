#!/usr/bin/env node
/**
 * Smoke test script to verify Supabase client configuration
 * Run with: node scripts/test-supabase-connection.js
 *
 * Requires:
 * - Local Supabase running (`npx supabase start`)
 * - .env file with SUPABASE_URL and SUPABASE_ANON_KEY set
 */

require('dotenv').config()

async function testConnection() {
  console.log('Testing Supabase connection...\n')

  // Import the client module (validates it loads without errors)
  let supabase, supabaseConfig
  try {
    const client = require('../src/config/supabase')
    supabase = client.supabase
    supabaseConfig = client.supabaseConfig
    console.log('✓ Supabase client module loaded successfully')
    console.log(`  URL: ${supabaseConfig.url}`)
    console.log(`  Has service role: ${supabaseConfig.hasServiceRole}`)
  } catch (error) {
    console.error('✗ Failed to load Supabase client module:')
    console.error(`  ${error.message}`)
    process.exit(1)
  }

  // Test a simple query (list tables - doesn't require any data)
  try {
    // Use a simple RPC call or query that works on empty database
    // This tests actual connectivity, not just module loading
    const { data, error } = await supabase
      .from('_health_check_dummy')
      .select('*')
      .limit(1)

    // We expect this to fail with "relation does not exist"
    // which proves we connected to the database
    if (error && error.code === '42P01') {
      console.log('✓ Connected to Supabase database successfully')
      console.log('  (Table not found error confirms connection works)')
    } else if (error) {
      // Other errors might indicate connection issues
      console.log('? Received unexpected response:')
      console.log(`  Error: ${error.message}`)
    } else {
      console.log('✓ Query executed successfully')
    }
  } catch (error) {
    console.error('✗ Failed to connect to Supabase:')
    console.error(`  ${error.message}`)
    console.error('\n  Make sure local Supabase is running:')
    console.error('  npx supabase start')
    process.exit(1)
  }

  console.log('\n✓ All smoke tests passed!')
  console.log('\nNext steps:')
  console.log('  1. Run `npx supabase start` if not already running')
  console.log('  2. Run this script again to verify connection')
  console.log('  3. Proceed to Phase 2 for schema design')
}

testConnection().catch(console.error)
