# Professional Website - Supabase Migration & GitOps

## What This Is

A homelab infrastructure migration for a portfolio/e-commerce website. Moving from a fully-loaded k3s Raspberry Pi cluster (frontend + backend + database) to a split architecture: stateless frontend on Pis, stateful backend/database on Proxmox VMs with Supabase. This eliminates SD card failures caused by constant database writes on the Pi cluster.

## Core Value

Reliable, maintainable homelab hosting where the Pi cluster handles only lightweight frontend serving, while all stateful workloads (database, auth, storage, backend logic) run on proper server hardware via Proxmox.

## Requirements

### Validated

- ✓ Supabase self-hosted via Docker Compose on Proxmox VM — v1.0
- ✓ Backend refactored to use Supabase client instead of raw pg — v1.0
- ✓ Admin authentication via Supabase Auth with OAuth (Google) — v1.0
- ✓ Optional customer accounts for order tracking via Supabase Auth — v1.0
- ✓ Express backend containerized and deployable to Proxmox VM — v1.0
- ✓ Frontend-only deployment on k3s Pi cluster — v1.0
- ✓ GitOps/Flux managing frontend deployments on k3s — v1.0
- ✓ GitOps managing backend container deployment — v1.0
- ✓ Supabase schema/migrations tracked in git — v1.0
- ✓ Local Docker Supabase for development/testing — v1.0
- ✓ Easy switch from local Supabase to production Supabase — v1.0
- ✓ Single repo structure with organized layout — v1.0
- ✓ All work on feature branches, not main — v1.0

### Active

- [ ] Supabase Storage integration for file uploads
- [ ] Supabase Realtime for live order status updates
- [ ] Production deployment validation in homelab environment
- [ ] Monitoring and alerting for services

### Out of Scope

- Mobile app — web-first, mobile later
- Real-time chat — not needed for portfolio site
- Video hosting — storage/bandwidth concerns
- Multi-tenant admin — single admin user sufficient
- Running any stateful workload on Pi cluster — the whole point is avoiding this

## Context

**Current State (v1.0 - 2026-02-07):**
- React 19 frontend with hash-based routing, admin dashboard, Stripe e-commerce
- Express.js backend with Supabase client, Supabase Auth, Nodemailer, PDFKit
- 4 Raspberry Pi 4s running k3s cluster (192.168.0.40-43) — frontend only
- Proxmox VMs ready for: Supabase (database, auth, storage), Backend API
- Self-hosted Harbor registry at 192.168.0.40:5000
- Traefik ingress with Let's Encrypt SSL
- Domain: edwardstech.dev via Cloudflare
- GitOps/Flux automation ready for deployment (GitHub Actions CI, sealed secrets, image automation)
- 12,688 LOC (JavaScript/JSX/YAML/Shell)
- Tech stack: React 19, Express.js, Supabase, Docker, Kubernetes, Flux, GitHub Actions

**Problem:**
SD cards on the Pi cluster die monthly due to constant database writes. Power loss corrupts cards requiring full reinstall.

**Target State:**
- Proxmox host running VMs:
  - TrueNAS VM — NAS storage
  - Supabase VM — Docker Compose (DB, Auth, Storage, Realtime)
  - Backend VM — Express API in Docker container
- Pi k3s cluster — frontend container only (Nginx serving static React build)
- GitOps/Flux automating deployments from git pushes
- All services on same LAN (consider Tailscale for added security/simplicity)

**Data:**
- Fresh start — no data migration needed from existing PostgreSQL

## Constraints

- **Hardware**: 4x Raspberry Pi 4 (limited CPU/RAM, SD card storage)
- **Hardware**: Proxmox server for VMs (TrueNAS, Supabase, Backend)
- **Network**: All devices on same LAN (192.168.0.x)
- **Stack**: Keep React frontend, Express backend (refactor, don't rewrite)
- **Repo**: Single repository (Professional-Website), feature branch workflow
- **Testing**: Must be able to test locally with Docker Supabase before production
- **Simplicity**: Backend deployment should be simple (Docker container, easy to run)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Split frontend/backend across hardware | SD cards fail from database writes; separate stateless from stateful | ✓ Good - v1.0 |
| Supabase over raw PostgreSQL | Get Auth, Storage, Realtime for free; reduces backend complexity | ✓ Good - v1.0 |
| OAuth for admin auth | More secure than password, easier than managing credentials | ✓ Good - v1.0 |
| Optional customer accounts | Allow order tracking without forcing registration | ✓ Good - v1.0 |
| GitOps/Flux over Ansible | Automated deployments from git, declarative infrastructure | ✓ Good - v1.0 |
| Docker Compose for Supabase | Simple deployment on VM, easy to manage | ✓ Good - v1.0 |
| Local Docker Supabase for dev | Test locally, same setup as production | ✓ Good - v1.0 |
| Keep Express backend | Stripe webhooks, email, PDF generation need server-side code | ✓ Good - v1.0 |
| Use Service+Endpoints instead of ExternalName | ExternalName requires DNS hostname, Proxmox VM has static IP but no DNS | ✓ Good - v1.0 |
| Image tags use main-{sha}-{timestamp} format | Flux ImagePolicy requires chronologically sortable tags | ✓ Good - v1.0 |
| Self-hosted GitHub Actions runner | Cloud runners cannot reach LAN-only Harbor registry | ✓ Good - v1.0 |

---
*Last updated: 2026-02-07 after v1.0 milestone*
