---
phase: 03-auth-migration
plan: 02
subsystem: auth
tags: [supabase, auth-hooks, rls, jwt, roles]

requires:
  - 02-01 (Initial schema with RLS foundation)

provides:
  - user_roles table for role-based authorization
  - custom_access_token_hook for JWT claim injection
  - Role enforcement infrastructure

affects:
  - 03-03 (Admin OAuth implementation will assign admin role)
  - 03-04 (Customer accounts will assign customer role)
  - Future RLS policies (can check auth.jwt()->>'user_role')

tech-stack:
  added:
    - Supabase Auth Hooks (custom claims)
  patterns:
    - Role-based authorization via JWT claims
    - RLS policy patterns for role enforcement

key-files:
  created:
    - supabase/migrations/20260129000001_user_roles.sql
    - supabase/migrations/20260129000002_auth_hook.sql
  modified: []

decisions:
  - decision: Store roles in dedicated user_roles table
    rationale: Cleaner separation, easier to audit, supports multiple roles per user
    alternatives: Store in auth.users metadata (less flexible, harder to query)

  - decision: Use Auth Hooks for JWT claim injection
    rationale: Supabase-native approach, claims available immediately without extra queries
    alternatives: Client-side role fetching (slower, requires extra API call)

  - decision: Support only 'admin' and 'customer' roles initially
    rationale: Matches current auth requirements, can extend CHECK constraint later
    alternatives: Free-text roles (less safe, harder to validate)

metrics:
  duration: 160s
  completed: 2026-01-29
---

# Phase 03 Plan 02: Role-Based Authorization Schema Summary

**One-liner:** Created user_roles table and Auth Hook to inject user_role claim into JWTs for role-based authorization

## What Was Built

### 1. User Roles Table (Migration 20260129000001)
- **Table structure:**
  - `user_id` (UUID FK to auth.users, ON DELETE CASCADE)
  - `role` (TEXT with CHECK constraint: 'admin' OR 'customer')
  - UNIQUE constraint on (user_id, role) prevents duplicate role assignments

- **RLS policies:**
  - Service role: Full access (for backend operations)
  - Users: Read-only access to their own roles (for client-side checks)

- **Performance:**
  - Index on user_id for fast role lookups

### 2. Custom Access Token Hook (Migration 20260129000002)
- **Function:** `public.custom_access_token_hook(event JSONB)`
- **Behavior:**
  - Queries user_roles table on JWT generation
  - Adds `user_role` claim to JWT (or null if no role assigned)
  - Returns modified JWT event to Supabase Auth

- **Security:**
  - SECURITY DEFINER with `search_path = public` to prevent injection
  - Granted to supabase_auth_admin, revoked from PUBLIC

- **Dashboard registration required:**
  - Navigate to Authentication > Hooks > Custom Access Token
  - Select function: public.custom_access_token_hook
  - (This is a manual step that cannot be automated via migration)

## Technical Implementation

### Migration Flow
1. **20260129000001_user_roles.sql** - Creates table, RLS, indexes
2. **20260129000002_auth_hook.sql** - Creates hook function, sets permissions

### JWT Claim Structure
After hook registration, JWTs will contain:
```json
{
  "user_role": "admin",  // or "customer", or null
  // ... other standard claims
}
```

### RLS Policy Example (Future Usage)
```sql
-- Admin-only access example
CREATE POLICY "Admins can manage orders" ON orders
  FOR ALL USING (auth.jwt()->>'user_role' = 'admin');

-- User can access own data
CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (
    auth.uid() = customer_id
    OR auth.jwt()->>'user_role' = 'admin'
  );
```

## Deviations from Plan

None - plan executed exactly as written.

## Commit History

| Commit  | Type | Description |
|---------|------|-------------|
| 9dd055c | feat | Create user_roles table migration |
| 5c62f4f | feat | Create auth hook for custom JWT claims |

## Verification Results

All verifications passed:

1. **Migrations exist in correct order:**
   - ✓ 20260129000001_user_roles.sql
   - ✓ 20260129000002_auth_hook.sql

2. **Database schema verified:**
   - ✓ user_roles table exists with correct structure
   - ✓ RLS enabled (relrowsecurity = true)
   - ✓ Foreign key constraint to auth.users with CASCADE
   - ✓ CHECK constraint limits roles to 'admin' or 'customer'
   - ✓ UNIQUE constraint on (user_id, role)
   - ✓ Index idx_user_roles_user_id created

3. **Auth Hook verified:**
   - ✓ custom_access_token_hook function exists
   - ✓ Signature: (event jsonb) RETURNS jsonb
   - ✓ Function queries user_roles table
   - ✓ Permissions: Granted to supabase_auth_admin

4. **RLS policies verified:**
   - ✓ "Service role has full access" (FOR ALL)
   - ✓ "Users can read own roles" (FOR SELECT)

## Next Phase Readiness

### Ready for Phase 03-03 (Admin OAuth)
- ✓ user_roles table ready to receive admin role assignments
- ✓ Auth Hook ready to inject role into JWT
- ⚠ **Manual step required:** Register Auth Hook in Supabase Dashboard

### Integration Requirements
1. **Auth Hook Registration (REQUIRED):**
   - Dashboard: Authentication > Hooks > Custom Access Token
   - Function: public.custom_access_token_hook
   - Status: Must be done before testing role-based features

2. **Role Assignment Pattern:**
   ```sql
   -- Insert admin role after OAuth login
   INSERT INTO public.user_roles (user_id, role)
   VALUES (auth.uid(), 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. **Role Verification Pattern:**
   ```javascript
   // Client-side (after hook registration)
   const { data: { session } } = await supabase.auth.getSession();
   const userRole = session?.user?.user_metadata?.user_role;

   // Backend (via JWT claim)
   const role = jwt.user_role; // Available after hook registration
   ```

### Known Limitations
- Auth Hook registration is manual (not automatable via migration)
- Local development: Hook works in Supabase Studio but requires dashboard registration
- Multiple roles per user: Supported by schema but hook returns only first role (LIMIT 1)
  - If multiple roles needed, hook logic would need to return array

### Blockers
None - phase ready to proceed with admin OAuth implementation.

## Success Criteria Met

- ✓ user_roles table created with proper constraints and RLS
- ✓ custom_access_token_hook function created with correct logic
- ✓ Migrations apply without errors
- ✓ Schema matches expected structure
- ✓ RLS policies enforce service_role and user-own-roles access
- ✓ Performance index created on user_id

---

*Completed: 2026-01-29*
*Duration: 160 seconds*
