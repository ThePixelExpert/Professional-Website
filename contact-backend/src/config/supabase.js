// Supabase client configuration
// Supports both local development (CLI) and production (self-hosted)
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env'
  )
}

// Public client - uses anon key, respects RLS policies
// Use this for operations that should respect row-level security
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false  // Server-side: no localStorage available
  }
})

// Admin client - uses service_role key, bypasses RLS
// Use this ONLY for admin operations that need full database access
// NEVER expose this client to frontend or pass service_role key to browser
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

function hasAdminClient() {
  return supabaseAdmin !== null
}

const supabaseConfig = {
  url: supabaseUrl,
  hasServiceRole: !!supabaseServiceKey
}

module.exports = {
  supabase,
  supabaseAdmin,
  hasAdminClient,
  supabaseConfig
}
