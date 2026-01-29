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
    // Check for Authorization header first (for frontend fetch requests)
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Create Supabase client and verify token
      const supabase = createClient({ req, res })
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (user && !error) {
        req.user = user
        return next()
      }
      // If token is invalid, fall through to cookie check below
    }

    // Fall back to cookie-based auth (for SSR/admin routes)
    const supabase = createClient({ req, res })
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

/**
 * Optional authentication middleware
 * Extracts user if authenticated, but continues if not
 * Used for endpoints that work for both guests and authenticated users
 * Sets req.user to user object if authenticated, null if not
 */
async function optionalAuth(req, res, next) {
  try {
    // Create per-request Supabase client with cookie context
    const supabase = createClient({ req, res })

    // Try to get user, but don't fail if not authenticated
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // No valid session - continue as guest
      req.user = null
      return next()
    }

    // Valid session - attach user
    req.user = user
    next()
  } catch (error) {
    // Error checking auth - continue as guest (don't block request)
    console.error('Optional auth error:', error)
    req.user = null
    next()
  }
}

module.exports = {
  requireAuth,
  optionalAuth
}
