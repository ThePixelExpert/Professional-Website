# Project State

## Project Reference

**Building**: Supabase migration for homelab portfolio site
**Core Value**: Reliable hosting without SD card failures

## Current Position

**Milestone**: v1.0 - Core Migration
**Phase**: 4 of 5 - Production Infrastructure
**Plan**: 1 of 8 (IN PROGRESS)
**Status**: In progress
**Last activity**: 2026-01-29 - Completed 04-01-PLAN.md (Production Configuration Foundation)

## Progress

```
Phase 1: Local Dev Environment    [██████████] 2/2 plans (100%)
Phase 2: Schema & Backend         [██████████] 2/2 plans (100%)
Phase 3: Auth Migration           [██████████] 7/7 plans (100%)
Phase 4: Production Infrastructure[█░░░░░░░░░] 1/8 plans (12%)
Phase 5: Deployment Reconfig      [░░░░░░░░░░] 0/? plans (0%)
─────────────────────────────────────────────
Overall:                          [█████████░] 95%
```

## Recent Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| 5-phase migration approach | Logical progression: local dev → refactor → auth → infra → deploy | 2026-01-28 |
| Use CommonJS instead of ES modules | Existing backend code uses require() syntax, maintaining consistency | 2026-01-28 |
| Create separate public and admin clients | Public client respects RLS policies, admin client bypasses them | 2026-01-28 |
| Set persistSession: false for both clients | Server-side environment has no localStorage | 2026-01-28 |
| Use .env.template pattern with inline documentation | Developers can reference values without switching to separate docs | 2026-01-28 |
| Pre-populate .env with local defaults | Immediate developer experience - copy and start developing | 2026-01-28 |
| Create comprehensive LOCAL_DEVELOPMENT.md | Single source of truth for setup process | 2026-01-28 |
| Use moddatetime extension for timestamps | Supabase-standard approach, simpler than custom trigger function | 2026-01-29 |
| Preserve VARCHAR(50) for products.id | Maintain compatibility with existing product ID format (e.g., 'custom-pcb-001') | 2026-01-29 |
| Include legacy address columns | Keep customers.address and orders.customer_address for backward compatibility | 2026-01-29 |
| Use TIMESTAMPTZ throughout schema | Follow Supabase conventions, avoid timezone ambiguity | 2026-01-29 |
| Query builder over raw SQL | Use Supabase .from().select() pattern for better type safety and integration | 2026-01-29 |
| Service module pattern | Implementations in src/services/, root-level wrappers for compatibility | 2026-01-29 |
| Preserve address fallback logic | Maintain exact field fallback behavior from original database.js | 2026-01-29 |
| Use auth.getUser() for session verification | getUser() validates JWT with auth server for security, getSession() only reads locally | 2026-01-29 |
| Per-request Supabase client pattern | Each request needs its own client with proper cookie context, never reuse clients | 2026-01-29 |
| Admin role in app_metadata.user_role | Custom claims in JWT allow backend authorization checks without additional database queries | 2026-01-29 |
| 401 vs 403 status codes | 401 for missing/invalid session (unauthorized), 403 for valid session but insufficient permissions | 2026-01-29 |
| Store roles in dedicated user_roles table | Cleaner separation, easier to audit, supports multiple roles per user | 2026-01-29 |
| Use Auth Hooks for JWT claim injection | Supabase-native approach, claims available immediately without extra queries | 2026-01-29 |
| Support only 'admin' and 'customer' roles initially | Matches current auth requirements, can extend CHECK constraint later | 2026-01-29 |
| Use REACT_APP_ prefix for frontend env vars | Create React App requires this prefix to include variables in build | 2026-01-29 |
| Call getSession() before onAuthStateChange | Prevents race condition where listener fires before initial session is loaded | 2026-01-29 |
| Expose supabase client in AuthContext | Allows components to perform direct auth operations without prop drilling | 2026-01-29 |
| Use hash-based navigation for route guards | Existing app uses HashRouter pattern, maintaining consistency | 2026-01-29 |
| Store redirect destination in sessionStorage | Enables OAuth callback to redirect user to intended destination after login | 2026-01-29 |
| Remove JWT authMiddleware for Supabase requireAdmin | Migrated from JWT tokens to Supabase session-based auth with cookie support | 2026-01-29 |
| Create session management endpoints | Frontend can check auth state via /api/auth/session and sign out via /api/auth/signout | 2026-01-29 |
| Global signout scope for admin sessions | Sign out revokes all sessions across devices for security | 2026-01-29 |
| Add user_id to orders (nullable) | Links orders to authenticated users while preserving guest checkout | 2026-01-29 |
| Use optionalAuth middleware for checkout | Checkout must work for both guests and authenticated users without requiring login | 2026-01-29 |
| RLS policy for customer order viewing | Customers can only see their own orders via auth.uid() = user_id check | 2026-01-29 |
| Separate /api/customer/orders endpoint | Customer endpoint filters by user_id, admin endpoint returns all orders | 2026-01-29 |
| OAuth flow with sessionStorage redirect | Store redirect destination in sessionStorage before OAuth to enable post-login navigation | 2026-01-29 |
| Cookie-based admin API calls | Replace JWT Authorization headers with credentials: 'include' for cookie-based auth | 2026-01-29 |
| AdminRoute wrapper for dashboard | Wrap AdminDashboard with AdminRoute component for centralized auth protection | 2026-01-29 |
| Dual auth support in requireAuth middleware | Support both Bearer token (frontend) and cookie (SSR) authentication for flexibility | 2026-01-29 |
| Public client for token verification | Use public Supabase client to verify JWT tokens sent via Authorization header | 2026-01-29 |
| Comprehensive OAuth setup documentation | Document all manual OAuth configuration steps that cannot be automated | 2026-01-29 |
| Environment template with inline docs | Production .env.template documents all Supabase Docker Compose variables with generation commands | 2026-01-29 |
| Automated secrets generation | generate-secrets.sh generates cryptographically secure secrets using OpenSSL | 2026-01-29 |
| Deployment README structure | Organized README with Prerequisites, Steps, Maintenance, Security, and Troubleshooting sections | 2026-01-29 |

## Pending Todos

(None)

## Blockers/Concerns

(None)

## Session Continuity

**Last session**: 2026-01-29T22:54:00Z
**Stopped at**: Completed 04-01-PLAN.md (Production Configuration Foundation)
**Resume file**: .planning/phases/04-production-infrastructure/04-01-SUMMARY.md
**Next action**: Continue Phase 4 - Plan 04-02 (Proxmox VM Setup)

---

*Last updated: 2026-01-29T22:54:00Z*
