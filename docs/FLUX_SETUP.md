# Flux GitOps Setup Guide

Complete guide for setting up and operating Flux CD for automated deployments.

## Quick Start

For experienced users, here's the TL;DR:

```bash
# Install CLIs
curl -s https://fluxcd.io/install.sh | sudo bash
curl -LO "https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.25.0/kubeseal-0.25.0-linux-arm64.tar.gz"
tar xfz kubeseal-*.tar.gz && sudo install -m 755 kubeseal /usr/local/bin/kubeseal

# Export credentials
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export GITHUB_USER=yourusername

# Bootstrap Flux
./scripts/flux-bootstrap.sh

# Seal secrets and commit
./scripts/seal-secrets.sh
git add flux/ && git commit -m "chore: add sealed secrets" && git push

# Verify
flux get kustomizations
```

## Prerequisites

### 1. Flux CLI

Install Flux CLI on your local machine or Pi:

```bash
# For x86_64/AMD64
curl -s https://fluxcd.io/install.sh | sudo bash

# For ARM64 (Raspberry Pi)
curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify:
```bash
flux --version
```

### 2. Helm CLI

Install Helm for Sealed Secrets installation:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 3. Kubeseal CLI

Install kubeseal for encrypting secrets:

```bash
# For x86_64/AMD64
KUBESEAL_VERSION=0.25.0
curl -LO "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-amd64.tar.gz"
tar xfz kubeseal-*.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal

# For ARM64 (Raspberry Pi)
KUBESEAL_VERSION=0.25.0
curl -LO "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-linux-arm64.tar.gz"
tar xfz kubeseal-*.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

### 4. kubectl Access

Ensure kubectl is configured to access the k3s cluster:

```bash
# Copy kubeconfig from Pi
scp pi@192.168.0.40:~/.kube/config ~/.kube/config

# Or merge into existing config
scp pi@192.168.0.40:~/.kube/config ~/.kube/config-pi
export KUBECONFIG=~/.kube/config:~/.kube/config-pi
kubectl config view --flatten > ~/.kube/config
```

Verify:
```bash
kubectl get nodes
```

### 5. GitHub Personal Access Token

Generate a token with `repo` scope:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "Flux GitOps"
4. Scopes: Select `repo` (full control of private repositories)
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

Export the token:
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export GITHUB_USER=yourusername  # Your GitHub username
```

### 6. Self-Hosted GitHub Actions Runner

The CI pipeline requires a self-hosted runner on the Proxmox VM to push images to Harbor:

1. Go to GitHub repo → Settings → Actions → Runners → New self-hosted runner
2. Select Linux x64
3. Follow the registration instructions on the Proxmox VM
4. Install Docker and buildx on the runner host
5. Create `.env.production` file in the runner's working directory with React build variables

## Bootstrap

Run the bootstrap script to install Flux and Sealed Secrets:

```bash
GITHUB_TOKEN=ghp_xxx GITHUB_USER=yourusername ./scripts/flux-bootstrap.sh
```

### What Bootstrap Creates

The bootstrap process:
1. Runs Flux pre-flight checks (verifies kubectl, k8s version compatibility)
2. Installs Flux controllers in `flux-system` namespace:
   - source-controller (syncs git repo)
   - kustomize-controller (applies manifests)
   - helm-controller (manages Helm releases)
   - notification-controller (sends events)
   - image-reflector-controller (polls Harbor for new images)
   - image-automation-controller (updates git with new image tags)
3. Creates a deploy key in your GitHub repo (Flux uses this to pull from git)
4. Installs Sealed Secrets controller via Helm
5. Verifies all pods are running

### Verify Bootstrap

```bash
# Check Flux controllers
flux check

# List all Flux controllers
kubectl get pods -n flux-system

# Verify Sealed Secrets controller
kubectl get pods -n flux-system -l app.kubernetes.io/name=sealed-secrets
```

All pods should be in `Running` state.

## Seal Secrets

After bootstrap, seal your secrets before committing them to git:

```bash
./scripts/seal-secrets.sh
```

The script will prompt you for:
1. Harbor registry credentials (username/password for 192.168.0.40:5000)
2. VM SSH private key (for backend deployment Job)

### Commit Sealed Secrets

```bash
git add flux/clusters/production/sealed-secrets/
git commit -m "chore: add sealed secrets for Flux"
git push
```

### Verify Secret Decryption

After Flux reconciles, verify the secrets were decrypted correctly:

```bash
# Harbor credentials secret
kubectl get secret harbor-credentials -n flux-system

# VM SSH key secret
kubectl get secret vm-ssh-key -n website
```

The secrets should exist. DO NOT inspect their contents (they're base64 encoded, not encrypted).

## How It Works

### GitOps Flow

```
┌──────────────┐
│ Developer    │
│ pushes to    │
│ master       │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────────────────────┐
│ GitHub Actions (self-hosted runner on Proxmox VM)    │
│ - Builds frontend image (ARM64 for Pi)               │
│ - Builds backend image (AMD64 for Proxmox VM)        │
│ - Tags: main-{sha}-{timestamp}                       │
│ - Pushes to Harbor at 192.168.0.40:5000              │
└──────┬───────────────────────────────────────────────┘
       │
       v
┌──────────────────────────────────────────────────────┐
│ Flux Image Automation (polls every 1 minute)         │
│ - ImageRepository: Scans Harbor for new images       │
│ - ImagePolicy: Selects latest tag (alphabetically)   │
│ - ImageUpdateAutomation: Updates setter comments     │
│   in git with new image tags and commits             │
└──────┬───────────────────────────────────────────────┘
       │
       v
┌──────────────────────────────────────────────────────┐
│ Git Repository (source of truth)                     │
│ - flux/clusters/production/frontend/deployment.yaml  │
│ - flux/clusters/production/backend/docker-compose... │
│ - Both updated with new image tags                   │
└──────┬───────────────────────────────────────────────┘
       │
       v
┌──────────────────────────────────────────────────────┐
│ Flux Reconciliation (every 5-10 minutes)             │
│ 1. sealed-secrets (decrypt Harbor/SSH secrets)       │
│ 2. frontend (k8s Deployment, waits for health)       │
│ 3. ingress (routes traffic after frontend healthy)   │
│ 4. image-automation (CRDs already applied)           │
│ 5. backend-deploy (Job SSHs to VM, deploys backend)  │
└──────────────────────────────────────────────────────┘
```

### Reconciliation Order

Flux Kustomizations define dependencies via `dependsOn`:

1. **sealed-secrets** - No dependencies, runs first
2. **frontend** - Depends on sealed-secrets (needs Harbor credentials)
3. **image-automation** - Depends on sealed-secrets (needs Harbor credentials)
4. **ingress** - Depends on frontend (routing after frontend is healthy)
5. **backend-deploy** - Depends on frontend (user requirement: frontend first)

## Verification Commands

### Check Flux Reconciliation Status

```bash
# Overall Kustomization status
flux get kustomizations

# Expected output:
# NAME              READY   MESSAGE
# sealed-secrets    True    Applied revision: master/abc123
# frontend          True    Applied revision: master/abc123
# ingress           True    Applied revision: master/abc123
# image-automation  True    Applied revision: master/abc123
# backend-deploy    True    Applied revision: master/abc123
```

### Check Image Automation

```bash
# ImageRepository status (Harbor polling)
flux get image repository -n flux-system

# ImagePolicy status (tag selection)
flux get image policy -n flux-system

# Expected output shows latest tag selected:
# NAME      READY   MESSAGE
# frontend  True    Latest image tag for '...' resolved to: main-abc1234-1707300000
# backend   True    Latest image tag for '...' resolved to: main-abc1234-1707300000
```

### Check Deployment Status

```bash
# Frontend deployment on k8s
kubectl get deploy -n website

# Backend on Proxmox VM
ssh root@192.168.0.50 "cd /opt/professional-website && docker compose ps"
```

### View Flux Logs

```bash
# All Flux logs
flux logs --all-namespaces --follow

# Specific controller logs
kubectl logs -n flux-system -l app=source-controller --tail=50
kubectl logs -n flux-system -l app=kustomize-controller --tail=50
kubectl logs -n flux-system -l app=image-reflector-controller --tail=50
kubectl logs -n flux-system -l app=image-automation-controller --tail=50
```

## Rollback Procedure

To rollback a bad deployment, revert the git commit and push:

```bash
# Revert the most recent commit
git revert HEAD
git push

# Flux will detect the revert and redeploy the previous version
flux reconcile kustomization frontend --with-source
flux reconcile kustomization backend-deploy --with-source
```

### Rollback Both Frontend and Backend

If a deployment breaks compatibility between frontend and backend, rollback BOTH:

```bash
# Find the last good commit (before the breaking change)
git log --oneline -10

# Revert the breaking commit
git revert <commit-hash>
git push

# Force reconciliation immediately (don't wait for interval)
flux reconcile kustomization frontend --with-source
flux reconcile kustomization backend-deploy --with-source
```

### Verify Rollback

```bash
# Check Kustomization status
flux get kustomizations

# Verify image tags were reverted
kubectl get deploy frontend -n website -o jsonpath='{.spec.template.spec.containers[0].image}'
ssh root@192.168.0.50 "cd /opt/professional-website && cat docker-compose.backend.yml | grep image:"
```

## Troubleshooting

### Image Not Updating

**Symptoms:** New image pushed to Harbor, but Flux doesn't update git

**Debug steps:**
1. Check ImageRepository status:
   ```bash
   flux get image repository -n flux-system
   kubectl describe imagerepository frontend -n flux-system
   ```
   - Verify `Last scan time` is recent (within last minute)
   - Check for errors in `Conditions`

2. Verify Harbor connectivity:
   ```bash
   kubectl logs -n flux-system -l app=image-reflector-controller --tail=100
   ```
   - Look for connection errors to 192.168.0.40:5000
   - Verify `insecure: true` flag is set in ImageRepository

3. Check tag format:
   ```bash
   # Tags must match: main-{7-char-sha}-{10-digit-timestamp}
   # Example: main-abc1234-1707300000
   ```

4. Verify ImagePolicy selection:
   ```bash
   flux get image policy -n flux-system
   kubectl describe imagepolicy frontend -n flux-system
   ```

### Backend Job Failing

**Symptoms:** `backend-deploy` Kustomization shows error

**Debug steps:**
1. Check Job logs:
   ```bash
   kubectl logs -n website -l job-name=backend-deploy --tail=100
   ```

2. Verify SSH connectivity from cluster to VM:
   ```bash
   kubectl run -it --rm debug --image=alpine --restart=Never -- sh
   apk add openssh-client
   ssh -i /path/to/key root@192.168.0.50
   ```

3. Check VM health:
   ```bash
   ssh root@192.168.0.50 "systemctl status docker"
   ssh root@192.168.0.50 "cd /opt/professional-website && git status"
   ```

4. Verify Job has correct SSH key:
   ```bash
   kubectl get secret vm-ssh-key -n website
   ```

### Flux Not Reconciling

**Symptoms:** Changes pushed to git, but Flux doesn't apply them

**Debug steps:**
1. Check source-controller status:
   ```bash
   flux get sources git
   kubectl logs -n flux-system -l app=source-controller --tail=100
   ```

2. Verify GitRepository can access repo:
   ```bash
   kubectl describe gitrepository flux-system -n flux-system
   ```
   - Check `Conditions` for errors
   - Verify deploy key has read access

3. Force reconciliation:
   ```bash
   flux reconcile source git flux-system
   ```

### Sealed Secrets Not Decrypting

**Symptoms:** Pods stuck in `ImagePullBackOff` or `Error`

**Debug steps:**
1. Check Sealed Secrets controller logs:
   ```bash
   kubectl logs -n flux-system -l app.kubernetes.io/name=sealed-secrets --tail=100
   ```

2. Verify SealedSecret resources exist:
   ```bash
   kubectl get sealedsecret -A
   ```

3. Check if secrets were decrypted:
   ```bash
   kubectl get secret harbor-credentials -n flux-system
   kubectl get secret vm-ssh-key -n website
   ```

4. If secrets don't exist, re-seal and commit:
   ```bash
   ./scripts/seal-secrets.sh
   git add flux/clusters/production/sealed-secrets/
   git commit -m "fix: re-seal secrets"
   git push
   ```

## Architecture Overview

### Directory Structure

```
flux/
└── clusters/
    └── production/
        ├── flux-kustomization.yaml         # Flux Kustomizations (reconciliation order)
        ├── sealed-secrets/                 # Encrypted secrets (safe to commit)
        │   ├── kustomization.yaml
        │   ├── harbor-credentials.yaml     # Harbor registry auth
        │   └── vm-ssh-key.yaml             # SSH key for backend deploy Job
        ├── frontend/                       # k8s manifests for frontend
        │   ├── kustomization.yaml
        │   ├── namespace.yaml
        │   ├── deployment.yaml             # Has Flux setter comment
        │   └── service.yaml
        ├── ingress/                        # Split-architecture routing
        │   ├── kustomization.yaml
        │   └── ingress.yaml                # Routes to frontend + backend
        ├── backend/                        # Backend deploy Job
        │   ├── kustomization.yaml
        │   ├── deploy-job.yaml             # SSHs to VM, runs docker compose
        │   └── docker-compose.backend.yml  # Has Flux setter comment
        └── image-automation/               # Image automation CRDs
            ├── kustomization.yaml
            ├── image-repositories.yaml     # Polls Harbor every 1 min
            ├── image-policies.yaml         # Selects latest tag
            └── image-update-automation.yaml # Writes updates to git
```

### What Flux Manages

Flux directly manages these resources:
- Frontend Deployment, Service on k8s cluster
- Ingress routing on k8s cluster
- Sealed Secrets decryption on k8s cluster
- Image automation (ImageRepository, ImagePolicy, ImageUpdateAutomation)

### What Flux Triggers

Flux triggers the backend deployment Job, which:
- SSHs to Proxmox VM at 192.168.0.50
- Pulls git repo to get updated docker-compose.backend.yml
- Runs `docker compose up -d` to deploy new backend image
- Verifies backend health via curl to /api/health

### Manual Files (Not Managed by Flux)

These files are for reference or manual operations:
- scripts/flux-bootstrap.sh (run once during setup)
- scripts/seal-secrets.sh (run when secrets change)
- docs/FLUX_SETUP.md (this documentation)
