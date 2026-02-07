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
**Goal**: Set up local Supabase using Supabase CLI for development/testing

**Delivers**:
- Supabase CLI initialized with configuration
- Supabase client module for backend
- Environment variable management (local vs production)
- Documented local dev workflow

**Note**: The Supabase CLI manages Docker Compose internally, providing better DX than raw Docker Compose configuration.

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Initialize Supabase CLI and create client configuration
- [x] 01-02-PLAN.md — Environment variable management, documentation, and verification

**Status**: Complete
**Completed**: 2026-01-28

---

### Phase 2: Schema Design & Backend Refactor
**Goal**: Migrate backend from raw pg to Supabase client with proper schema

**Delivers**:
- Supabase schema matching current PostgreSQL tables
- Backend refactored to use @supabase/supabase-js
- Database migrations tracked in git
- All existing functionality preserved

**Dependencies**: Phase 1

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Create Supabase migrations for database schema and seed data
- [x] 02-02-PLAN.md — Refactor database module to use Supabase client

**Status**: Complete
**Completed**: 2026-01-29

---

### Phase 3: Auth Migration
**Goal**: Replace JWT auth with Supabase Auth + OAuth

**Delivers**:
- Admin authentication via Google OAuth
- Optional customer accounts for order tracking
- Session management via Supabase Auth
- Protected routes updated for new auth flow

**Dependencies**: Phase 2

**Plans:** 7 plans

Plans:
- [x] 03-01-PLAN.md — Backend auth foundation (SSR client + middleware)
- [x] 03-02-PLAN.md — Database schema for user roles and Auth Hook
- [x] 03-03-PLAN.md — Backend route updates (replace JWT with Supabase)
- [x] 03-04-PLAN.md — Frontend auth foundation (AuthContext + route guards)
- [x] 03-05-PLAN.md — Admin OAuth UI (login component + dashboard updates)
- [x] 03-06-PLAN.md — Customer accounts (login/signup + order history)
- [x] 03-07-PLAN.md — Customer API endpoint and integration verification

**Status**: Complete
**Completed**: 2026-01-29

---

### Phase 4: Production Infrastructure
**Goal**: Deploy Supabase to Proxmox VM with SSL, backups, and environment parity

**Delivers**:
- Proxmox VM configured for Supabase
- Docker Compose deployment with proper networking
- SSL/TLS configuration via Caddy reverse proxy
- Backup strategy for database (daily, 7-day retention)
- Environment parity with local dev

**Dependencies**: Phase 3 (schema and auth finalized)

**Plans:** 6 plans

Plans:
- [x] 04-01-PLAN.md — Production configuration foundation (env template, secrets generator, README)
- [x] 04-02-PLAN.md — Proxmox VM setup (Docker installation, storage configuration)
- [x] 04-03-PLAN.md — Supabase Docker Compose deployment (override file, deploy script)
- [x] 04-04-PLAN.md — Caddy reverse proxy and SSL (automatic Let's Encrypt)
- [x] 04-05-PLAN.md — Backup automation (kartoza/pg-backup, manual scripts)
- [x] 04-06-PLAN.md — Production verification (migrations, OAuth, end-to-end test)

**Status**: Complete (theoretical - ready for deployment when VM available)
**Completed**: 2026-02-07

---

### Phase 5: Deployment Reconfiguration
**Goal**: Deploy backend to Proxmox, frontend-only on Pi cluster

**Delivers**:
- Express backend containerized and running on Proxmox VM
- Frontend container (Nginx + static React) on Pi k3s
- Traefik routing updated for split architecture
- Pi cluster no longer running any stateful workloads

**Dependencies**: Phase 4

**Plans:** 5 plans

Plans:
- [x] 05-01-PLAN.md — Backend containerization (Dockerfile, Docker Compose, env template)
- [x] 05-02-PLAN.md — Frontend containerization (Dockerfile, nginx.conf cleanup)
- [x] 05-03-PLAN.md — Kubernetes manifests (frontend deployment, backend Service+Endpoints, ingress)
- [x] 05-04-PLAN.md — Build and deploy scripts (build-and-push, deploy-backend, deploy-k8s)
- [x] 05-05-PLAN.md — Legacy cleanup and configuration review

**Status**: Complete
**Completed**: 2026-02-07

---

### Phase 6: GitOps with Flux
**Goal**: Automate deployments with Flux for both frontend and backend

**Delivers**:
- Flux installed on k3s cluster
- Frontend GitOps automation (git push → automatic deployment)
- Backend GitOps automation (git push → container rebuild → deployment)
- Automated image building and registry management
- Deployment manifests and Kustomize configurations

**Dependencies**: Phase 5

**Plans:** 6 plans

Plans:
- [ ] 06-01-PLAN.md — Build infrastructure (sortable image tags + GitHub Actions CI)
- [ ] 06-02-PLAN.md — Frontend Flux manifests (Kustomize + deployment with image setter)
- [ ] 06-03-PLAN.md — Backend Flux manifests (deploy Job + docker-compose with image setter)
- [ ] 06-04-PLAN.md — Sealed Secrets (templates + seal-secrets helper script)
- [ ] 06-05-PLAN.md — Image automation CRDs (ImageRepository, ImagePolicy, ImageUpdateAutomation)
- [ ] 06-06-PLAN.md — Bootstrap, Flux Kustomizations, documentation, and verification

**Status**: Planned

---

## Future: Milestone v1.1

- Supabase Realtime for live order status
- Supabase Storage for file uploads
- Monitoring and alerting

---

*Created: 2026-01-28*
*Updated: 2026-02-07 - Phase 6 planned (6 plans in 4 waves)*
