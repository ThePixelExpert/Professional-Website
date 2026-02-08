# Phase 6: GitOps with Flux - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Automate deployments using Flux CD for continuous delivery. Git commits to main branch trigger automatic container builds and deployments for both frontend (k8s) and backend (Proxmox VM). Includes automated rollback on health check failures and coordinated staging between frontend and backend deployments.

Monitoring and alerting belong in v1.1, not this phase.

</domain>

<decisions>
## Implementation Decisions

### Deployment Triggers
- Push to main branch triggers automated deployments (no tags or manual approval)
- Fully automatic deployment pipeline (no approval gates)
- Failed tests block deployment (must fix and push again to deploy)
- Flux uses both approaches: Image automation for frontend (watches Harbor registry for new SHA tags), manifest sync for backend routing

### Image Rebuild Automation
- Rebuild both frontend and backend on every commit to main (ensures version consistency)
- Build location: Claude's discretion (choose based on infrastructure constraints)
- Backend VM receives updates via Flux Image Update Automation (Flux updates docker-compose.yml in git with new SHA, VM pulls via git sync)
- Secrets managed via Flux Sealed Secrets (encrypt in git, Flux decrypts on VM)

### Rollback Strategy
- Automatic rollback triggers: Failed health checks OR crash loops (CrashLoopBackOff)
- Rollback method: Git revert (Flux reverts commit, redeploys previous version for audit trail)
- Failure timeout: 5 minutes (balanced for apps with database migrations or warm-up)
- Notification: Git commit with rollback details (audit via git log, no external alerts)

### Deployment Staging
- Deployment order: Frontend first, then backend (less risky if backend has breaking changes)
- Delay between stages: Wait for frontend health check before backend deploys (1-2 min)
- Failure handling: If backend fails, rollback both frontend and backend to keep versions in sync
- Coordination: Flux manages both k8s manifests (frontend) and VM docker-compose (backend) via git sync

### Claude's Discretion
- Build infrastructure choice (VM, dev machine, or external CI)
- Exact Flux configuration and Kustomize structure
- Sealed Secrets encryption key management
- Git sync polling interval
- Health check probe configuration details

</decisions>

<specifics>
## Specific Ideas

- "I want git to be the source of truth for everything — if it's not in git, it didn't happen"
- Frontend and backend version consistency is important (rollback both if either fails)
- Homelab simplicity over enterprise complexity (Sealed Secrets preferred over external secret stores)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-gitops-with-flux*
*Context gathered: 2026-02-07*
