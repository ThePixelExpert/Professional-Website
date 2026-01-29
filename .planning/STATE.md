# Project State

## Project Reference

**Building**: Supabase migration for homelab portfolio site
**Core Value**: Reliable hosting without SD card failures

## Current Position

**Milestone**: v1.0 - Core Migration
**Phase**: 3 of 5 - Auth Migration
**Plan**: 2 of 7
**Status**: In progress
**Last activity**: 2026-01-29 - Completed 03-02-PLAN.md (Role-Based Authorization Schema)

## Progress

```
Phase 1: Local Dev Environment    [██████████] 2/2 plans (100%)
Phase 2: Schema & Backend         [██████████] 2/2 plans (100%)
Phase 3: Auth Migration           [██░░░░░░░░] 2/7 plans (29%)
Phase 4: Production Infrastructure[░░░░░░░░░░] Not Started
Phase 5: Deployment Reconfig      [░░░░░░░░░░] Not Started
─────────────────────────────────────────────
Overall:                          [█████░░░░░] 50%
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

## Pending Todos

(None)

## Blockers/Concerns

(None)

## Session Continuity

**Last session**: 2026-01-29T17:19:00Z
**Stopped at**: Completed 03-02-PLAN.md (Role-Based Authorization Schema)
**Resume file**: None
**Next action**: Continue Phase 3 with plan 03-03 (Admin OAuth implementation)

---

*Last updated: 2026-01-29*
