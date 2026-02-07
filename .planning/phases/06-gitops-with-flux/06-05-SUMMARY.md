---
phase: 06-gitops-with-flux
plan: 05
subsystem: infra
tags: [flux, image-automation, gitops, harbor, kubernetes]

# Dependency graph
requires:
  - phase: 06-gitops-with-flux-02
    provides: Frontend Deployment with Flux setter comments
  - phase: 06-gitops-with-flux-03
    provides: Backend docker-compose.yml with Flux setter comments
provides:
  - Complete Flux image automation pipeline with ImageRepository, ImagePolicy, and ImageUpdateAutomation CRDs
  - Automated image tag detection from Harbor registry every 1 minute
  - Git-based image tag updates via setter comments
affects: [production-deployment, automated-gitops-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flux ImageRepository polling Harbor registry with insecure:true for HTTP"
    - "Flux ImagePolicy with alphabetical sorting for timestamp-based tags"
    - "Flux ImageUpdateAutomation with Setters strategy for git-based updates"

key-files:
  created:
    - flux/clusters/production/image-automation/image-repositories.yaml
    - flux/clusters/production/image-automation/image-policies.yaml
    - flux/clusters/production/image-automation/image-update-automation.yaml
    - flux/clusters/production/image-automation/kustomization.yaml
  modified: []

key-decisions:
  - "ImageRepository polls Harbor every 1 minute with insecure flag for HTTP registry"
  - "ImagePolicy uses alphabetical sorting with order:asc (highest = newest)"
  - "Tag filter matches main-SHA-TIMESTAMP format: ^main-[a-f0-9]{7}-[0-9]{10}$"
  - "ImageUpdateAutomation scopes to ./flux/clusters/production path"
  - "Automation commits to master branch with fluxcdbot author"

patterns-established:
  - "Flux image automation for Harbor registry: ImageRepository -> ImagePolicy -> ImageUpdateAutomation"
  - "Alphabetical sorting strategy for chronologically sortable tags"
  - "Setter comment strategy works for both k8s manifests and docker-compose files"

# Metrics
duration: 74s
completed: 2026-02-07
---

# Phase 6 Plan 05: Image Automation CRDs Summary

**Complete Flux image automation pipeline: poll Harbor registry, select latest tag, write updates to git**

## Performance

- **Duration:** 74 seconds (1.2 min)
- **Started:** 2026-02-07T21:23:26Z
- **Completed:** 2026-02-07T21:24:40Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- Created complete Flux image automation pipeline with 3 CRD types
- ImageRepository CRDs poll Harbor at 192.168.0.40:5000 for frontend and backend images
- ImagePolicy CRDs use alphabetical sorting to select latest timestamp-based tag
- ImageUpdateAutomation CRD scans flux/clusters/production/ for setter comments and commits updates
- All CRDs properly configured for HTTP Harbor registry (insecure:true)
- Tag filter pattern matches sortable format from build-and-push.sh

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ImageRepository and ImagePolicy CRDs** - `7caa0b3` (feat)
2. **Task 2: Create ImageUpdateAutomation CRD and Kustomization** - `0c4fab5` (feat)

## Files Created/Modified

- `flux/clusters/production/image-automation/image-repositories.yaml` - ImageRepository CRDs for frontend and backend, polling Harbor every 1 minute with insecure:true flag
- `flux/clusters/production/image-automation/image-policies.yaml` - ImagePolicy CRDs selecting latest tag via alphabetical sorting, filtering for main-SHA-TIMESTAMP pattern
- `flux/clusters/production/image-automation/image-update-automation.yaml` - ImageUpdateAutomation CRD that updates setter comments in git and commits to master
- `flux/clusters/production/image-automation/kustomization.yaml` - Kustomize config referencing all 3 image automation CRDs

## Decisions Made

- **Alphabetical sorting over numerical extraction:** Used `policy.alphabetical.order: asc` with `extract: '$0'` for simplicity. The full tag `main-abc1234-1707300000` is alphabetically sortable due to the timestamp component.
- **Scope automation to production cluster only:** Set `update.path: ./flux/clusters/production` to prevent accidental updates to base manifests or other cluster configs.
- **1-minute polling interval:** Balanced between responsiveness (faster detection) and registry load (Harbor can handle 1-minute polls).
- **secretRef for Harbor credentials:** ImageRepository references `harbor-credentials` secret (to be created in 06-04 Sealed Secrets plan).
- **fluxcdbot commit author:** Standard Flux convention for automation commits.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files created correctly, YAML validation passed, verification checks passed.

## User Setup Required

Before Flux image automation can run:

1. **Install Flux with image automation controllers** (bootstrap with --components-extra=image-reflector-controller,image-automation-controller)
2. **Create harbor-credentials secret** (plan 06-04 will create this via SealedSecret)
3. **Apply image automation CRDs to cluster**
   ```bash
   kubectl apply -k flux/clusters/production/image-automation/
   ```
4. **Verify ImageRepository status**
   ```bash
   flux get image repository -n flux-system
   ```
5. **Verify ImagePolicy status**
   ```bash
   flux get image policy -n flux-system
   ```

## Next Phase Readiness

**Ready for:**
- Flux bootstrap with image automation controllers
- Harbor credentials SealedSecret creation (06-04)
- End-to-end automated deployment testing

**Automation flow:**
1. CI pushes new image to Harbor with tag `main-abc1234-1707300000`
2. ImageRepository detects new tag within 1 minute
3. ImagePolicy selects it as latest (alphabetically highest)
4. ImageUpdateAutomation finds setter comments in:
   - `flux/clusters/production/frontend/deployment.yaml`
   - `flux/clusters/production/backend/docker-compose.backend.yml`
5. Automation updates image tags and commits to master
6. Flux reconciles updated manifests to cluster
7. New images deployed automatically

**Blockers:**
- None - all automation CRDs created and ready for use

**Notes:**
- The `insecure: true` flag is REQUIRED because Harbor at 192.168.0.40:5000 uses HTTP (no TLS in homelab)
- Tag filter `^main-[a-f0-9]{7}-[0-9]{10}$` matches ONLY the sortable format, ignoring `latest` or other tags
- ImageUpdateAutomation will NOT create infinite loops - it only commits when image tag actually changes
- The update.path scoping prevents accidental updates outside production cluster manifests

---
*Phase: 06-gitops-with-flux*
*Completed: 2026-02-07*
