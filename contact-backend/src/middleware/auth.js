// Authentication middleware for Express
// Verifies Supabase session and attaches user to request
const { createClient } = require('../lib/supabase-ssr')

/**
 * Middleware to require authentication on protected routes
 * Verifies session using Supabase auth.getUser() (NOT getSession() for security)
 * Attaches user object to req.user if authenticated
 * Returns 401 if session is invalid or missing
 */
async function requireAuth(req, res, next) {
  try {
    // Create per-request Supabase client with cookie context
    const supabase = createClient({ req, res })

    // Verify session with auth server (CRITICAL: use getUser, not getSession)
    // getUser() validates the JWT with the auth server
    // getSession() only reads the JWT locally without verification
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Attach user to request for downstream handlers
    req.user = user

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

module.exports = {
  requireAuth
}
