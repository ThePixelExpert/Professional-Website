---
phase: 06-gitops-with-flux
plan: 04
subsystem: gitops-secrets
requires:
  - 06-03 (Sealed Secrets controller deployment)
provides:
  - SealedSecret placeholder manifests for Harbor and VM SSH key
  - seal-secrets.sh helper script for generating encrypted secrets
affects:
  - 06-05 (Frontend GitRepository needs Harbor credentials)
  - 06-06 (Backend CronJob needs VM SSH key)

tech-stack:
  added:
    - Sealed Secrets manifests (bitnami.com/v1alpha1)
  patterns:
    - kubeseal CLI workflow for secret encryption
    - Placeholder manifests replaced by real encrypted values

key-files:
  created:
    - flux/clusters/production/sealed-secrets/harbor-credentials.yaml
    - flux/clusters/production/sealed-secrets/vm-ssh-key.yaml
    - flux/clusters/production/sealed-secrets/kustomization.yaml
    - scripts/seal-secrets.sh
  modified: []

decisions:
  - slug: harbor-credentials-in-flux-system
    choice: Place Harbor credentials SealedSecret in flux-system namespace
    rationale: ImageRepository CRDs that pull from Harbor are deployed in flux-system namespace
  - slug: vm-ssh-key-in-website
    choice: Place VM SSH key SealedSecret in website namespace
    rationale: Backend deploy CronJob runs in website namespace and needs to mount this secret
  - slug: interactive-seal-script
    choice: Use interactive prompts instead of command-line arguments for secrets
    rationale: Prevents secrets from appearing in shell history or process listings
  - slug: placeholder-manifests
    choice: Commit placeholder SealedSecret manifests with PLACEHOLDER values
    rationale: Establishes file structure and provides documentation before cluster-specific encryption

metrics:
  tasks: 2
  commits: 2
  duration: 93s
  completed: 2026-02-07

tags: [gitops, sealed-secrets, kubernetes-secrets, flux, security]
---

# Phase 06 Plan 04: Sealed Secrets Templates and Helper Script Summary

**One-liner:** Placeholder SealedSecret manifests for Harbor and VM SSH, plus interactive seal-secrets.sh encryption script

## What Was Built

Created the GitOps-friendly secret management structure for Flux using Sealed Secrets:

1. **SealedSecret Placeholder Manifests:**
   - `harbor-credentials.yaml` - Docker registry credentials for Harbor (flux-system namespace, dockerconfigjson type)
   - `vm-ssh-key.yaml` - SSH private key for Proxmox VM (website namespace, Opaque type)
   - `kustomization.yaml` - References both manifests for Kustomize deployment

2. **seal-secrets.sh Helper Script:**
   - Interactive prompts for Harbor username/password and SSH key path
   - Uses `kubectl create --dry-run=client | kubeseal` pattern
   - Validates prerequisites (kubeseal CLI, controller running)
   - Overwrites placeholder manifests with cluster-encrypted values
   - Provides clear next steps for git commit/push

## Key Technical Decisions

### Harbor Credentials in flux-system Namespace
Harbor registry credentials must be in the `flux-system` namespace because that's where the ImageRepository CRDs are deployed. Flux's image automation controllers need to authenticate with Harbor to scan for new image tags.

### VM SSH Key in website Namespace
The backend deploy CronJob runs in the `website` namespace and needs to SSH into the Proxmox VM at 192.168.0.50. The SSH key secret must be in the same namespace to be mountable by the Job.

### Interactive Secret Input
The seal-secrets.sh script prompts interactively instead of accepting command-line arguments. This prevents secrets from:
- Being saved in shell history
- Appearing in process listings (ps aux)
- Being logged in bash debug output

### Placeholder Manifests
Committing placeholder manifests with `PLACEHOLDER_RUN_SEAL_SECRETS_SH` values serves multiple purposes:
- Establishes the file structure and locations
- Documents what secrets are needed and where they go
- Provides clear API version (bitnami.com/v1alpha1) and type references
- Can be committed to git safely before the cluster exists

The real encrypted values are cluster-specific (depend on the controller's private key) and will replace these placeholders during bootstrap.

## Task Breakdown

### Task 1: Create SealedSecret Placeholder Manifests (Commit 658309e)
Created three files in `flux/clusters/production/sealed-secrets/`:
- `harbor-credentials.yaml` - SealedSecret for Harbor registry (192.168.0.40:5000)
- `vm-ssh-key.yaml` - SealedSecret for VM SSH key (ubuntu@192.168.0.50)
- `kustomization.yaml` - Kustomize resource list referencing both manifests

Each placeholder includes:
- Clear comments explaining purpose and requirements
- Correct API version (bitnami.com/v1alpha1)
- Proper namespace (flux-system or website)
- Correct secret type (dockerconfigjson or Opaque)
- Placeholder encrypted data values

### Task 2: Create seal-secrets.sh Helper Script (Commit 15602ed)
Created `scripts/seal-secrets.sh` with:
- Prerequisite checks (kubeseal CLI, controller availability)
- Interactive prompts for Harbor credentials
- Interactive prompt for SSH key path (defaults to ~/.ssh/id_ed25519)
- Validation (non-empty password, SSH key file exists)
- Uses kubectl create --dry-run | kubeseal to generate SealedSecrets
- Overwrites placeholder files with encrypted versions
- Provides clear next-step instructions (git add/commit/push)

**Bug fix applied (Deviation Rule 1):** The initial file write introduced Windows-style line endings (\r\n) which caused bash syntax errors. Applied `sed -i 's/\r$//'` to convert to Unix line endings (\n).

## Integration Points

### Upstream Dependencies
- **06-03 Sealed Secrets Controller:** Must be running before seal-secrets.sh can encrypt secrets (needs controller's public key)

### Downstream Consumers
- **06-05 Frontend GitRepository:** Harbor credentials enable Flux to pull images from private registry
- **06-06 Backend CronJob:** VM SSH key enables Job to deploy backend container to Proxmox VM

## Usage Workflow

**Bootstrap sequence (after Sealed Secrets controller installed):**

```bash
# 1. Generate real sealed secrets
./scripts/seal-secrets.sh
# Prompts for:
#   - Harbor username [admin]
#   - Harbor password
#   - SSH key path [~/.ssh/id_ed25519]

# 2. Commit encrypted secrets
git add flux/clusters/production/sealed-secrets/
git commit -m 'chore: seal secrets for Flux'
git push

# 3. Flux reconciles and creates Secrets
# - flux-system/harbor-credentials (type: dockerconfigjson)
# - website/vm-ssh-key (type: Opaque)
```

## Security Considerations

### Secret Never in Plaintext Git
The workflow ensures secrets are never committed in plaintext:
1. Placeholders committed initially (safe, just PLACEHOLDER text)
2. User runs seal-secrets.sh locally (secrets stay in terminal)
3. kubeseal encrypts with cluster's public key
4. Only encrypted SealedSecrets committed to git
5. Only the cluster's controller can decrypt (has private key)

### Namespace Isolation
Harbor credentials in flux-system:
- Can be used by ImageRepository controllers
- Cannot be accessed by workloads in website namespace (namespace boundary)

VM SSH key in website namespace:
- Can be mounted by backend deploy CronJob
- Cannot be accessed by Flux controllers in flux-system

## Verification Results

All verification checks passed:
- ✓ 3 files in sealed-secrets directory (including kustomization.yaml)
- ✓ seal-secrets.sh is executable
- ✓ seal-secrets.sh passes bash syntax check
- ✓ Both manifests use correct SealedSecret API version (bitnami.com/v1alpha1)
- ✓ Correct namespaces: flux-system for Harbor, website for SSH key
- ✓ Script uses kubeseal for encryption
- ✓ Script references both harbor-credentials and vm-ssh-key

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Windows line endings in seal-secrets.sh**
- **Found during:** Task 2 verification (bash -n syntax check)
- **Issue:** File written with \r\n line endings caused bash to report "unexpected end of file" error
- **Fix:** Applied `sed -i 's/\r$//'` to convert to Unix \n line endings
- **Files modified:** scripts/seal-secrets.sh
- **Commit:** 15602ed (included in same commit after fix)

## Files Created

```
flux/clusters/production/sealed-secrets/
├── harbor-credentials.yaml    (Harbor registry dockerconfigjson)
├── vm-ssh-key.yaml            (VM SSH key Opaque secret)
└── kustomization.yaml         (Kustomize resource list)

scripts/
└── seal-secrets.sh            (Interactive secret encryption helper)
```

## Next Steps

**Immediate next plan (06-05):** Create Flux GitRepository and ImageRepository CRDs that will consume the Harbor credentials.

**Future usage:** Before first Flux bootstrap, run seal-secrets.sh to generate real encrypted secrets.

## Lessons Learned

### File Writing Line Endings
When using the Write tool to create shell scripts, be aware that line endings may not match the expected Unix format. Always verify with `bash -n` and fix with sed if needed.

### Secret Namespace Planning
Plan secret namespaces based on which workloads need to consume them, not where they "logically" belong. Harbor credentials could logically belong in a "registry" namespace, but they must be in flux-system where the ImageRepository controllers run.

### Placeholder Documentation Value
Even though placeholder manifests are functionally useless until encrypted, they serve as excellent documentation. They show:
- Expected secret names and types
- Required namespaces
- Key names within the secrets
- Integration points (comments explain what uses them)

This makes the seal-secrets.sh script implementation straightforward - just follow the structure already defined in placeholders.

---

**Execution Time:** 93 seconds
**Commit Range:** 658309e...15602ed
**Status:** Complete ✓
