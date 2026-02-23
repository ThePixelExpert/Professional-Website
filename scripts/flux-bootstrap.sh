#!/bin/bash
set -euo pipefail

# flux-bootstrap.sh - One-time setup for Flux GitOps on k3s cluster
#
# Prerequisites:
#   - kubectl configured for k3s cluster
#   - GITHUB_TOKEN env var set (personal access token with 'repo' scope)
#   - flux CLI installed (https://fluxcd.io/flux/installation/#install-the-flux-cli)
#   - helm CLI installed
#   - kubeseal CLI installed
#
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/flux-bootstrap.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration - Update these for your setup
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-Professional-Website}"

echo -e "${GREEN}=== Flux GitOps Bootstrap ===${NC}"
echo ""

# --- Prerequisite Checks ---
echo -e "${YELLOW}Checking prerequisites...${NC}"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo -e "${RED}Error: GITHUB_TOKEN not set${NC}"
  echo "Export a personal access token with 'repo' scope:"
  echo "  export GITHUB_TOKEN=ghp_xxxxxxxxxxxx"
  exit 1
fi

if [ -z "${GITHUB_USER}" ]; then
  echo -e "${RED}Error: GITHUB_USER not set${NC}"
  echo "Export your GitHub username:"
  echo "  export GITHUB_USER=yourusername"
  exit 1
fi

for cmd in flux kubectl helm kubeseal; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}Error: $cmd is not installed${NC}"
    exit 1
  fi
done

echo -e "${GREEN}All prerequisites met${NC}"
echo ""

# --- Step 1: Flux Pre-flight Check ---
echo -e "${YELLOW}Step 1: Running Flux pre-flight checks...${NC}"
flux check --pre
echo -e "${GREEN}Pre-flight checks passed${NC}"
echo ""

# --- Step 2: Install Sealed Secrets controller BEFORE bootstrap ---
# Must be installed first so the SealedSecret CRD exists when Flux
# reconciles the sealed-secrets/ manifests already in the repo.
echo -e "${YELLOW}Step 2: Installing Sealed Secrets controller...${NC}"
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

helm upgrade --install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace flux-system \
  --create-namespace \
  --set-string fullnameOverride=sealed-secrets-controller \
  --wait

echo -e "${GREEN}Sealed Secrets controller installed${NC}"
echo ""

# --- Step 3: Bootstrap Flux ---
echo -e "${YELLOW}Step 3: Bootstrapping Flux...${NC}"
flux bootstrap github \
  --owner="${GITHUB_USER}" \
  --repository="${GITHUB_REPO}" \
  --branch=master \
  --path=flux/clusters/production \
  --components-extra=image-reflector-controller,image-automation-controller \
  --read-write-key \
  --personal

echo -e "${GREEN}Flux bootstrapped successfully${NC}"
echo ""

# --- Step 4: Verify Installation ---
echo -e "${YELLOW}Step 4: Verifying installation...${NC}"
flux check
echo ""

echo -e "${YELLOW}Flux controllers:${NC}"
kubectl get pods -n flux-system
echo ""

echo -e "${YELLOW}Sealed Secrets controller:${NC}"
kubectl get pods -n flux-system -l app.kubernetes.io/name=sealed-secrets
echo ""

# --- Step 5: Next Steps ---
echo -e "${GREEN}=== Bootstrap Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Seal secrets:  ./scripts/seal-secrets.sh"
echo "  2. Commit sealed secrets:  git add flux/ && git commit -m 'chore: add sealed secrets' && git push"
echo "  3. Verify Flux reconciliation:  flux get kustomizations"
echo "  4. Watch image automation:  flux get image policy --all-namespaces"
echo ""
echo "See docs/FLUX_SETUP.md for full documentation."
