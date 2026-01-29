---
phase: 03-auth-migration
plan: 06
subsystem: customer-auth
tags: [authentication, customer-accounts, order-history, supabase-auth, rls]

requires:
  - 03-03  # Backend auth middleware (requireAuth)
  - 03-04  # Frontend auth setup (AuthContext)

provides:
  - customer-account-system
  - customer-login-signup
  - customer-order-history
  - authenticated-checkout

affects:
  - 04  # Production Infrastructure (may need Google OAuth credentials)

tech-stack:
  added:
    - Supabase RLS policies for customer order access
  patterns:
    - optionalAuth middleware pattern (guest-or-authenticated)
    - per-request auth context in checkout flow
    - order-user linking via foreign key

key-files:
  created:
    - src/components/CustomerAuth.js
    - src/components/AccountPage.js
    - supabase/migrations/20260129000003_customer_orders_link.sql
  modified:
    - src/index.js
    - contact-backend/src/middleware/auth.js
    - contact-backend/src/services/database.js
    - contact-backend/server.js

decisions:
  - decision: "Add user_id to orders (nullable)"
    rationale: "Links orders to authenticated users while preserving guest checkout"
    date: 2026-01-29

  - decision: "Use optionalAuth middleware for checkout"
    rationale: "Checkout must work for both guests and authenticated users without requiring login"
    date: 2026-01-29

  - decision: "RLS policy for customer order viewing"
    rationale: "Customers can only see their own orders via auth.uid() = user_id check"
    date: 2026-01-29

  - decision: "Separate /api/customer/orders endpoint"
    rationale: "Customer endpoint filters by user_id, admin endpoint returns all orders"
    date: 2026-01-29

metrics:
  tasks: 4
  commits: 4
  files_created: 3
  files_modified: 4
  duration: 7 minutes
  completed: 2026-01-29
---

# Phase 3 Plan 6: Customer Account System Summary

**One-liner**: Customer authentication with email/password and Google OAuth, order history, and authenticated checkout linking

## What Was Built

### 1. Database Migration (user_id on orders)
- Added `user_id UUID` column to orders table with foreign key to `auth.users`
- Column is nullable to support guest checkout
- Created index on `user_id` for performance
- Added RLS policy: "Customers can view own orders"
- Applied migration successfully with `npx supabase db reset`

**Files**: `supabase/migrations/20260129000003_customer_orders_link.sql`

### 2. CustomerAuth Component
- Support for email/password login and signup
- Google OAuth integration with proper redirect
- Toggle between login and signup modes
- Loading states, error handling, success messages
- Auto-redirect when already authenticated
- Email confirmation message for signups

**Files**: `src/components/CustomerAuth.js`

### 3. AccountPage with Order History
- Protected route (requires authentication)
- Displays user email and order history
- Fetches orders from `/api/customer/orders` endpoint
- Shows order ID, date, items count, total, and status
- Status badges with color coding
- Sign out functionality
- Empty state with link to browse products

**Routes**: Added `#/login`, `#/signup`, and `#/account` to `src/index.js`

**Files**: `src/components/AccountPage.js`, `src/index.js`

### 4. Checkout Order Linking
- Created `optionalAuth` middleware (extracts user if present, continues if not)
- Updated `createOrder` to accept optional `userId` parameter
- Modified POST `/api/orders` to use `optionalAuth` middleware
- Extracts user from session and passes to `createOrder`
- Created GET `/api/customer/orders` endpoint for customer order history
- Orders by authenticated users now have `user_id` set
- Guest checkout continues to work with `user_id = NULL`

**Files**: `contact-backend/src/middleware/auth.js`, `contact-backend/src/services/database.js`, `contact-backend/server.js`

## Technical Details

### Order-User Linking Flow

**Authenticated Customer Checkout**:
1. Customer logs in via CustomerAuth
2. Session stored in cookies (managed by Supabase)
3. Customer places order
4. `optionalAuth` middleware extracts user from session
5. `createOrder` receives `userId`
6. Order saved with `user_id` field populated
7. Customer can view order in AccountPage

**Guest Checkout**:
1. Customer proceeds to checkout without login
2. `optionalAuth` middleware sets `req.user = null`
3. `createOrder` receives `userId = null`
4. Order saved with `user_id = NULL`
5. Order works exactly as before (backward compatible)

### Security Model

**RLS Policy**: `USING (auth.uid() = user_id)`
- Customers can only read orders where they are the owner
- Admin client bypasses RLS (uses `supabaseAdmin`)
- Service role policy still grants full access to backend

**Middleware Strategy**:
- `requireAuth`: Returns 401 if not authenticated (admin endpoints)
- `requireAdmin`: Returns 403 if not admin role (admin endpoints)
- `optionalAuth`: Continues regardless (checkout, mixed endpoints)

## Success Criteria Met

- [x] orders table has user_id column
- [x] CustomerAuth supports email/password and Google OAuth
- [x] AccountPage displays order history for logged-in users
- [x] Routes #/login, #/signup, #/account work
- [x] Guest checkout still possible (user_id nullable)
- [x] Orders placed by logged-in customers have user_id set correctly
- [x] Customer can see their orders in AccountPage after checkout

## Commits

| Hash    | Message                                                |
|---------|--------------------------------------------------------|
| d6921ba | feat(03-06): add user_id to orders for customer account linking |
| 9938fa0 | feat(03-06): create CustomerAuth component for login/signup |
| 097fd94 | feat(03-06): create AccountPage with order history and routes |
| c965ec5 | feat(03-06): wire checkout to link orders to authenticated users |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for**: Phase 4 (Production Infrastructure)

**Blockers**: None

**Notes**:
- Google OAuth will require production credentials (client ID/secret)
- Email confirmation may be enabled in production Supabase settings
- Consider adding password reset flow in future (not in current scope)

**Future Enhancements** (out of scope for v1.0):
- Password reset functionality
- Email verification required toggle
- Customer profile editing (name, addresses)
- Order detail view (expand to see items)
- Cancel order functionality (for pending orders)
- Saved addresses for faster checkout

## Key Learnings

1. **optionalAuth pattern**: Middleware that enhances requests with user context but doesn't block unauthenticated access. Critical for checkout flow.

2. **Nullable foreign keys**: Setting `user_id` to nullable preserves guest checkout while enabling authenticated order tracking.

3. **RLS for customer data**: Row-level security with `auth.uid() = user_id` ensures customers only see their own orders without backend filtering.

4. **Separate customer vs admin endpoints**: `/api/customer/orders` (filtered by user) vs `/api/orders` (admin-only, all orders).

## Integration Points

**Frontend**:
- `CustomerAuth` imported and routed in `index.js`
- `AccountPage` uses `ProtectedRoute` and `useAuth` hook
- Checkout flow unchanged (no UI changes needed)

**Backend**:
- `optionalAuth` middleware added to order creation endpoint
- New customer orders endpoint with `requireAuth` middleware
- Database service accepts optional `userId` parameter

**Database**:
- New `user_id` column on orders table
- New RLS policy for customer order viewing
- Index on `user_id` for query performance
