---
phase: 06-gitops-with-flux
plan: 06
subsystem: infra
tags: [flux, gitops, kustomization, bootstrap, documentation, sealed-secrets]

# Dependency graph
requires:
  - phase: 06-gitops-with-flux-01
    provides: CI Pipeline with sortable image tags
  - phase: 06-gitops-with-flux-02
    provides: Flux-managed frontend and ingress manifests
  - phase: 06-gitops-with-flux-03
    provides: Backend deployment Job with SSH to VM
  - phase: 06-gitops-with-flux-04
    provides: Sealed Secrets templates and seal-secrets.sh
  - phase: 06-gitops-with-flux-05
    provides: Image automation CRDs
provides:
  - Complete Flux reconciliation order via Kustomization CRDs
  - Automated bootstrap script for one-command Flux installation
  - Comprehensive setup, operations, rollback, and troubleshooting documentation
affects: [production-deployment, flux-bootstrap, cluster-setup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flux Kustomization CRDs define reconciliation targets and dependency order"
    - "Bootstrap script automates Flux + Sealed Secrets installation with prerequisite checks"
    - "Comprehensive documentation covering full GitOps lifecycle"

key-files:
  created:
    - flux/clusters/production/flux-kustomization.yaml
    - scripts/flux-bootstrap.sh
    - docs/FLUX_SETUP.md
  modified: []

key-decisions:
  - "Reconciliation order: sealed-secrets → frontend + image-automation (parallel) → ingress → backend-deploy"
  - "Backend-deploy uses force:true for Job recreation on each reconciliation"
  - "Frontend has health checks with 5-minute timeout matching user requirements"
  - "Bootstrap script includes Flux pre-flight checks and verification steps"
  - "Documentation structured with quick start for experienced users, detailed for first-time setup"

patterns-established:
  - "Flux Kustomization dependency chain using dependsOn for ordered deployment"
  - "Health checks in Kustomization specs to gate dependent resource deployment"
  - "force:true pattern for Kubernetes Jobs to trigger recreation"
  - "Bootstrap script pattern with comprehensive prerequisite validation"

# Metrics
duration: 80min
completed: 2026-02-07
---

# Phase 6 Plan 06: Bootstrap, Kustomizations, and Documentation Summary

**Complete Flux GitOps reconciliation order, automated bootstrap script, and comprehensive setup documentation for production deployment**

## Performance

- **Duration:** 1 hr 20 min (includes user verification checkpoint)
- **Started:** 2026-02-07T20:48:00Z (estimated from context)
- **Completed:** 2026-02-07T22:08:15Z
- **Tasks:** 3 (2 automated, 1 checkpoint)
- **Files created:** 3

## Accomplishments

- Complete Flux reconciliation config with 5 Kustomization CRDs defining deployment order
- Automated bootstrap script with prerequisite checks, Flux installation, and Sealed Secrets setup
- Comprehensive FLUX_SETUP.md covering prerequisites, bootstrap, secrets, operations, rollback, and troubleshooting
- Phase 6 complete: Full GitOps with Flux implementation ready for production deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Flux Kustomization CRDs for reconciliation order** - `726008d` (feat)
2. **Task 2: Create bootstrap script and setup documentation** - `59c8055` (feat)
3. **Task 3: Verify Flux configuration** - Checkpoint (approved by user)

**Plan metadata:** (this commit)

## Files Created/Modified

- `flux/clusters/production/flux-kustomization.yaml` - 5 Flux Kustomization CRDs defining reconciliation order: sealed-secrets (first), frontend + image-automation (parallel), ingress (after frontend), backend-deploy (after frontend with force:true)
- `scripts/flux-bootstrap.sh` - Automated bootstrap script with prerequisite checks, Flux installation with image automation controllers, Sealed Secrets Helm install, verification
- `docs/FLUX_SETUP.md` - Complete setup and operations guide (515 lines): quick start, prerequisites, bootstrap walkthrough, seal secrets workflow, GitOps flow explanation, verification commands, rollback procedure, troubleshooting

## Decisions Made

**Reconciliation order enforced via dependsOn:**
- sealed-secrets first: All other resources need decrypted secrets
- frontend depends on sealed-secrets: needs Harbor credentials to pull images
- image-automation depends on sealed-secrets: needs Harbor credentials to poll registry
- ingress depends on frontend: routing should only be active after frontend is healthy
- backend-deploy depends on frontend: deploy frontend first per user's CONTEXT.md requirement

**Backend-deploy with force:true:**
- Forces Kubernetes Job recreation on each reconciliation
- Without force, Kubernetes sees same Job name and skips execution
- Essential for backend deploy automation

**Frontend health checks:**
- Flux waits for frontend Deployment to be healthy before marking Kustomization as ready
- 5-minute timeout matches user's failure timeout requirement from CONTEXT.md
- Gates backend deployment until frontend is confirmed healthy

**Different reconciliation intervals:**
- 5m for frontend and backend (active deployments that change frequently)
- 10m for sealed-secrets, ingress, and image-automation (configuration that changes rarely)
- Balances responsiveness with cluster load

**Bootstrap script design:**
- Comprehensive prerequisite checks (flux CLI, helm, kubeseal, kubectl, GITHUB_TOKEN)
- Installs Flux with --components-extra=image-reflector-controller,image-automation-controller
- Installs Sealed Secrets controller via Helm to flux-system namespace
- Verification steps and clear next-steps guidance
- Single command for complete cluster setup

**Documentation structure:**
- Quick Start at top (5 commands for experienced users)
- Detailed step-by-step for first-time setup
- Architecture overview explaining what Flux manages vs what triggers deployments
- Rollback procedure using git revert (preserves audit trail per CONTEXT.md)
- Troubleshooting section addressing common issues (image not updating, Job failing, Flux not syncing, Sealed Secrets issues)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully without blocking issues.

## User Setup Required

**Before Flux Bootstrap:**
- Install CLIs: flux, helm, kubeseal, kubectl
- Export GITHUB_TOKEN with 'repo' scope
- Export GITHUB_USER for repository owner
- Ensure kubectl is configured for k3s cluster access

**Before Deployment:**
- Register self-hosted GitHub Actions runner on Proxmox VM (for CI builds to reach Harbor)
- Create and seal secrets using seal-secrets.sh (Harbor credentials, VM SSH key)
- Ensure git repository is cloned on VM at /opt/professional-website
- Ensure backend .env file exists on VM at /opt/backend/.env

See docs/FLUX_SETUP.md for complete prerequisites and setup instructions.

## Next Phase Readiness

**Phase 6 (GitOps with Flux) Complete:**
All 6 plans successfully executed:
- 06-01: CI Pipeline with sortable image tags ✓
- 06-02: Flux-managed frontend and ingress manifests ✓
- 06-03: Backend deployment Job with SSH to VM ✓
- 06-04: Sealed Secrets templates and helper script ✓
- 06-05: Image automation CRDs ✓
- 06-06: Bootstrap, Kustomizations, and documentation ✓

**Deliverables:**
- Complete flux/clusters/production/ directory structure (17 files)
- GitHub Actions workflow for automated builds on push to master
- Flux Kustomization CRDs with dependency ordering
- Image automation pipeline (ImageRepository, ImagePolicy, ImageUpdateAutomation)
- Sealed Secrets setup with templates and seal-secrets.sh helper
- Bootstrap script for one-command Flux installation
- Comprehensive FLUX_SETUP.md documentation

**Ready for:**
- Flux bootstrap on k3s cluster
- Secret sealing and git commit
- Automated GitOps deployments
- Image automation from Harbor registry
- Production rollout

**Architecture:**
- Frontend: Next.js on k3s Pi cluster (ARM64), Flux-managed Deployment
- Backend: Express.js on Proxmox VM (AMD64), Flux-managed SSH deploy Job
- Ingress: Traefik routing to both services with split architecture
- Registry: Harbor at 192.168.0.40:5000 (LAN-only, HTTP)
- CI: GitHub Actions on self-hosted Proxmox runner
- GitOps: Flux with image automation, Sealed Secrets for credentials

**No blockers.** Phase 6 complete. Ready for deployment testing.

---
*Phase: 06-gitops-with-flux*
*Completed: 2026-02-07*
