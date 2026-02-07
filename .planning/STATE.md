# Project State

## Project Reference

**Building**: Supabase migration for homelab portfolio site
**Core Value**: Reliable hosting without SD card failures

## Current Position

**Milestone**: v1.0 - Core Migration
**Phase**: 5 of 6 - Deployment Reconfiguration
**Plan**: 1 of 3
**Status**: In Progress - Backend Docker configuration complete
**Last activity**: 2026-02-07 - Completed 05-01-PLAN.md (Backend Docker Configuration)

## Progress

```
Phase 1: Local Dev Environment    [██████████] 2/2 plans (100%)
Phase 2: Schema & Backend         [██████████] 2/2 plans (100%)
Phase 3: Auth Migration           [██████████] 7/7 plans (100%)
Phase 4: Production Infrastructure[██████████] 6/6 plans (100%)
Phase 5: Deployment Reconfig      [███░░░░░░░] 1/3 plans (33%)
Phase 6: GitOps with Flux         [░░░░░░░░░░] Not Started
─────────────────────────────────────────────
Overall:                          [████████░░] 88%
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
| Use /dev/sdb as dedicated data disk | Separates Supabase data from OS, enables independent scaling | 2026-01-29 |
| Mount data disk to /opt | Standard location for optional application software, keeps Docker storage on data disk | 2026-01-29 |
| VM over LXC for Supabase | Better Docker compatibility, live migration support, no Proxmox update breakage | 2026-01-29 |
| Automated vm-setup.sh script | Reduces manual configuration errors, ensures repeatable deployments | 2026-01-29 |
| Use Docker Compose override file instead of modifying docker-compose.yml | Official file can be updated without losing customizations, clear separation | 2026-02-07 |
| Provide deploy.sh with subcommands for all common operations | Single script interface reduces cognitive load, eliminates docker compose flag memorization | 2026-02-07 |
| Auto-copy override file and create caddy_network on first start | Reduces manual setup steps, script ensures environment is ready | 2026-02-07 |
| Use caddy-docker-proxy for automatic label discovery | Eliminates manual Caddyfile updates, Caddy reads Docker labels and configures routing automatically | 2026-02-07 |
| Mount Docker socket read-only | Required for label discovery but limited to read-only for security, prevents Caddy from executing Docker commands | 2026-02-07 |
| Create backup Caddyfile as documentation | Serves as documentation of routing configuration and provides fallback if label-based config has issues | 2026-02-07 |
| Connect Caddy to external supabase_default network | Allows Caddy to reach Kong on Supabase's internal network while keeping reverse proxy networking separate | 2026-02-07 |
| Document both Cloudflare proxy and DNS-only modes | Cloudflare proxy handles external SSL with Caddy validation, DNS-only mode Caddy handles SSL directly | 2026-02-07 |
| Use kartoza/pg-backup container for automated backups | Pre-built solution with cron scheduling, retention, compression instead of custom scripts | 2026-02-07 |
| Daily 2 AM backups with 7-day retention | Balances storage usage with recovery options for homelab environment | 2026-02-07 |
| Store backups at /opt/backups/postgres on host | Persists across container recreation, on dedicated storage disk separate from OS | 2026-02-07 |
| Create backup before each migration application | Migrations are not idempotent, backup enables rollback if issues occur | 2026-02-07 |
| Provide migration status command | Allows verification of which migrations have been applied without database expertise | 2026-02-07 |
| Single comprehensive production setup guide | Quick start at top for experienced users, detailed step-by-step for first-time setup | 2026-02-07 |
| Include exact Google Cloud Console navigation for OAuth | OAuth setup is error-prone, detailed steps reduce configuration mistakes | 2026-02-07 |
| Backend on Proxmox VM instead of k3s | Prevents SD card wear from database connections and stateful operations | 2026-02-07 |
| Bind backend to 0.0.0.0:3001 | k3s cluster needs LAN access to backend over network | 2026-02-07 |
| Node.js inline health check | No curl in alpine image, avoids extra dependency while maintaining health monitoring | 2026-02-07 |
| Local Harbor registry at 192.168.0.40:5000 | Images stored locally on Proxmox, no external registry dependencies | 2026-02-07 |

## Pending Todos

(None)

## Blockers/Concerns

**Phase 5 In Progress**: Backend Docker configuration complete
- ✓ Dockerfile.backend updated with src/ directory and health check (05-01)
- ✓ docker-compose.backend.yml created for VM deployment (05-01)
- ✓ .env.production.template created with Supabase variables (05-01)

**Note**: Docker configurations ready for deployment. Runtime testing deferred until Proxmox VM is available. All configurations validated for syntax.

## Session Continuity

**Last session**: 2026-02-07T17:04:18Z
**Stopped at**: Completed 05-01-PLAN.md (Backend Docker Configuration)
**Strategy**:
  - Phase 5 in progress - backend Docker configuration complete
  - Next: 05-02 (Frontend Configuration) - configure frontend for production Supabase URL
  - Then: 05-03 (GitOps Integration) - Flux CD manifests for automated deployment
  - Finally: Phase 6 (GitOps with Flux) - cluster-wide automation and monitoring
  - VM testing deferred until Proxmox hardware available
**Next action**: `/gsd:execute-plan 05-02` (Frontend Configuration)
**Resume file**: None

---

*Last updated: 2026-02-07T17:04:18Z*
