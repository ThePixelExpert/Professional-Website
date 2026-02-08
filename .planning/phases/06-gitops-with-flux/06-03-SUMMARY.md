---
phase: 06-gitops-with-flux
plan: 03
subsystem: infra
tags: [flux, gitops, kubernetes, docker-compose, ssh, deployment, job]

# Dependency graph
requires:
  - phase: 05-deployment-reconfiguration
    provides: Backend docker-compose.yml with health checks and resource limits
  - phase: 06-gitops-with-flux-02
    provides: Frontend Deployment with Flux setter comments
provides:
  - Backend docker-compose.backend.yml with Flux image setter comment
  - Kubernetes Job that SSHs to Proxmox VM for backend deployment
  - Health check validation in deployment Job
affects: [06-04-sealed-secrets, production-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSH-based deployment via Kubernetes Job"
    - "Flux ImageUpdateAutomation for non-Kubernetes workloads (docker-compose)"
    - "Git repo as source of truth for VM-deployed compose files"

key-files:
  created:
    - flux/clusters/production/backend/docker-compose.backend.yml
    - flux/clusters/production/backend/deploy-job.yaml
    - flux/clusters/production/backend/kustomization.yaml
  modified: []

key-decisions:
  - "Backend deploy Job uses git pull on VM to get Flux-updated compose file"
  - "docker-compose file excluded from Kustomization resources (not a k8s resource)"
  - "SSH key mounted from SealedSecret vm-ssh-key with mode 0400"
  - "Health check in Job validates deployment before marking success"

patterns-established:
  - "Kubernetes Job pattern for managing deployments to external VMs"
  - "Flux setter comments work for any YAML file in git, not just k8s manifests"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 06 Plan 03: Backend Deployment Manifests Summary

**Flux-managed backend deployment via SSH-based Kubernetes Job that pulls git-updated docker-compose file and deploys to Proxmox VM**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T21:17:39Z
- **Completed:** 2026-02-07T21:19:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created Flux-managed docker-compose.backend.yml with image setter comment for automated tag updates
- Implemented Kubernetes Job that bridges gap between Flux (k8s) and backend (VM)
- Job pulls latest git repo on VM to get Flux's compose file updates, then deploys via docker compose
- Health check validation ensures backend starts correctly before Job completes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backend docker-compose with Flux setter comment** - `1de8ea2` (feat)
   - Note: Also included previously untracked frontend manifests from plan 06-02

2. **Task 2: Create backend deploy Job and Kustomization** - Committed earlier in `805d740` (feat)
   - Files were created and committed in previous plan execution but are correct

## Files Created/Modified
- `flux/clusters/production/backend/docker-compose.backend.yml` - Flux-managed compose file with setter comment, replaces ${GIT_SHA} env var with hardcoded placeholder tag
- `flux/clusters/production/backend/deploy-job.yaml` - Kubernetes Job that SSHs to 192.168.0.50, pulls git repo, copies compose file, runs docker compose pull/up, validates health
- `flux/clusters/production/backend/kustomization.yaml` - References only deploy-job.yaml (docker-compose excluded as it's not a k8s resource)

## Decisions Made
- **Git pull on VM for compose updates**: Job runs `git pull` on the VM's repo clone to get Flux's image tag updates, then copies compose file to deploy directory
- **Separate Flux-managed and manual compose files**: Root docker-compose.backend.yml stays for manual deployments, flux version is Flux-managed
- **StrictHostKeyChecking=no**: VM has IP address only, no DNS entry for SSH host key verification
- **backoffLimit: 1**: Retry once on failure, then mark Job as failed
- **Health check in Job**: Validates backend started correctly with curl to /api/health endpoint

## Deviations from Plan

### Pre-existing Task 2 Files

**Task 2 files already committed**
- **Found during:** Task 2 execution
- **Issue:** deploy-job.yaml and kustomization.yaml were already committed in previous commit 805d740 (from plan 06-01)
- **Outcome:** Files exist with correct content, no changes needed
- **Impact:** Task 2 work was already complete, verified files match plan requirements

---

**Total deviations:** 1 pre-existing work
**Impact on plan:** No impact - files existed with correct content, all verification checks passed

## Issues Encountered
None - all files created correctly, YAML validation passed, verification checks passed

## User Setup Required

Manual steps required before Job can deploy:

1. **Create SSH keypair for VM access**
   ```bash
   ssh-keygen -t ed25519 -f vm-ssh-key -N ""
   ```

2. **Add public key to VM's authorized_keys**
   ```bash
   ssh-copy-id -i vm-ssh-key.pub ubuntu@192.168.0.50
   ```

3. **Create SealedSecret** (see plan 06-04)
   ```bash
   kubectl create secret generic vm-ssh-key \
     --from-file=id_ed25519=vm-ssh-key \
     --namespace=website \
     --dry-run=client -o yaml | \
     kubeseal -o yaml > flux/clusters/production/backend/vm-ssh-key-sealed.yaml
   ```

4. **Clone repo on VM**
   ```bash
   ssh ubuntu@192.168.0.50
   sudo mkdir -p /opt/professional-website
   sudo chown ubuntu:ubuntu /opt/professional-website
   git clone <repo-url> /opt/professional-website
   ```

## Next Phase Readiness

**Ready for:**
- Plan 06-04: SealedSecret creation for SSH key and .env variables
- Backend deployment testing once VM is configured and SSH key sealed

**Blockers:**
- VM must be accessible at 192.168.0.50
- SSH keypair must be created and sealed
- Git repo must be cloned on VM at /opt/professional-website
- .env file must exist on VM at /opt/backend/.env

**Notes:**
- Job pattern is reusable for other VM-based deployments
- Flux ImageUpdateAutomation will update docker-compose file's image tag automatically
- Job can be triggered by Flux reconciliation or manual kubectl apply

---
*Phase: 06-gitops-with-flux*
*Completed: 2026-02-07*
