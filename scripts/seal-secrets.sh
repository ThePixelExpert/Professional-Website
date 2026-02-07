#!/bin/bash
set -euo pipefail

# seal-secrets.sh - Generate SealedSecret manifests for Flux GitOps
#
# Prerequisites:
#   - kubeseal CLI installed (see docs/FLUX_SETUP.md)
#   - Sealed Secrets controller running on k3s cluster
#   - kubectl configured to access k3s cluster
#
# Usage: ./scripts/seal-secrets.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEALED_DIR="${REPO_ROOT}/flux/clusters/production/sealed-secrets"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Seal Secrets for Flux ===${NC}"
echo ""

# Check prerequisites
if ! command -v kubeseal &>/dev/null; then
  echo -e "${RED}Error: kubeseal is not installed${NC}"
  echo "Install it:"
  echo "  KUBESEAL_VERSION='0.24.0'"
  echo "  wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v\${KUBESEAL_VERSION}/kubeseal-\${KUBESEAL_VERSION}-linux-arm64.tar.gz"
  echo "  tar -xvzf kubeseal-*.tar.gz kubeseal"
  echo "  sudo install -m 755 kubeseal /usr/local/bin/kubeseal"
  exit 1
fi

if ! kubectl get pods -n flux-system -l app.kubernetes.io/name=sealed-secrets-controller &>/dev/null 2>&1; then
  echo -e "${YELLOW}Warning: Cannot verify Sealed Secrets controller is running${NC}"
  echo "Make sure the controller is installed before sealing secrets."
  echo ""
fi

# --- Harbor Credentials ---
echo -e "${YELLOW}--- Harbor Registry Credentials ---${NC}"
echo "Harbor registry: 192.168.0.40:5000"

read -p "Harbor username [admin]: " HARBOR_USER
HARBOR_USER=${HARBOR_USER:-admin}

read -sp "Harbor password: " HARBOR_PASS
echo ""

if [ -z "$HARBOR_PASS" ]; then
  echo -e "${RED}Error: Harbor password cannot be empty${NC}"
  exit 1
fi

echo -e "${YELLOW}Creating Harbor credentials SealedSecret...${NC}"

kubectl create secret docker-registry harbor-credentials \
  --namespace=flux-system \
  --docker-server=192.168.0.40:5000 \
  --docker-username="${HARBOR_USER}" \
  --docker-password="${HARBOR_PASS}" \
  --dry-run=client -o yaml | \
  kubeseal --format yaml --controller-namespace flux-system > "${SEALED_DIR}/harbor-credentials.yaml"

echo -e "${GREEN}Sealed: ${SEALED_DIR}/harbor-credentials.yaml${NC}"
echo ""

# --- VM SSH Key ---
echo -e "${YELLOW}--- VM SSH Key ---${NC}"
echo "Target: ubuntu@192.168.0.50 (Proxmox VM)"

DEFAULT_KEY="$HOME/.ssh/id_ed25519"
read -p "Path to SSH private key [${DEFAULT_KEY}]: " SSH_KEY_PATH
SSH_KEY_PATH=${SSH_KEY_PATH:-$DEFAULT_KEY}

if [ ! -f "$SSH_KEY_PATH" ]; then
  echo -e "${RED}Error: SSH key not found at ${SSH_KEY_PATH}${NC}"
  exit 1
fi

echo -e "${YELLOW}Creating VM SSH key SealedSecret...${NC}"

kubectl create secret generic vm-ssh-key \
  --namespace=website \
  --from-file=id_ed25519="${SSH_KEY_PATH}" \
  --dry-run=client -o yaml | \
  kubeseal --format yaml --controller-namespace flux-system > "${SEALED_DIR}/vm-ssh-key.yaml"

echo -e "${GREEN}Sealed: ${SEALED_DIR}/vm-ssh-key.yaml${NC}"
echo ""

# --- Summary ---
echo -e "${GREEN}=== Secrets Sealed ===${NC}"
echo "Files updated:"
echo "  ${SEALED_DIR}/harbor-credentials.yaml"
echo "  ${SEALED_DIR}/vm-ssh-key.yaml"
echo ""
echo "Next steps:"
echo "  git add flux/clusters/production/sealed-secrets/"
echo "  git commit -m 'chore: seal secrets for Flux'"
echo "  git push"
echo ""
echo "Flux will automatically decrypt and create the Kubernetes Secrets."
