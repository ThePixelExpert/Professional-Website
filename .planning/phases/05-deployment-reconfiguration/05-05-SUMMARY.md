---
phase: 05-deployment-reconfiguration
plan: 05
subsystem: infra
tags: [kubernetes, k8s, deployment, cleanup, legacy-archive, split-architecture]

# Dependency graph
requires:
  - phase: 05-01
    provides: Backend Docker configuration for Proxmox VM
  - phase: 05-02
    provides: Frontend Docker configuration with hardened nginx
  - phase: 05-03
    provides: Kubernetes manifests for split architecture
  - phase: 05-04
    provides: Automated build and deployment scripts
provides:
  - Clean k8s directory structure with only split-architecture manifests active
  - Archived legacy k8s manifests (backend deployment, postgres StatefulSet) in k8s/legacy/
  - Human-verified complete deployment configuration for split architecture
affects: [06-gitops-flux, deployment, operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Legacy manifest archival pattern for rollback capability
    - Split architecture directory structure (frontend + routing manifests only in active paths)

key-files:
  created:
    - k8s/legacy/backend-deployment.yaml
    - k8s/legacy/backend-deployment-secure.yaml
    - k8s/legacy/backend-secret.yaml
    - k8s/legacy/postgres-deployment.yaml
    - k8s/legacy/cert-manager.yaml
  modified: []

key-decisions:
  - "Archive legacy manifests instead of deleting for rollback capability"
  - "Remove k8s/database/ directory - no stateful workloads on Pi cluster"
  - "k8s/backend/ contains only Service+Endpoints (no Deployment) for VM routing"

patterns-established:
  - "Archive legacy configs in subdirectory with ARCHIVED headers"
  - "Clean active directory structure - only manifests that kubectl applies"
  - "Human verification checkpoint before deployment execution"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 05 Plan 05: Legacy Cleanup and Configuration Review

**Archived legacy k8s manifests (backend deployment, postgres StatefulSet, cert-manager), removed stateful workloads from Pi cluster, and verified complete split architecture configuration**

## Performance

- **Duration:** 5 minutes (including checkpoint review)
- **Started:** 2026-02-07T12:15:00Z
- **Completed:** 2026-02-07T18:41:43Z
- **Tasks:** 2
- **Files modified:** 5 moved to archive

## Accomplishments

- Archived 5 legacy k8s manifests to k8s/legacy/ with ARCHIVED headers
- Removed k8s/database/ directory - Pi cluster no longer runs PostgreSQL
- Verified k8s/backend/ contains ONLY Service+Endpoints for VM routing (no Deployment)
- Human-reviewed complete split architecture configuration (Dockerfiles, k8s manifests, deployment scripts)
- Phase 5 deployment reconfiguration 100% complete and ready for GitOps

## Task Commits

Each task was committed atomically:

1. **Task 1: Archive legacy k8s manifests and clean up directory structure** - `b74d66f` (refactor)
2. **Task 2: Review complete split architecture configuration** - Human verification checkpoint (approved)

**Plan metadata:** Will be committed as part of completion

## Files Created/Modified

### Created (Archived)
- `k8s/legacy/backend-deployment.yaml` - Old backend k8s deployment (replaced by Proxmox VM)
- `k8s/legacy/backend-deployment-secure.yaml` - Old secure backend variant (replaced)
- `k8s/legacy/backend-secret.yaml` - Old k8s secret manifest (replaced by VM .env)
- `k8s/legacy/postgres-deployment.yaml` - Old PostgreSQL StatefulSet (replaced by Supabase on VM)
- `k8s/legacy/cert-manager.yaml` - Old cert-manager config (replaced by Traefik)

### Directory Structure After Cleanup
```
k8s/
  frontend/
    deployment.yaml    (ARM64 pods on Pi cluster)
  backend/
    service.yaml       (routes traffic to VM)
    endpoints.yaml     (VM IP: 192.168.0.50:3001)
  ingress.yaml         (Traefik: /api -> VM, / -> frontend)
  legacy/              (archived manifests for rollback)
```

## Decisions Made

**Archive instead of delete:** Legacy manifests preserved in k8s/legacy/ for rollback capability if split architecture needs adjustment. Each file has ARCHIVED header documenting replacement.

**Remove empty directories:** k8s/database/ removed after postgres-deployment.yaml archived. Clean structure makes intent clear - no stateful workloads on Pi cluster.

**Human verification checkpoint:** Configuration review confirmed before actual deployment. All Dockerfiles, k8s manifests, and deployment scripts verified for correctness with infrastructure topology (192.168.0.50 for VM, 192.168.0.40-43 for Pi cluster).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - legacy manifest archival and directory cleanup completed without issues.

## User Setup Required

None - no external service configuration required. Configuration review checkpoint included verification commands for Dockerfiles and manifests.

## Next Phase Readiness

**Phase 5 Complete - Ready for Phase 6 (GitOps with Flux)**

Phase 5 deliverables:
- Backend Docker configuration for Proxmox VM (05-01)
- Frontend Docker configuration with hardened nginx (05-02)
- Kubernetes manifests for split architecture (05-03)
- Automated build and deployment scripts (05-04)
- Clean k8s directory with archived legacy manifests (05-05)

**Next:** Phase 6 will implement GitOps with Flux for automated k8s deployments. All manifests are syntax-validated and ready for Flux management.

**Note:** Runtime testing deferred until Proxmox VM is available at 192.168.0.50. All configurations are syntax-validated and structurally correct for the split architecture.

---
*Phase: 05-deployment-reconfiguration*
*Completed: 2026-02-07*
