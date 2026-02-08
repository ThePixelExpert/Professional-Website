// Supabase SSR client factory for Express
// Creates per-request Supabase clients with cookie context
// DO NOT reuse clients across requests - each request needs its own client
const { createServerClient, parseCookieHeader, serializeCookieHeader } = require('@supabase/ssr')

/**
 * Creates a Supabase client for the current request with cookie handling
 * @param {Object} context - Express request/response context
 * @param {Object} context.req - Express request object
 * @param {Object} context.res - Express response object
 * @returns {Object} Supabase client configured for this request
 */
function createClient({ req, res }) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env'
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
        })
      }
    }
  })
}

module.exports = {
  createClient
}
