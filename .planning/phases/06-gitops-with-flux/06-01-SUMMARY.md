---
phase: 06-gitops-with-flux
plan: 01
subsystem: infra
tags: [flux, gitops, github-actions, docker, ci-cd, harbor, image-automation]

# Dependency graph
requires:
  - phase: 05-deployment-reconfiguration
    provides: build-and-push.sh with git SHA tagging and Harbor registry
provides:
  - Flux-compatible sortable image tags (main-sha-timestamp format)
  - GitHub Actions CI workflow for automated builds on master push
  - Self-hosted runner pattern for homelab LAN registry access
affects: [06-02-flux-bootstrap, 06-03-image-automation]

# Tech tracking
tech-stack:
  added: [GitHub Actions, timestamp-based image tagging]
  patterns: [Sortable semantic tags for GitOps, self-hosted CI for LAN resources]

key-files:
  created:
    - .github/workflows/build-and-push.yml
  modified:
    - scripts/build-and-push.sh

key-decisions:
  - "Image tags use main-{sha}-{timestamp} format for Flux ImagePolicy alphabetical sorting"
  - "GitHub Actions self-hosted runner for LAN access to Harbor at 192.168.0.40:5000"
  - "Skip builds for docs, planning files, and Flux manifest changes via paths-ignore"

patterns-established:
  - "Sortable tags: Flux requires chronologically sortable tags - pure git SHAs don't work"
  - "CI on self-hosted: Cloud runners cannot reach LAN-only Harbor registry"

# Metrics
duration: 83s
completed: 2026-02-07
---

# Phase 6 Plan 01: CI Pipeline and Tag Format Summary

**Flux-compatible sortable image tags (main-sha-timestamp) and GitHub Actions workflow for automated Harbor builds**

## Performance

- **Duration:** 1 min 23 sec
- **Started:** 2026-02-07T21:17:30Z
- **Completed:** 2026-02-07T21:18:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated build-and-push.sh to generate sortable image tags with timestamp component
- Created GitHub Actions workflow for automated builds on master push
- Established CI pattern for homelab with self-hosted runner and LAN registry access

## Task Commits

Each task was committed atomically:

1. **Task 1: Update build-and-push.sh tag format for Flux compatibility** - `a52018e` (feat)
2. **Task 2: Create GitHub Actions workflow for automated builds** - `805d740` (feat)

## Files Created/Modified

- `.github/workflows/build-and-push.yml` - GitHub Actions workflow triggered on master push, runs on self-hosted runner with LAN access to Harbor
- `scripts/build-and-push.sh` - Modified to use main-{sha}-{timestamp} tag format, preserves GIT_SHA variable for display and deploy script compatibility

## Decisions Made

**Image tag format:** Changed from pure git SHA (`abc1234`) to sortable format (`main-abc1234-1707300000`). This is required because Flux ImagePolicy needs chronologically sortable tags to determine which image is newest. Pure git SHAs have no chronological ordering. The format uses:
- `main` - branch identifier
- `{sha}` - git commit short SHA for traceability
- `{timestamp}` - Unix epoch seconds for chronological sorting

**Self-hosted runner:** GitHub Actions workflow uses `runs-on: self-hosted` because:
- Harbor registry is at 192.168.0.40:5000 on homelab LAN
- Cloud runners (GitHub-hosted) cannot reach LAN-only resources
- Self-hosted runner on LAN has direct access to Harbor

**Build triggers:** Workflow ignores changes to:
- Markdown files (`**.md`)
- Planning directory (`.planning/**`)
- Flux manifests (`flux/**`)

This prevents unnecessary builds for documentation updates and Flux automation commits.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Self-hosted GitHub Actions runner required.** The workflow expects:
1. A self-hosted runner registered with the repository
2. Runner must be on homelab LAN with access to 192.168.0.40:5000
3. `.env.production` file must exist on the runner with React build environment variables

To set up the runner:
```bash
# On a machine with LAN access to Harbor
# Follow GitHub's "Add self-hosted runner" instructions:
# Settings → Actions → Runners → New self-hosted runner
```

The `.env.production` file is intentionally NOT in git (contains Supabase credentials). It must be manually created on the runner from `.env.template`.

## Next Phase Readiness

**Ready for Flux installation (plan 06-02):**
- Image tags are now sortable by Flux ImagePolicy
- CI pipeline will automatically push new images to Harbor on master commits
- Self-hosted runner pattern established for homelab CI

**Prerequisite for image automation (plan 06-03):**
- Sortable tag format enables Flux ImageUpdateAutomation to detect and update to newest image
- Tags follow pattern `^main-[a-f0-9]+-(?P<ts>[0-9]+)$` for regex extraction

**Note:** The GitHub Actions workflow will only function once a self-hosted runner is registered. Until then, builds remain manual via `./scripts/build-and-push.sh`.

---
*Phase: 06-gitops-with-flux*
*Completed: 2026-02-07*
