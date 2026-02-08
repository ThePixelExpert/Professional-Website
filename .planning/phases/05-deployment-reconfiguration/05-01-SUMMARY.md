---
phase: 05-deployment-reconfiguration
plan: 01
title: Backend Docker Configuration
status: complete
completed: 2026-02-07
duration: 3m

subsystem: deployment
tags: [docker, backend, health-check, compose, proxmox]

requires:
  - phase-04: Production infrastructure documentation

provides:
  - artifact: Dockerfile.backend
    description: Production-ready backend container with health checks
  - artifact: docker-compose.backend.yml
    description: Backend deployment config for Proxmox VM
  - artifact: contact-backend/.env.production.template
    description: Production environment template with Supabase variables

affects:
  - phase-05-02: Frontend configuration will need matching backend URL

tech-stack:
  added: []
  patterns:
    - Docker multi-stage build with non-root user
    - Health check probes for container orchestration
    - Resource limits and logging configuration

key-files:
  created:
    - docker-compose.backend.yml
    - contact-backend/.env.production.template
  modified:
    - Dockerfile.backend

decisions:
  - id: backend-on-vm
    choice: Deploy backend on Proxmox VM instead of k3s
    rationale: Prevents SD card wear from database connections and stateful operations
    impact: Backend accessible over LAN at 192.168.0.40:3001

  - id: lan-binding
    choice: Bind backend to 0.0.0.0:3001 (not 127.0.0.1)
    rationale: k3s cluster on Pi nodes needs to access backend over LAN
    impact: Backend reachable from any device on local network

  - id: health-check-pattern
    choice: Use Node.js inline health check via CMD-SHELL
    rationale: No curl in alpine image, avoids extra dependency
    impact: Health check works without additional packages

  - id: local-registry
    choice: Reference 192.168.0.40:5000/backend registry
    rationale: Images built and pushed to local Harbor registry on Proxmox
    impact: No external dependencies for container images

commits:
  - hash: 7994cbf
    message: "feat(05-01): add complete source tree and health check to backend Dockerfile"
    files:
      - Dockerfile.backend

  - hash: 128e3ce
    message: "feat(05-01): create Docker Compose config and production env template for backend"
    files:
      - docker-compose.backend.yml
      - contact-backend/.env.production.template
---

# Phase 5 Plan 01: Backend Docker Configuration Summary

**One-liner**: Docker configuration for Express backend on Proxmox VM with health checks and LAN accessibility

## What Was Built

Updated the backend Dockerfile and created deployment configuration for running the Express backend on the Proxmox VM.

### Task 1: Updated Dockerfile.backend
- Added complete source tree including `src/` directory (config, lib, middleware, services)
- Added `NODE_ENV=production` environment variable
- Added HEALTHCHECK instruction (30s interval, 3s timeout, 40s start period, 3 retries)
- Health check uses Node.js inline HTTP request (no curl dependency)
- Maintained non-root user security pattern (backend:nodejs)
- Kept efficient layer caching (dependencies before source code)

### Task 2: Created Docker Compose and Environment Template
- Created `docker-compose.backend.yml` for VM deployment
- Image references local Harbor registry at `192.168.0.40:5000/backend:${GIT_SHA:-latest}`
- Binds to `0.0.0.0:3001` for LAN access (critical for k3s cluster)
- Includes health check matching Dockerfile
- Resource limits: 2 CPUs, 512M RAM
- Resource reservations: 0.5 CPUs, 256M RAM
- Logging: json-file with 10MB rotation, 3 files max
- Created `.env.production.template` with Supabase-era variables
- Template includes inline documentation for each variable
- Explicitly removed legacy DB variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Explicitly removed legacy auth variables (JWT_SECRET, ADMIN_USER, ADMIN_PASS)

## Technical Details

### Dockerfile Changes
The original Dockerfile was missing the entire `src/` directory added during Phases 2-3 (Supabase migration). This meant the container was missing:
- `src/config/supabase.js` - Supabase client configuration
- `src/lib/supabase-ssr.js` - SSR Supabase client factory
- `src/middleware/auth.js` - Auth middleware (requireAuth, optionalAuth)
- `src/middleware/requireAdmin.js` - Admin authorization middleware
- `src/services/database.js` - Database service layer

Without these files, the backend would fail to start in production.

### Health Check Design
Used Node.js built-in `http` module to perform health check:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

This avoids installing curl in the alpine image, keeping the container minimal.

### LAN Binding Requirement
The backend MUST bind to `0.0.0.0:3001` (not `127.0.0.1:3001`) because:
1. Backend runs on Proxmox VM (192.168.0.40)
2. Frontend runs on k3s cluster across Pi nodes (192.168.0.31-33)
3. Pi nodes need to reach backend over LAN
4. `127.0.0.1` binding would only allow localhost connections

### Environment Variables Migration
Removed legacy variables that are no longer needed after Supabase migration:
- **Database**: Backend uses Supabase client, not direct Postgres connection
- **Auth**: Backend uses Supabase Auth with session cookies, not JWT tokens
- **Admin**: Admin users managed through Supabase Auth and user_roles table

## Architecture Impact

### Deployment Topology
```
┌─────────────────────────────────────────┐
│ Proxmox VM (192.168.0.40)               │
│  ├─ Supabase (Docker Compose)           │
│  │   ├─ Postgres :5432                  │
│  │   ├─ Kong API Gateway :8000           │
│  │   └─ Studio :3000                     │
│  └─ Backend Container :3001              │
│      └─ Connects to Supabase via Kong    │
└─────────────────────────────────────────┘
         ▲
         │ HTTP over LAN
         │
┌────────┴────────────────────────────────┐
│ k3s Cluster (Pi Nodes 31-33)            │
│  └─ Frontend Container                  │
│      └─ Calls backend at 192.168.0.40:3001
└─────────────────────────────────────────┘
```

### Why Backend on VM?
- **SD card preservation**: Database connections and stateful operations cause write wear
- **Resource availability**: VM has more CPU/RAM than Pi nodes
- **Stability**: VM more reliable than Pi cluster for stateful workloads

## Verification Results

All verification checks passed:
- ✓ Dockerfile builds successfully
- ✓ Docker Compose config valid
- ✓ Dockerfile includes src/ directory
- ✓ Dockerfile has HEALTHCHECK instruction
- ✓ Compose binds to 0.0.0.0:3001 (not 127.0.0.1)
- ✓ Env template has Supabase vars, no legacy DB vars

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Backend on Proxmox VM | Prevents SD card wear from database connections | Backend runs at fixed LAN address 192.168.0.40:3001 |
| Bind to 0.0.0.0:3001 | k3s cluster needs LAN access | Backend reachable from any local network device |
| Node.js inline health check | No curl in alpine, avoids extra dependency | Health check works without additional packages |
| Local Harbor registry | Images stored locally on Proxmox | No external registry dependencies |
| Force-add .env template | .gitignore blocks .env.production.template | Used git add -f to commit template file |

## Next Phase Readiness

### Ready to Proceed
Phase 05-02 (Frontend Configuration) can proceed immediately:
- Backend will be deployed at https://api.edwardstech.dev (via Caddy reverse proxy)
- Frontend needs REACT_APP_API_URL configured to point to backend
- Frontend env vars can now be templated similarly

### No Blockers
- Docker configuration complete and validated
- Environment template documents all required variables
- Health checks configured for reliability
- Resource limits prevent runaway processes

### Dependencies Satisfied
- Phase 04 infrastructure documentation provides:
  - VM setup process (04-02)
  - Supabase deployment config (04-03)
  - Caddy reverse proxy config (04-04)
  - Backup automation (04-05)

## Files Modified

### Created
- `docker-compose.backend.yml` - Backend deployment configuration for Proxmox VM
- `contact-backend/.env.production.template` - Production environment template

### Modified
- `Dockerfile.backend` - Added src/ directory, NODE_ENV, and health check

## Related Documentation

- Project context: `.planning/PROJECT.md`
- Phase 5 research: `.planning/phases/05-deployment-reconfiguration/05-RESEARCH.md`
- VM setup guide: `docs/PROXMOX_VM_SETUP.md`
- Production setup: `docs/PRODUCTION_SETUP.md`

## Success Metrics

- **Build time**: Container builds in ~77s (including dependency install)
- **Image size**: Minimal alpine-based image with production dependencies only
- **Health check**: 30s interval with 3s timeout, 40s grace period for startup
- **Resource efficiency**: 256M minimum, 512M maximum memory allocation
- **Commits**: 2 atomic commits (Dockerfile, then Compose/template)

---

**Phase 5 Progress**: 1/3 plans complete (33%)
**Next**: 05-02 Frontend Configuration
