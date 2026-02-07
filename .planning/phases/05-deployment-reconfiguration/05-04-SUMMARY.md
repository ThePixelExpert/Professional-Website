---
phase: 05-deployment-reconfiguration
plan: 04
subsystem: infra
tags: [docker, kubernetes, k3s, deployment, automation, split-architecture]

# Dependency graph
requires:
  - phase: 05-01
    provides: Backend Dockerfile and docker-compose configuration for Proxmox VM
  - phase: 05-02
    provides: Frontend Dockerfile with build ARGs for Pi cluster
  - phase: 05-03
    provides: Kubernetes manifests for split architecture
provides:
  - Automated build script with multi-platform support (ARM64/AMD64)
  - Backend deployment automation via SSH to Proxmox VM
  - Frontend deployment automation to k3s cluster
  - Git SHA-based image tagging for traceability
affects: [06-gitops-flux, deployment-automation, ci-cd]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-platform-builds, ssh-deployment, kubectl-automation, git-sha-tagging]

key-files:
  created:
    - scripts/deploy-backend.sh
    - scripts/deploy-k8s.sh
  modified:
    - scripts/build-and-push.sh

key-decisions:
  - "Use git SHA for image tags instead of timestamps for traceability"
  - "Build frontend for ARM64 (Pi cluster) and backend for AMD64 (Proxmox VM)"
  - "SSH-based deployment to VM with docker compose pull/up pattern"
  - "kubectl via SSH to Pi for k8s deployments"
  - "Validate backend health after deployment with curl check"

patterns-established:
  - "Multi-platform builds: --platform linux/arm64 for frontend, linux/amd64 for backend"
  - "Git SHA tagging: ${REGISTRY}/image:${GIT_SHA} for version tracking"
  - "SSH deployment pattern: scp files + ssh commands for remote operations"
  - "Health check validation: Wait 10s then curl health endpoint"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 5 Plan 4: Build and Deployment Scripts Summary

**Automated deployment scripts with multi-platform Docker builds (ARM64/AMD64), git SHA tagging, and split architecture deployment to VM and k3s cluster**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T17:07:30Z
- **Completed:** 2026-02-07T17:10:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created build-and-push.sh with ARM64 (frontend) and AMD64 (backend) platform support
- Git SHA-based image tagging for version traceability across registry
- Backend deployment script with full lifecycle: SCP compose files, pull images, restart, health check
- Frontend k3s deployment script with kubectl automation and rollout verification
- Registry cleanup logic to keep last 5 image tags per repository

## Task Commits

Each task was committed atomically:

1. **Task 1: Create build-and-push script with git SHA tagging** - `8312e7b` (feat) [pre-existing from 05-03]
2. **Task 2: Create backend VM deploy script and k8s frontend deploy script** - `2f939d1` (feat)

**Note:** build-and-push.sh was already created in 05-03 execution but matched 05-04 requirements exactly. Task 2 created the two deployment scripts.

## Files Created/Modified

**Created:**
- `scripts/deploy-backend.sh` - SSH-based deployment to Proxmox VM at 192.168.0.50 with docker compose
- `scripts/deploy-k8s.sh` - kubectl-based deployment to k3s cluster with namespace creation, service config, and rollout wait

**Modified (pre-existing from 05-03):**
- `scripts/build-and-push.sh` - Multi-platform Docker builds with git SHA tagging and registry cleanup

## Decisions Made

1. **Use git SHA for image tags** - More traceable than timestamps, enables git bisect correlation
2. **Platform-specific builds** - ARM64 for Pi cluster (frontend), AMD64 for Proxmox VM (backend)
3. **SSH-based deployment pattern** - Simple and direct for homelab environment without CI/CD infrastructure
4. **kubectl via SSH wrapper** - kubectl_pi function wraps all kubectl commands to run on Pi via SSH
5. **Health validation after backend deploy** - Wait 10 seconds then curl /api/health to verify startup
6. **Selective build support** - build-and-push.sh accepts argument: all|frontend|backend

## Deviations from Plan

### Overlap with Previous Plan

**build-and-push.sh already existed**
- **Context:** Plan 05-03 was already executed and created build-and-push.sh (commit 8312e7b)
- **Impact:** Task 1 had no changes to commit since file already existed with correct implementation
- **Decision:** Continued to Task 2 since build-and-push.sh met all requirements
- **Verification:** Confirmed git SHA tagging, platform specifications (arm64/amd64), and registry cleanup logic all present

---

**Total deviations:** None - prior plan overlap documented, no unplanned work required
**Impact on plan:** No impact. Task 1 was already complete from 05-03, Task 2 executed as planned.

## Issues Encountered

**Windows line endings in generated scripts**
- Write tool created scripts with CRLF endings
- bash syntax checker failed with "unexpected end of file" errors
- Fixed with `sed -i 's/\r$//'` to convert to LF endings
- All scripts passed syntax check after conversion

## User Setup Required

None - no external service configuration required.

**Deployment prerequisites:**
- `.env.production` must exist in repo root (for frontend builds)
- `contact-backend/.env.production` must exist (for backend deployment)
- SSH access to ubuntu@192.168.0.50 (Proxmox VM)
- SSH access to pi@192.168.0.40 (k3s cluster)
- Docker buildx configured for multi-platform builds
- kubectl configured on Pi k3s cluster

## Next Phase Readiness

**Ready for Phase 6 (GitOps with Flux):**
- ✓ Build scripts create properly-tagged images
- ✓ Deployment scripts automate the full lifecycle
- ✓ Split architecture deployment pattern established
- ✓ Health checks verify successful deployments

**Blockers/Concerns:**
- None - deployment automation complete and syntax-validated
- Scripts ready to test when Proxmox VM and k3s cluster are available
- Runtime testing deferred until infrastructure is accessible

**Next:**
- Phase 6 will add Flux GitOps to replace manual script execution
- These scripts serve as reference for Flux automation patterns
- Manual deployment capability preserved for troubleshooting

---
*Phase: 05-deployment-reconfiguration*
*Completed: 2026-02-07*
