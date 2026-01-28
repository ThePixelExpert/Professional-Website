# Roadmap: Professional Website - Supabase Migration

## Milestone v1.0: Core Migration

**Goal**: Eliminate SD card failures by moving all stateful workloads off the Pi cluster to Proxmox VMs.

**Success Criteria**:
- Supabase running on Proxmox VM (database, auth, storage)
- Express backend running on Proxmox VM
- Pi cluster serving frontend only (static React build)
- Local development workflow with Docker Supabase
- OAuth login working for admin

---

### Phase 1: Local Development Environment
**Goal**: Set up local Supabase with Docker Compose for development/testing

**Delivers**:
- Docker Compose config for local Supabase
- Environment variable management (local vs production)
- Documented local dev workflow

**Status**: Not Started

---

### Phase 2: Schema Design & Backend Refactor
**Goal**: Migrate backend from raw pg to Supabase client with proper schema

**Delivers**:
- Supabase schema matching current PostgreSQL tables
- Backend refactored to use @supabase/supabase-js
- Database migrations tracked in git
- All existing functionality preserved

**Dependencies**: Phase 1

**Status**: Not Started

---

### Phase 3: Auth Migration
**Goal**: Replace JWT auth with Supabase Auth + OAuth

**Delivers**:
- Admin authentication via Google/GitHub OAuth
- Optional customer accounts for order tracking
- Session management via Supabase Auth
- Protected routes updated for new auth flow

**Dependencies**: Phase 2

**Status**: Not Started

---

### Phase 4: Production Infrastructure
**Goal**: Deploy Supabase to Proxmox VM

**Delivers**:
- Proxmox VM configured for Supabase
- Docker Compose deployment with proper networking
- SSL/TLS configuration
- Backup strategy for database
- Environment parity with local dev

**Dependencies**: Phase 3 (schema and auth finalized)

**Status**: Not Started

---

### Phase 5: Deployment Reconfiguration
**Goal**: Deploy backend to Proxmox, frontend-only on Pi cluster

**Delivers**:
- Express backend containerized and running on Proxmox VM
- Frontend container (Nginx + static React) on Pi k3s
- Traefik routing updated for split architecture
- Pi cluster no longer running any stateful workloads

**Dependencies**: Phase 4

**Status**: Not Started

---

## Future: Milestone v1.1

- GitOps with Flux for automated deployments
- Supabase Realtime for live order status
- Supabase Storage for file uploads
- Monitoring and alerting

---

*Created: 2026-01-28*
