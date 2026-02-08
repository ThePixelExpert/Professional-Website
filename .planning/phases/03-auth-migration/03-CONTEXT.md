# Phase 3: Auth Migration - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace JWT authentication with Supabase Auth, implementing OAuth for admin users and optional customer accounts for order tracking. Session management will be handled via Supabase Auth, and all protected routes will be updated to work with the new authentication flow.

</domain>

<decisions>
## Implementation Decisions

### Admin auth flow
- Google OAuth only (single provider, simple configuration)
- Dedicated `/admin/login` route for admin authentication
- After successful OAuth login, always redirect to admin dashboard home (`/admin`)
- Admin authorization enforcement: Claude's discretion (choose between email whitelist, role-based, or other approach)

### Customer accounts
- Guest checkout remains available (customers can order without creating an account)
- Account creation timing: Claude's discretion (determine optimal moment to offer account creation)
- Customer authentication: OAuth (Google) OR email + password (provide both options)
- Customer accounts provide access to:
  - Order history (view past orders, tracking info, invoices)
  - Saved shipping addresses (store addresses for faster checkout)
  - Payment methods (saved cards via Stripe)

### Session management
- Admin session duration: Use Supabase defaults
- Customer session duration: Longer than admin (e.g., 30 days for convenience)
- Session refresh: Hard expiry (no automatic refresh, requires re-login at expiration)
- Logout behavior: Sign out everywhere (revoke all sessions across all devices)

### Protected routes
- Auth checks: Both frontend and backend
  - Frontend route guards for UX (React checks auth state)
  - Backend API verification for security (Express middleware verifies Supabase session)
- Unauthorized access: Different behavior for admin vs customer routes
  - Specific handling: Claude's discretion (determine appropriate flows for each user type)
- Loading state during auth check: Loading spinner (simple spinner while checking authentication)

### Claude's Discretion
- Admin authorization method (email whitelist, role-based, or other secure approach)
- Timing of customer account creation offers (before/after checkout, or both)
- Specific unauthorized access behaviors for admin vs customer routes
- Error state handling and messaging

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following Supabase Auth best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-auth-migration*
*Context gathered: 2026-01-29*
