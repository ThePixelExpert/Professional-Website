# Professional Website - Supabase Migration & GitOps

## What This Is

A homelab infrastructure migration for a portfolio/e-commerce website. Moving from a fully-loaded k3s Raspberry Pi cluster (frontend + backend + database) to a split architecture: stateless frontend on Pis, stateful backend/database on Proxmox VMs with Supabase. This eliminates SD card failures caused by constant database writes on the Pi cluster.

## Core Value

Reliable, maintainable homelab hosting where the Pi cluster handles only lightweight frontend serving, while all stateful workloads (database, auth, storage, backend logic) run on proper server hardware via Proxmox.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Supabase self-hosted via Docker Compose on Proxmox VM
- [ ] Backend refactored to use Supabase client instead of raw pg
- [ ] Admin authentication via Supabase Auth with OAuth (Google/GitHub)
- [ ] Optional customer accounts for order tracking via Supabase Auth
- [ ] Supabase Storage integration for future file uploads
- [ ] Supabase Realtime for live order status updates
- [ ] Express backend containerized and deployable to Proxmox VM
- [ ] Frontend-only deployment on k3s Pi cluster
- [ ] GitOps/Flux managing frontend deployments on k3s
- [ ] GitOps managing backend container deployment
- [ ] Supabase schema/migrations tracked in git
- [ ] Local Docker Supabase for development/testing
- [ ] Easy switch from local Supabase to production Supabase
- [ ] Single repo structure with organized layout
- [ ] All work on feature branches, not main

### Out of Scope

- Mobile app — web-first, mobile later
- Real-time chat — not needed for portfolio site
- Video hosting — storage/bandwidth concerns
- Multi-tenant admin — single admin user sufficient
- Running any stateful workload on Pi cluster — the whole point is avoiding this

## Context

**Current State:**
- React 19 frontend with hash-based routing, admin dashboard, Stripe e-commerce
- Express.js backend with PostgreSQL 15, JWT auth, Nodemailer, PDFKit
- 4 Raspberry Pi 4s running k3s cluster (192.168.0.40-43)
- Self-hosted Docker registry at 192.168.0.40:5000
- Traefik ingress with Let's Encrypt SSL
- Domain: edwardstech.dev via Cloudflare
- Manual deployment via Ansible playbooks — no GitOps yet

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
| Split frontend/backend across hardware | SD cards fail from database writes; separate stateless from stateful | — Pending |
| Supabase over raw PostgreSQL | Get Auth, Storage, Realtime for free; reduces backend complexity | — Pending |
| OAuth for admin auth | More secure than password, easier than managing credentials | — Pending |
| Optional customer accounts | Allow order tracking without forcing registration | — Pending |
| GitOps/Flux over Ansible | Automated deployments from git, declarative infrastructure | — Pending |
| Docker Compose for Supabase | Simple deployment on VM, easy to manage | — Pending |
| Local Docker Supabase for dev | Test locally, same setup as production | — Pending |
| Keep Express backend | Stripe webhooks, email, PDF generation need server-side code | — Pending |

---
*Last updated: 2025-01-28 after initialization*
