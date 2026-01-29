# Phase 3: Auth Migration - Research

**Researched:** 2026-01-29
**Domain:** Supabase Auth with OAuth (Google), Express.js middleware, React auth state management
**Confidence:** MEDIUM

## Summary

Supabase Auth provides a complete authentication solution with built-in OAuth providers, session management, and JWT-based authorization. The migration from JWT to Supabase Auth requires implementing the `@supabase/ssr` package for server-side Express.js middleware and `@supabase/supabase-js` (v2.93.2 already installed) for React client-side state management.

The standard architecture separates concerns: React manages auth UI state using `onAuthStateChange` listeners, Express middleware verifies sessions using `auth.getUser()` (not `getSession()`), and authorization is enforced through custom claims added via Auth Hooks and RLS policies. OAuth with PKCE flow is the recommended security standard for all authentication flows.

**Primary recommendation:** Use cookie-based session storage via `@supabase/ssr` for Express (security + SSR support), implement Auth Hooks for role-based admin authorization, and always verify sessions server-side with `auth.getUser()` to prevent security vulnerabilities.

## Standard Stack

The established libraries/tools for Supabase Auth integration:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.93.2 | Client library for auth operations | Official SDK, handles OAuth, sessions, JWT management |
| `@supabase/ssr` | latest | Server-side client creation with cookie support | Replaces deprecated auth-helpers, required for Express SSR |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cookie-parser` | latest | Parse cookies in Express middleware | Required for reading Supabase auth cookies |
| `jwt-decode` | latest | Decode JWTs client-side | Reading custom claims in React without verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | Passport.js + custom OAuth | More control, but must hand-roll session management, refresh tokens, PKCE flow |
| Auth Hooks for roles | Manual database tables only | Simpler but requires app-level checks; Auth Hooks put claims in JWT for RLS |
| Cookie storage | localStorage | Simpler client-side but vulnerable to XSS; cookies with httpOnly flag are more secure |

**Installation:**
```bash
# Backend (contact-backend/)
npm install @supabase/ssr cookie-parser

# Frontend (already has @supabase/supabase-js via dependencies)
# May need to add explicitly if not present
npm install @supabase/supabase-js jwt-decode
```

## Architecture Patterns

### Recommended Project Structure
```
contact-backend/src/
├── config/
│   └── supabase.js              # Client configuration (already exists)
├── middleware/
│   ├── auth.js                  # Auth verification middleware
│   └── requireAdmin.js          # Admin authorization check
├── lib/
│   └── supabase-ssr.js          # SSR client creator with cookie handling
└── services/                     # Existing services pattern

src/ (React)
├── contexts/
│   └── AuthContext.js           # Auth state provider
├── components/
│   ├── ProtectedRoute.js        # Route guard wrapper
│   └── AdminRoute.js            # Admin-specific route guard
└── lib/
    └── supabase.js              # Browser client configuration
```

### Pattern 1: Express SSR Client Creation

**What:** Create Supabase clients per-request with cookie handling
**When to use:** Every Express route that needs auth verification

**Example:**
```javascript
// contact-backend/src/lib/supabase-ssr.js
const { createServerClient, parseCookieHeader, serializeCookieHeader } = require('@supabase/ssr');

function createClient(context) {
  return createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.req.headers.cookie ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
          );
        },
      },
    }
  );
}

module.exports = { createClient };
```

Source: [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

### Pattern 2: Express Auth Middleware

**What:** Verify user sessions on every protected API route
**When to use:** Wrap all protected Express routes

**Example:**
```javascript
// contact-backend/src/middleware/auth.js
const { createClient } = require('../lib/supabase-ssr');

async function requireAuth(req, res, next) {
  const supabase = createClient({ req, res });

  // CRITICAL: Use getUser(), NOT getSession()
  // getUser() validates with auth server, getSession() only checks local JWT
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };
```

Source: [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

### Pattern 3: React Auth State Management

**What:** Global auth context with session persistence and state change listeners
**When to use:** Wrap entire React app to provide auth state

**Example:**
```javascript
// src/contexts/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

Source: [Supabase React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)

### Pattern 4: OAuth with PKCE Flow

**What:** Secure OAuth flow with code challenge/verifier
**When to use:** All OAuth provider implementations (Google, GitHub, etc.)

**Example:**
```javascript
// Admin login - Google OAuth
async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}#/admin`,
      queryParams: {
        access_type: 'offline',  // Get refresh token
        prompt: 'consent',       // Force consent screen
      }
    }
  });

  if (error) console.error('Login error:', error.message);
}

// Callback handling (happens automatically)
// Supabase handles PKCE code exchange and sets session cookies
```

**Security note:** Supabase automatically uses PKCE flow. Code has 5-minute validity and can only be exchanged once.

Source: [PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow)

### Pattern 5: Role-Based Authorization with Auth Hooks

**What:** Add custom claims to JWT via database function
**When to use:** Admin authorization, role-based access control

**Implementation:**
```sql
-- 1. Create user_roles table
create table public.user_roles (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'customer')),
  unique (user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- 2. Create Custom Access Token Hook
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Fetch user role
  select role into user_role
  from public.user_roles
  where user_id = (event->>'user_id')::uuid
  limit 1;

  claims := event->'claims';

  -- Add custom claim
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- 3. Register hook in Supabase Dashboard
-- Navigate to: Authentication > Hooks > Custom Access Token
-- Select: public.custom_access_token_hook
```

**Accessing claims in Express:**
```javascript
async function requireAdmin(req, res, next) {
  const supabase = createClient({ req, res });

  // getClaims() validates JWT signature and extracts claims
  const { data: { claims }, error } = await supabase.auth.getClaims();

  if (error || claims?.user_role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.user = claims;
  next();
}
```

Source: [Custom Claims & RBAC Documentation](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)

### Pattern 6: Protected Routes in React

**What:** Route guard component that redirects unauthenticated users
**When to use:** Wrap protected pages/routes

**Example:**
```javascript
// src/components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;  // Spinner component
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role if required (read from JWT)
  if (requiredRole) {
    const token = user.app_metadata?.claims || {};
    if (token.user_role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
```

**Note:** HashRouter limitations - `location.state` doesn't persist across redirects, so store redirect destination in sessionStorage if needed.

Source: [React Router Protected Routes](https://blog.logrocket.com/authentication-react-router-v6/)

### Anti-Patterns to Avoid

- **Using `getSession()` server-side:** Doesn't revalidate token with auth server; use `getUser()` or `getClaims()` instead
- **Storing roles in `user_metadata`:** User-editable without validation; creates privilege escalation risk
- **Sharing single Supabase client across requests:** Each request needs its own client with cookie context
- **Trusting JWTs without verification:** JWTs remain valid until expiry even after signOut (use `getUser()`)
- **Using service_role key client-side:** Bypasses all RLS; NEVER expose to frontend
- **localStorage for sessions in SSR apps:** Vulnerable to XSS; use httpOnly cookies via `@supabase/ssr`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow implementation | Custom OAuth state/PKCE/callback handling | Supabase `signInWithOAuth()` | Handles PKCE security, code exchange, token refresh, state validation automatically |
| Session refresh logic | Custom token refresh with timers | Supabase auto-refresh | Handles refresh token rotation, race conditions, retry logic |
| JWT verification | Custom JWT decode + signature check | `auth.getUser()` or `auth.getClaims()` | Validates against JWKS endpoint, handles key rotation, checks revocation |
| Cookie-based session storage | Custom cookie serialization/parsing | `@supabase/ssr` package | Handles cookie options (httpOnly, secure, sameSite), expiry, domain config |
| Multi-device session management | Custom session tracking DB | Supabase signOut scopes | Built-in global/local/others session revocation across devices |
| Role-based claims in JWT | Manual JWT modification | Auth Hooks (Custom Access Token) | Official extension point, runs before token issuance, type-safe |

**Key insight:** Supabase Auth handles the complex edge cases of OAuth security (PKCE, refresh token rotation, state validation), session management (multi-device, revocation, refresh timing), and JWT security (signature verification, key rotation, claims validation). Custom implementations consistently miss edge cases that lead to security vulnerabilities.

## Common Pitfalls

### Pitfall 1: Using `getSession()` Instead of `getUser()` Server-Side

**What goes wrong:** Server code uses `supabase.auth.getSession()` to verify authentication, allowing revoked or expired sessions to access protected routes.

**Why it happens:** `getSession()` only checks the locally stored JWT without validating with the auth server. Documentation warns: "never trust `supabase.auth.getSession()` inside server code such as middleware" because "it isn't guaranteed to revalidate the Auth token."

**How to avoid:**
- Always use `auth.getUser()` in Express middleware (validates with auth server)
- Use `auth.getClaims()` for faster local JWT verification (validates signature, but not revocation)
- Understand the tradeoff: `getUser()` = more secure but slower; `getClaims()` = faster but doesn't check revocation

**Warning signs:**
- Logged-out users can still access protected routes
- Old sessions remain valid after password change
- Token expiry doesn't invalidate access

Source: [Creating a Supabase Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

### Pitfall 2: Missing Row Level Security Policies

**What goes wrong:** Supabase generates REST APIs from your schema, but RLS is opt-in. Without RLS, the anon API key becomes "a master key to your entire database."

**Why it happens:** RLS must be manually enabled per table and policies written. CVE-2025-48757 affected 170+ applications in 2025 due to missing RLS policies.

**How to avoid:**
- Enable RLS on ALL tables: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Write policies for every table that uses auth: `CREATE POLICY ...`
- Run Supabase Security Advisor tool in dashboard before deployment
- Never expose `service_role` key to client code

**Warning signs:**
- Users can read/modify data they shouldn't access
- API calls succeed without authentication
- Security Advisor reports missing RLS policies

Source: [Supabase Security Pitfalls](https://hrekov.com/blog/supabase-common-mistakes), [Supabase Security Flaw Report](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)

### Pitfall 3: Storing Roles in `user_metadata`

**What goes wrong:** Admin authorization checks read role from `user_metadata`, allowing privilege escalation since users can edit their own metadata.

**Why it happens:** `user_metadata` looks like the right place for user attributes, but docs explicitly warn: "Do not use it in security sensitive context (such as in RLS policies or authorization logic), as this value is editable by the user without any checks."

**How to avoid:**
- Store roles in separate `user_roles` table with RLS policies
- Use Auth Hooks to add roles as custom claims to JWT
- Read roles from `app_metadata` (only service_role can modify) or custom claims
- Verify roles server-side, never trust client-provided values

**Warning signs:**
- Users can change their role via browser DevTools
- Admin endpoints accessible by non-admins
- Role changes bypass authorization checks

Source: [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)

### Pitfall 4: Initial Auth Loading State Race Condition

**What goes wrong:** React app briefly renders "not authenticated" UI before session loads, causing flicker or incorrect redirects.

**Why it happens:** `onAuthStateChange` doesn't fire on initial load if session is null. You must call `getSession()` synchronously on mount, then listen for changes. Documentation notes: "there is no deterministic way to know if a supabase session is done with initial loading."

**How to avoid:**
```javascript
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Check existing session FIRST
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // THEN listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}, []);

// Show loading spinner until initial check completes
if (loading) return <LoadingSpinner />;
```

**Warning signs:**
- Authenticated users briefly see login page on refresh
- Protected routes flash "unauthorized" before allowing access
- Users get redirected to login despite being logged in

Source: [Supabase Auth onAuthStateChange Issues](https://github.com/supabase/gotrue-js/issues/326), [Auth State Race Conditions](https://github.com/supabase/auth-js/issues/404)

### Pitfall 5: JWTs Valid After Sign Out

**What goes wrong:** User signs out but can still make API calls with old JWT until it expires.

**Why it happens:** Supabase revokes refresh tokens and deletes client-side storage, but "there is no way to revoke a user's access token jwt until it expires." JWTs are stateless and self-contained.

**How to avoid:**
- Keep JWT expiry short (default 1 hour is reasonable)
- Always call `auth.getUser()` for sensitive operations (checks session validity)
- For critical operations, check session exists in database
- Use `signOut({ scope: 'global' })` to revoke refresh tokens across all devices
- Don't rely solely on JWT expiry; verify session server-side

**Warning signs:**
- Signed-out users can access APIs until token expires
- Password changes don't immediately invalidate existing sessions
- Global signOut doesn't immediately block access

Source: [Supabase Sign Out Behavior](https://til.unessa.net/supabase/properly-sign-out/), [Session Revocation Limitations](https://supabase.com/docs/reference/javascript/auth-signout)

### Pitfall 6: OAuth Callback Hash Route Loss with HashRouter

**What goes wrong:** After OAuth redirect, the hash route portion (`#/admin`) is lost from the URL.

**Why it happens:** OAuth providers redirect to full URL including hash, but browser/framework routing can strip or mishandle the hash during callback processing. HashRouter doesn't support `location.state`.

**How to avoid:**
- Store intended destination in sessionStorage before OAuth redirect
- Read from sessionStorage in callback handler
- Manually redirect after auth completes
- Alternative: Use BrowserRouter instead of HashRouter (requires server config)

**Example:**
```javascript
// Before OAuth
sessionStorage.setItem('auth_redirect', '/admin');
await supabase.auth.signInWithOAuth({ provider: 'google' });

// After callback
const redirect = sessionStorage.getItem('auth_redirect') || '/';
sessionStorage.removeItem('auth_redirect');
navigate(redirect);
```

**Warning signs:**
- OAuth login successful but user lands on homepage instead of admin
- Hash routes disappear after authentication
- Redirect URL doesn't match intended destination

Source: [HashRouter OAuth Issues](https://github.com/auth0/auth0-spa-js/issues/407)

### Pitfall 7: MFA Not Properly Integrated with RLS

**What goes wrong:** MFA is enabled but can be bypassed because RLS policies don't check authentication assurance level (AAL).

**Why it happens:** "MFA is not as deeply integrated with the platform as the rest of the authentication options. Although it is a toggle to turn on, it has to be manually applied to each endpoint using row level security."

**How to avoid:**
- Check `aal` claim in RLS policies: `(auth.jwt() ->> 'aal') = 'aal2'`
- Require MFA for sensitive operations only (not all routes)
- Test MFA enforcement with actual RLS policy queries
- Document which endpoints require MFA

**Warning signs:**
- Users can skip MFA and still access protected data
- MFA enrollment doesn't enforce on sensitive operations
- Security audit reveals MFA bypass vulnerabilities

Source: [Supabase Common Mistakes](https://hrekov.com/blog/supabase-common-mistakes)

## Code Examples

Verified patterns from official sources:

### OAuth Sign In with Google
```javascript
// Google OAuth with redirect
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}#/admin`,
    queryParams: {
      access_type: 'offline',  // Request refresh token
      prompt: 'consent'         // Force consent screen
    }
  }
});
```

Source: [Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Email/Password Sign Up with Metadata
```javascript
// Customer account creation
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      display_name: name,  // Stored in user_metadata
    },
    emailRedirectTo: `${window.location.origin}#/account`
  }
});
```

Source: [Supabase React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)

### Email/Password Sign In
```javascript
// Customer login
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});

if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('Logged in:', data.user);
}
```

Source: [Supabase React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)

### Global Sign Out (All Devices)
```javascript
// Revoke all sessions across devices
await supabase.auth.signOut({ scope: 'global' });
```

Source: [Supabase Sign Out API](https://supabase.com/docs/reference/javascript/auth-signout)

### Checking Admin Role in React
```javascript
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Read custom claim from JWT (added via Auth Hook)
  const userRole = user.app_metadata?.user_role;

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
```

Source: [React Router Authentication Patterns](https://blog.logrocket.com/authentication-react-router-v6/)

### Session Configuration (Different Durations)
```javascript
// Note: Supabase doesn't natively support different session durations per user type
// Workaround: Configure at project level in Supabase Dashboard > Authentication > Settings

// For longer customer sessions, set project default to 30 days
// For admin checks, use getUser() frequently to revalidate

// Alternative: Check session age and force re-auth for admin routes
const sessionCreatedAt = new Date(user.created_at);
const sessionAge = Date.now() - sessionCreatedAt.getTime();
const adminMaxAge = 3600000; // 1 hour in milliseconds

if (sessionAge > adminMaxAge && isAdminRoute) {
  await supabase.auth.signOut();
  // Redirect to admin login
}
```

Source: [Supabase Sessions Documentation](https://supabase.com/docs/guides/auth/sessions)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-*` packages | `@supabase/ssr` | Q4 2023 | Unified SSR approach across frameworks; must migrate from auth-helpers |
| `getSession()` for auth checks | `getUser()` or `getClaims()` | Always recommended | `getSession()` never guaranteed to revalidate; major security vulnerability |
| localStorage sessions | Cookie-based sessions (httpOnly) | SSR adoption | Cookies prevent XSS attacks, work with server-side rendering |
| Manual JWT verification | Auth Hooks for custom claims | Q2 2024 | Official extension point replaces custom JWT modification |
| Implicit OAuth flow | PKCE flow (default) | OAuth 2.1 standard | PKCE prevents authorization code interception attacks |
| HS256 JWT signing | RS256/ES256 asymmetric | Best practice 2025+ | Asymmetric keys allow third-party JWT validation without secret exposure |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react`: Replaced by `@supabase/ssr` (migrate before breaking changes)
- `auth.session()`: Use `auth.getSession()` instead
- `auth.signIn()`: Use `auth.signInWithPassword()` or `auth.signInWithOAuth()`
- Storing tokens in localStorage for SSR apps: Use cookies via `@supabase/ssr`

## Open Questions

Things that couldn't be fully resolved:

1. **Different session durations for admin vs customer**
   - What we know: Supabase session duration is configured globally at project level in Dashboard
   - What's unclear: No native way to set different timeouts per user type/role
   - Recommendation: Use 30-day default for customers, implement app-level session age checks for admin routes to force re-auth after 1 hour

2. **Best admin authorization approach for small team**
   - What we know: Auth Hooks + RLS is most secure; email whitelist is simpler
   - What's unclear: Which provides better UX for 1-2 admin users
   - Recommendation: Start with email whitelist in `user_roles` table checked by Auth Hook; migrate to role-based if team grows

3. **Optimal customer account creation timing**
   - What we know: Can offer during checkout or after order completion
   - What's unclear: Which timing has better conversion without disrupting purchase flow
   - Recommendation: Test both - offer after successful order ("Create account to track your order") and during checkout ("Save info for next time"). During checkout may reduce friction for repeat customers; after order may feel less pushy.

4. **HashRouter OAuth callback handling reliability**
   - What we know: Hash routes can be lost during OAuth redirect; sessionStorage workaround exists
   - What's unclear: Reliability across different browsers and edge cases
   - Recommendation: Test thoroughly with Google OAuth on multiple browsers. Consider migrating to BrowserRouter if issues persist (requires server-side routing config).

## Sources

### Primary (HIGH confidence)
- [Supabase Server-Side Auth - Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Sessions Management](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase Sign Out API Reference](https://supabase.com/docs/reference/javascript/auth-signout)
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)

### Secondary (MEDIUM confidence)
- [Supabase Express Middleware Examples (npm @supabase/ssr)](https://www.npmjs.com/package/@supabase/ssr)
- [React Router v6 Authentication Guide](https://blog.logrocket.com/authentication-react-router-v6/)
- [Medium: Next.js + Supabase Cookie-Based Auth (2025)](https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1)
- [Protected Routes with Supabase GitHub Template](https://github.com/mmvergara/react-supabase-auth-template)

### Tertiary (LOW confidence - community findings)
- [Supabase Common Mistakes Blog (Hrekov)](https://hrekov.com/blog/supabase-common-mistakes)
- [Supabase Security Best Practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices)
- [Supabase Security Flaw Report (byteiota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [GitHub Issues: onAuthStateChange race conditions](https://github.com/supabase/gotrue-js/issues/326)
- [GitHub Issues: HashRouter OAuth Issues](https://github.com/auth0/auth0-spa-js/issues/407)
- [Supabase Discussion: Multi-session bugs](https://github.com/supabase/auth/issues/2036)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages, well-documented, stable versions
- Architecture: HIGH - Patterns from official docs, verified with current @supabase/ssr approach
- Pitfalls: MEDIUM-HIGH - Mix of official docs warnings and community-reported issues (CVE confirmed)
- Different session durations: LOW - No official support found, workaround required
- OAuth callback with HashRouter: MEDIUM - Known issue with documented workarounds

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - Supabase Auth is stable but actively maintained)
