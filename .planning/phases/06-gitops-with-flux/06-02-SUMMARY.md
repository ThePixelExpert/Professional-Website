---
phase: 06-gitops-with-flux
plan: 02
subsystem: infra
tags: [flux, kubernetes, kustomize, gitops, k3s, traefik]

# Dependency graph
requires:
  - phase: 05-deployment-reconfiguration
    provides: Split architecture k8s manifests in k8s/ directory
  - phase: 06-01
    provides: Sortable image tags for Flux automation
provides:
  - Flux-managed frontend Kustomize manifests with image setter comments
  - Flux-managed ingress manifests for split architecture routing
  - Complete flux/clusters/production/ structure for k8s resources
affects: [06-03, 06-04, future GitOps workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flux image setter comments: # {\"$imagepolicy\": \"flux-system:frontend\"}"
    - "Kustomize structure under flux/clusters/production/"
    - "Namespace + Deployment + Service + Ingress pattern"

key-files:
  created:
    - flux/clusters/production/frontend/namespace.yaml
    - flux/clusters/production/frontend/deployment.yaml
    - flux/clusters/production/frontend/service.yaml
    - flux/clusters/production/frontend/kustomization.yaml
    - flux/clusters/production/ingress/ingress.yaml
    - flux/clusters/production/ingress/kustomization.yaml
  modified: []

key-decisions:
  - "Frontend manifests live under flux/clusters/production/frontend/ for Flux reconciliation"
  - "Ingress separated into its own directory (routes to both services)"
  - "Readiness probe initialDelaySeconds increased to 10s for Pi cold-start performance"
  - "Placeholder tag main-placeholder-0000000000 follows sortable format for Flux automation"

patterns-established:
  - "Flux image setter pattern: image line ends with # {\"$imagepolicy\": \"namespace:name\"} comment"
  - "Kustomize resources list: namespace → deployment → service order"
  - "Ingress priority routing: API (2000) > Frontend (1000) for path precedence"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 6 Plan 02: Flux-Managed Frontend Manifests Summary

**Flux-managed frontend Kustomize manifests with image automation setter comments and split-architecture ingress routing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T21:17:36Z
- **Completed:** 2026-02-07T21:19:23Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Created Flux-managed frontend manifests with proper Kustomize structure
- Added Flux image setter comment for automated tag updates: `# {"$imagepolicy": "flux-system:frontend"}`
- Created ingress manifests with split-architecture routing (API to backend VM, frontend to k3s pods)
- Established flux/clusters/production/ directory structure for GitOps

## Task Commits

Each task was committed atomically:

1. **Task 1: Create frontend Kustomize manifests** - (frontend manifests already existed from commit 1de8ea2)
2. **Task 2: Create ingress manifest** - `816b7aa` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `flux/clusters/production/frontend/namespace.yaml` - website namespace definition
- `flux/clusters/production/frontend/deployment.yaml` - Frontend deployment with Flux setter comment for automated tag updates
- `flux/clusters/production/frontend/service.yaml` - Frontend ClusterIP service for internal routing
- `flux/clusters/production/frontend/kustomization.yaml` - Kustomize config listing frontend resources
- `flux/clusters/production/ingress/ingress.yaml` - Split-architecture routing: /api to backend VM, / to frontend pods
- `flux/clusters/production/ingress/kustomization.yaml` - Kustomize config for ingress

## Decisions Made
- **Separate ingress directory**: Ingress routes to both frontend-service and backend-service, so it belongs in its own directory rather than nested under frontend/
- **Readiness probe tuning**: Increased initialDelaySeconds from 5s to 10s with periodSeconds 5s for faster detection on Pi hardware cold-start
- **Placeholder tag format**: Used `main-placeholder-0000000000` following sortable tag convention established in 06-01
- **No backend manifests**: Backend runs on Proxmox VM via docker-compose, only frontend runs in k3s cluster

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Frontend manifests already existed in repository**
- **Found during:** Task 1 (Create frontend Kustomize manifests)
- **Issue:** Frontend manifests (namespace, deployment, service, kustomization) were already committed in commit 1de8ea2 during plan 06-03 execution
- **Analysis:** Files already exist with correct content including Flux setter comment. Content matches plan specification exactly.
- **Resolution:** Verified files are correct and proceeded to Task 2. Frontend manifests already tracked in git.
- **Files affected:** flux/clusters/production/frontend/*.yaml
- **Verification:** All 4 files exist, YAML valid, setter comment present, resources match plan
- **Impact:** No re-commit needed, existing files are correct

---

**Total deviations:** 1 blocking issue handled (frontend manifests pre-existing)
**Impact on plan:** Frontend manifests created in prior execution were correct and complete. Task 2 proceeded normally. No rework needed.

## Issues Encountered
None - Task 2 executed as planned after verifying Task 1 files already existed correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flux-managed k8s manifests complete for frontend and ingress
- Image setter comments in place for automated tag updates
- Backend docker-compose managed by Flux (from 06-03)
- Ready for Flux GitRepository and Kustomization CRD creation (06-04)
- Ready for ImageRepository and ImagePolicy creation for automation

**Note**: Once Flux is installed in the cluster and GitRepository/Kustomization CRDs are applied, Flux will:
1. Reconcile these manifests to the cluster automatically
2. Monitor Harbor registry for new frontend images
3. Update deployment.yaml image tag when new tags appear
4. Commit updated manifests back to git

---
*Phase: 06-gitops-with-flux*
*Completed: 2026-02-07*
