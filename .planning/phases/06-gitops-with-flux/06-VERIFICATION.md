---
phase: 06-gitops-with-flux
verified: 2026-02-07T22:13:25Z
status: passed
score: 18/18 must-haves verified
---

# Phase 6: GitOps with Flux Verification Report

**Phase Goal:** Automate deployments with Flux for both frontend and backend
**Verified:** 2026-02-07T22:13:25Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Image tags are sortable by Flux ImagePolicy (contain timestamp component) | ✓ VERIFIED | build-and-push.sh uses `main-${GIT_SHA}-${TIMESTAMP}` format, matches ImagePolicy filter `^main-[a-f0-9]{7}-[0-9]{10}$` |
| 2 | Git push to master triggers automated image builds via GitHub Actions | ✓ VERIFIED | .github/workflows/build-and-push.yml triggers on push to master, runs self-hosted runner, executes build-and-push.sh |
| 3 | Both frontend (ARM64) and backend (AMD64) images are built and pushed to Harbor | ✓ VERIFIED | build-and-push.sh contains platform-specific builds for both frontend and backend targeting 192.168.0.40:5000 |
| 4 | Frontend Kubernetes manifests are managed by Flux Kustomization | ✓ VERIFIED | flux/clusters/production/frontend/ contains kustomization.yaml with deployment, service, namespace resources |
| 5 | Frontend deployment manifest contains Flux image setter comment for automated tag updates | ✓ VERIFIED | deployment.yaml line 25 contains `# {"$imagepolicy": "flux-system:frontend"}` |
| 6 | Frontend manifests create the website namespace and deploy 2 replicas with health probes | ✓ VERIFIED | namespace.yaml creates website namespace, deployment.yaml specifies replicas: 2, readinessProbe and livenessProbe configured |
| 7 | Backend deployment is triggered via a Kubernetes Job that SSHs to the Proxmox VM | ✓ VERIFIED | deploy-job.yaml creates Job that SSHs to ubuntu@192.168.0.50, runs git pull + docker compose up |
| 8 | docker-compose.backend.yml contains Flux image setter comment for automated tag updates | ✓ VERIFIED | docker-compose.backend.yml line 5 contains `# {"$imagepolicy": "flux-system:backend"}` |
| 9 | Backend deploy Job uses sealed SSH key and runs git pull + docker compose up on the VM | ✓ VERIFIED | Job mounts vm-ssh-key secret, runs git pull from /opt/professional-website, copies compose file, runs docker compose |
| 10 | Secret templates exist for Harbor credentials and VM SSH key | ✓ VERIFIED | harbor-credentials.yaml and vm-ssh-key.yaml exist as SealedSecret placeholders with correct structure |
| 11 | A script generates SealedSecret manifests from user-provided values | ✓ VERIFIED | seal-secrets.sh interactively collects credentials and uses kubeseal to generate sealed manifests |
| 12 | Plaintext secrets are never committed to git | ✓ VERIFIED | Only SealedSecret manifests with PLACEHOLDER values in git, seal-secrets.sh uses dry-run + kubeseal pattern |
| 13 | Flux polls Harbor registry for new frontend and backend images every 1 minute | ✓ VERIFIED | image-repositories.yaml defines ImageRepository CRDs with interval: 1m0s for both frontend and backend |
| 14 | ImagePolicy selects the latest image by alphabetical tag sorting (timestamp makes newest = highest) | ✓ VERIFIED | image-policies.yaml uses alphabetical.order: asc with filterTags pattern matching sortable format |
| 15 | ImageUpdateAutomation writes new tags back to git by updating setter comments in deployment and docker-compose files | ✓ VERIFIED | image-update-automation.yaml targets ./flux/clusters/production with Setters strategy, pushes to master |
| 16 | Flux Kustomization CRDs define the reconciliation order: sealed-secrets -> frontend -> ingress -> image-automation -> backend | ✓ VERIFIED | flux-kustomization.yaml defines 5 Kustomizations with dependsOn enforcing correct order |
| 17 | Bootstrap script installs Flux with image automation controllers and Sealed Secrets | ✓ VERIFIED | flux-bootstrap.sh runs flux bootstrap with --components-extra and helm install sealed-secrets |
| 18 | Setup documentation covers end-to-end: prerequisites, bootstrap, secret sealing, verification, rollback | ✓ VERIFIED | docs/FLUX_SETUP.md (515 lines) covers all phases with sections for Bootstrap, Rollback, Troubleshooting |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/build-and-push.sh` | Build script with Flux-compatible sortable tags | ✓ VERIFIED | 162 lines, executable, contains IMAGE_TAG with timestamp, targets Harbor registry |
| `.github/workflows/build-and-push.yml` | GitHub Actions workflow for automated builds | ✓ VERIFIED | 27 lines, valid YAML, triggers on master push, uses self-hosted runner |
| `flux/clusters/production/frontend/kustomization.yaml` | Kustomize config listing frontend resources | ✓ VERIFIED | Lists namespace, deployment, service resources |
| `flux/clusters/production/frontend/deployment.yaml` | Frontend Deployment with Flux setter comment | ✓ VERIFIED | 58 lines, contains imagepolicy comment on line 25, 2 replicas, health probes configured |
| `flux/clusters/production/frontend/service.yaml` | Frontend ClusterIP Service | ✓ VERIFIED | ClusterIP type, port 80, selector matches deployment |
| `flux/clusters/production/backend/deploy-job.yaml` | Kubernetes Job that SSHs to VM to deploy backend | ✓ VERIFIED | 65 lines, SSHs to 192.168.0.50, mounts vm-ssh-key, includes health check |
| `flux/clusters/production/backend/docker-compose.backend.yml` | Docker Compose for backend with Flux setter comment | ✓ VERIFIED | 30 lines, imagepolicy comment on line 5, no env vars in image field |
| `flux/clusters/production/backend/kustomization.yaml` | Kustomize config for backend resources | ✓ VERIFIED | Lists deploy-job.yaml (not docker-compose, correctly) |
| `flux/clusters/production/sealed-secrets/harbor-credentials.yaml` | Template/placeholder for Harbor registry credentials SealedSecret | ✓ VERIFIED | SealedSecret kind, flux-system namespace, dockerconfigjson type, placeholder value |
| `flux/clusters/production/sealed-secrets/vm-ssh-key.yaml` | Template/placeholder for VM SSH key SealedSecret | ✓ VERIFIED | SealedSecret kind, website namespace, Opaque type, placeholder value |
| `scripts/seal-secrets.sh` | Script to generate SealedSecrets from user inputs | ✓ VERIFIED | 103 lines, executable, uses kubeseal, interactive prompts, overwrites placeholders |
| `flux/clusters/production/image-automation/image-repositories.yaml` | ImageRepository CRDs polling Harbor for frontend and backend images | ✓ VERIFIED | 26 lines, 2 ImageRepository resources, targets 192.168.0.40:5000, insecure: true, interval: 1m0s |
| `flux/clusters/production/image-automation/image-policies.yaml` | ImagePolicy CRDs selecting latest tag by alphabetical sort | ✓ VERIFIED | 32 lines, 2 ImagePolicy resources, alphabetical policy, tag filter pattern matches build format |
| `flux/clusters/production/image-automation/image-update-automation.yaml` | ImageUpdateAutomation CRD writing tags back to git | ✓ VERIFIED | 31 lines, Setters strategy, targets flux/clusters/production, pushes to master |
| `flux/clusters/production/flux-kustomization.yaml` | Flux Kustomization CRDs defining reconciliation targets and order | ✓ VERIFIED | 98 lines, 5 Kustomization resources with dependsOn enforcing order, force: true on backend |
| `scripts/flux-bootstrap.sh` | Automated bootstrap script for Flux + Sealed Secrets installation | ✓ VERIFIED | 103 lines, executable, runs flux bootstrap github with image controllers, installs sealed-secrets via helm |
| `docs/FLUX_SETUP.md` | Complete setup and operations guide | ✓ VERIFIED | 515 lines, covers prerequisites, bootstrap, secret sealing, operations, rollback, troubleshooting |

**All 17 artifacts verified:** Exists + Substantive + Wired

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `.github/workflows/build-and-push.yml` | `scripts/build-and-push.sh` | workflow step runs the build script | ✓ WIRED | Line 26: `run: ./scripts/build-and-push.sh all` |
| `scripts/build-and-push.sh` | `192.168.0.40:5000` | docker buildx push to Harbor registry | ✓ WIRED | Line 16: REGISTRY="192.168.0.40:5000", used in -t flags for both images |
| `flux/clusters/production/frontend/deployment.yaml` | `flux-system:frontend` | Flux image setter comment on image line | ✓ WIRED | Line 25: imagepolicy comment matches ImagePolicy name |
| `flux/clusters/production/backend/deploy-job.yaml` | `192.168.0.50` | SSH connection to Proxmox VM | ✓ WIRED | Line 28: VM_HOST="ubuntu@192.168.0.50" used in all ssh commands |
| `flux/clusters/production/backend/docker-compose.backend.yml` | `flux-system:backend` | Flux image setter comment | ✓ WIRED | Line 5: imagepolicy comment matches ImagePolicy name |
| `scripts/seal-secrets.sh` | `flux/clusters/production/sealed-secrets/` | Generates sealed secret YAML files | ✓ WIRED | Lines 65, 89: kubeseal output redirected to sealed-secrets directory |
| `flux/clusters/production/sealed-secrets/vm-ssh-key.yaml` | `flux/clusters/production/backend/deploy-job.yaml` | Job mounts secretName: vm-ssh-key | ✓ WIRED | deploy-job.yaml line 63: secretName: vm-ssh-key matches SealedSecret name |
| `flux/clusters/production/image-automation/image-repositories.yaml` | `192.168.0.40:5000` | polls Harbor registry for image tags | ✓ WIRED | Lines 9, 21: image: 192.168.0.40:5000/frontend and /backend |
| `flux/clusters/production/image-automation/image-update-automation.yaml` | `flux/clusters/production` | updates YAML files with setter strategy | ✓ WIRED | Line 29: path: ./flux/clusters/production with strategy: Setters |
| `flux/clusters/production/image-automation/image-policies.yaml` | `flux/clusters/production/image-automation/image-repositories.yaml` | imageRepositoryRef references frontend/backend ImageRepository | ✓ WIRED | Lines 10, 25: imageRepositoryRef.name matches ImageRepository names |
| `flux/clusters/production/flux-kustomization.yaml` | `flux/clusters/production/frontend/` | Kustomization path reference | ✓ WIRED | Line 38: path: ./flux/clusters/production/frontend |
| `flux/clusters/production/flux-kustomization.yaml` | `flux/clusters/production/backend/` | Kustomization path reference with dependsOn frontend | ✓ WIRED | Line 89: path: ./flux/clusters/production/backend, line 95-96: dependsOn frontend |
| `scripts/flux-bootstrap.sh` | `flux/clusters/production/` | Bootstrap --path flag points to Flux directory | ✓ WIRED | Line 69: --path=flux/clusters/production |

**All 13 key links verified as WIRED**

### Requirements Coverage

No REQUIREMENTS.md entries mapped to Phase 06. Phase delivers on ROADMAP goal.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `flux/clusters/production/frontend/deployment.yaml` | 25 | main-placeholder-0000000000 | ℹ️ Info | Intentional placeholder - will be replaced by Flux ImageUpdateAutomation on first run |
| `flux/clusters/production/backend/docker-compose.backend.yml` | 5 | main-placeholder-0000000000 | ℹ️ Info | Intentional placeholder - will be replaced by Flux ImageUpdateAutomation on first run |
| `flux/clusters/production/sealed-secrets/harbor-credentials.yaml` | 1, 16 | PLACEHOLDER | ℹ️ Info | Intentional placeholder - must be replaced by running seal-secrets.sh before bootstrap |
| `flux/clusters/production/sealed-secrets/vm-ssh-key.yaml` | 1, 16 | PLACEHOLDER | ℹ️ Info | Intentional placeholder - must be replaced by running seal-secrets.sh before bootstrap |

**No blocker or warning anti-patterns found.** All placeholders are intentional and documented.

### Human Verification Required

#### 1. GitHub Actions Self-Hosted Runner Functionality

**Test:** Push a code change to master branch and verify automated build
**Expected:** 
- GitHub Actions workflow triggers
- Self-hosted runner on Proxmox VM executes build-and-push.sh
- Images are built for ARM64 (frontend) and AMD64 (backend)
- Images are pushed to Harbor at 192.168.0.40:5000 with sortable tags

**Why human:** Requires functional GitHub Actions runner, network access to Harbor, .env.production on runner

#### 2. Flux Bootstrap and Reconciliation

**Test:** Run flux-bootstrap.sh, then seal-secrets.sh, commit and push sealed secrets
**Expected:**
- Flux controllers installed in flux-system namespace
- Sealed Secrets controller installed
- Flux Kustomizations reconcile in correct order (check `flux get kustomizations`)
- Frontend deployment becomes healthy
- Backend Job executes successfully and VM shows running backend container

**Why human:** Requires kubectl access to k3s cluster, GitHub personal access token, functional Proxmox VM

#### 3. Image Automation End-to-End

**Test:** After bootstrap, push a code change that triggers new image build
**Expected:**
- GitHub Actions builds new image with timestamp tag (e.g., main-abc1234-1707300000)
- Flux ImageRepository detects new tag in Harbor within 1 minute
- Flux ImagePolicy selects new tag as latest
- Flux ImageUpdateAutomation updates deployment.yaml and docker-compose.backend.yml in git
- Flux reconciles updated manifests, deploying new images
- Frontend pods roll out new version (check `kubectl get pods -n website`)
- Backend Job runs, VM pulls and starts new backend container

**Why human:** Full GitOps loop requires all infrastructure components (GitHub Actions, Harbor, Flux, k3s, Proxmox VM) working together

#### 4. Rollback Procedure

**Test:** After a successful deployment, trigger a rollback using `git revert`
**Expected:**
- Revert commit updates image tags back to previous version
- Flux detects git change and reconciles
- Frontend rolls back to previous image
- Backend Job runs and VM starts previous backend container
- No manual intervention required beyond git revert + push

**Why human:** Tests disaster recovery path, requires understanding of git history and Flux reconciliation behavior

#### 5. Secret Management

**Test:** Verify sealed secrets are decrypted correctly by the cluster
**Expected:**
- After running seal-secrets.sh and pushing, check `kubectl get secrets -n flux-system harbor-credentials`
- Secret should exist with type kubernetes.io/dockerconfigjson
- Check `kubectl get secrets -n website vm-ssh-key` 
- Secret should exist with type Opaque containing id_ed25519 key
- ImageRepository can authenticate to Harbor (check `flux get image repository`)
- Backend Job can SSH to VM (check Job logs)

**Why human:** Verifies Sealed Secrets controller correctly decrypts secrets using cluster private key

---

## Summary

**Phase 6 goal ACHIEVED.** All 18 observable truths verified. Complete Flux GitOps automation infrastructure exists and is wired correctly:

1. **Build Infrastructure (Plan 01):** Sortable image tags + GitHub Actions CI ✓
2. **Frontend Flux Manifests (Plan 02):** Kustomize structure + image setter comments ✓
3. **Backend Flux Manifests (Plan 03):** SSH-based deploy Job + docker-compose with setter ✓
4. **Sealed Secrets (Plan 04):** Template placeholders + seal-secrets.sh helper ✓
5. **Image Automation (Plan 05):** ImageRepository + ImagePolicy + ImageUpdateAutomation ✓
6. **Bootstrap & Docs (Plan 06):** Flux Kustomizations + bootstrap script + comprehensive docs ✓

All artifacts are substantive (no stubs), properly wired (imports/references verified), and pass syntax validation. Dependency ordering is correct (sealed-secrets → frontend → backend). Tag format compatibility verified between build script and ImagePolicy filters. Secret references consistent across manifests.

**Human verification required** before production deployment to validate full GitOps loop with actual infrastructure (GitHub Actions runner, Harbor registry, k3s cluster, Proxmox VM).

**Recommendation:** Proceed to human verification checklist. Once infrastructure tests pass, phase is fully complete.

---

_Verified: 2026-02-07T22:13:25Z_
_Verifier: Claude (gsd-verifier)_
