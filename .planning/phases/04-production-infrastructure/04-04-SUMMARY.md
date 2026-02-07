---
phase: 04-production-infrastructure
plan: 04
subsystem: infra
tags: [caddy, reverse-proxy, ssl, lets-encrypt, docker, tls, https]

# Dependency graph
requires:
  - phase: 04-02
    provides: VM infrastructure with Docker and networking setup
provides:
  - Caddy reverse proxy with automatic Let's Encrypt SSL certificate management
  - Docker Compose configuration for caddy-docker-proxy with label-based routing
  - Backup Caddyfile for manual/fallback configuration
  - Comprehensive DNS and SSL documentation
affects: [04-05-backup, 04-06-migrations, deployment, monitoring]

# Tech tracking
tech-stack:
  added: [caddy-docker-proxy, Let's Encrypt ACME]
  patterns: [label-based service discovery, automatic SSL renewal, Docker socket mounting (read-only)]

key-files:
  created:
    - production/docker-compose.caddy.yml
    - production/Caddyfile
  modified:
    - production/README.md

key-decisions:
  - "Use caddy-docker-proxy instead of vanilla Caddy for automatic Docker label discovery"
  - "Mount Docker socket read-only for security while enabling label discovery"
  - "Create backup Caddyfile as documentation and fallback configuration"
  - "Use external supabase_default network to reach Kong on internal Docker network"
  - "Expose ports 80 (ACME challenge) and 443 (HTTPS) only on Caddy container"

patterns-established:
  - "Label-based routing: Services declare their domains via Docker labels, Caddy discovers automatically"
  - "Persistent certificate storage: Named volumes survive container recreation"
  - "Documentation-as-code: Backup Caddyfile documents routing even though labels are primary config"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 4 Plan 04: Caddy Reverse Proxy Configuration Summary

**Caddy reverse proxy with automatic Let's Encrypt SSL for supabase.edwardstech.dev using Docker label-based routing**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-07T16:06:26Z
- **Completed:** 2026-02-07T16:08:47Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Caddy reverse proxy configured with automatic SSL certificate management via Let's Encrypt
- Docker label-based service discovery using caddy-docker-proxy eliminates manual configuration
- Comprehensive DNS and SSL documentation added to production README
- Backup Caddyfile created for reference and fallback configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Caddy Docker Compose file** - `3f33f26` (feat)
2. **Task 2: Create backup Caddyfile for manual configuration** - `69849cd` (docs)
3. **Task 3: Create Caddy deployment documentation** - `db48f4b` (docs)

## Files Created/Modified
- `production/docker-compose.caddy.yml` - Caddy reverse proxy with caddy-docker-proxy image, Docker socket mount (read-only), persistent certificate volumes, connects to supabase_default network
- `production/Caddyfile` - Backup static configuration documenting routing for supabase.edwardstech.dev and studio.edwardstech.dev, includes security headers and logging
- `production/README.md` - Added comprehensive Reverse Proxy (Caddy) section with deployment instructions, DNS configuration guidance, SSL certificate automation, Cloudflare proxy support, and troubleshooting

## Decisions Made

**Use caddy-docker-proxy for automatic label discovery**
- Eliminates manual Caddyfile updates when services change
- Caddy reads Docker labels from containers and automatically configures routing
- More maintainable for containerized environments

**Mount Docker socket read-only**
- Required for label discovery but limited to read-only for security
- Prevents Caddy from executing Docker commands or modifying containers
- Follows principle of least privilege

**Create backup Caddyfile even though it's not used**
- Serves as documentation of routing configuration
- Provides fallback if label-based config has issues
- Reference for adding custom routes or switching to vanilla Caddy

**Connect to external supabase_default network**
- Allows Caddy to reach Kong (8000) on Supabase's internal network
- Marked as external: true since it's created by Supabase docker-compose
- Separates reverse proxy networking from application networking

**Document both Cloudflare proxy and DNS-only modes**
- Cloudflare proxy (orange cloud): Cloudflare handles external SSL, Caddy gets cert for internal validation
- DNS-only (grey cloud): Caddy handles SSL directly with Let's Encrypt
- Both modes work but require different configuration approaches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all Docker Compose validation passed, documentation structure was clear.

## User Setup Required

**Manual DNS configuration required before deployment:**
- Add A record: `supabase.edwardstech.dev` → VM public IP
- Add A record (optional): `studio.edwardstech.dev` → VM public IP
- Wait for DNS propagation (verify with `dig`)
- Ensure ports 80/443 are forwarded to VM for Let's Encrypt ACME challenge

**No automated setup possible:** DNS configuration is external to our infrastructure and must be done via DNS provider dashboard (Cloudflare, etc.)

## Next Phase Readiness

**Ready for:**
- Plan 04-05: Backup automation (PostgreSQL scheduled backups)
- Plan 04-06: Migration application and Auth Hooks configuration
- Plan 04-07: Production system verification

**Blockers:**
- DNS must be configured before Caddy can request SSL certificates
- Supabase stack must be running before Caddy can discover Kong labels
- VM must be accessible on ports 80/443 for Let's Encrypt validation

**Note:** This plan creates theoretical configuration only - full testing requires Proxmox VM to be available.

---
*Phase: 04-production-infrastructure*
*Completed: 2026-02-07*
