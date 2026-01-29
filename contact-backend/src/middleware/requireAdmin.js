// Admin authorization middleware for Express
// Verifies Supabase session AND checks for admin role in JWT claims
const { createClient } = require('../lib/supabase-ssr')

/**
 * Middleware to require admin authorization on protected routes
 * Verifies session using Supabase auth.getUser() and checks admin role
 * Admin role is stored in user.app_metadata.user_role (set by Auth Hook in 03-02)
 * Returns 401 if session is invalid, 403 if not admin
 */
async function requireAdmin(req, res, next) {
  try {
    // Create per-request Supabase client with cookie context
    const supabase = createClient({ req, res })

    // Verify session with auth server (CRITICAL: use getUser, not getSession)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check for admin role in app_metadata
    // This will be populated by the Auth Hook (created in plan 03-02)
    // Admin users have app_metadata.user_role = 'admin'
    const userRole = user.app_metadata?.user_role

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Attach user to request for downstream handlers
    req.user = user

    next()
  } catch (error) {
    console.error('Admin authorization error:', error)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

module.exports = {
  requireAdmin
}
