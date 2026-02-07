#!/bin/bash
set -euo pipefail

# Make paths robust: change working dir to repo root (script_dir/..)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PI_HOST="192.168.0.40"
PI_USER="pi"
REGISTRY="192.168.0.40:5000"
GIT_SHA=$(git rev-parse --short HEAD)

echo -e "${GREEN}=== Frontend Deployment to k3s Cluster ===${NC}"
echo -e "${YELLOW}Cluster: ${PI_USER}@${PI_HOST}${NC}"
echo -e "${YELLOW}Git SHA: ${GIT_SHA}${NC}"
echo ""

# Function to run kubectl on the Pi
kubectl_pi() {
  ssh ${PI_USER}@${PI_HOST} "kubectl $*"
}

# Step 1: Ensure website namespace exists
echo -e "${YELLOW}Creating website namespace if needed...${NC}"
kubectl_pi create namespace website --dry-run=client -o yaml | kubectl_pi apply -f -
echo -e "${GREEN}✓ Namespace ready${NC}"

# Step 2: Apply backend Service and Endpoints (points to VM)
echo -e "${YELLOW}Applying backend Service and Endpoints...${NC}"
kubectl_pi apply -f - <<EOF
$(cat "${REPO_ROOT}/k8s/backend/service.yaml")
EOF

kubectl_pi apply -f - <<EOF
$(cat "${REPO_ROOT}/k8s/backend/endpoints.yaml")
EOF
echo -e "${GREEN}✓ Backend Service configured (points to VM at 192.168.0.50:3001)${NC}"

# Step 3: Update frontend image tag and apply deployment
echo -e "${YELLOW}Updating frontend deployment with image ${REGISTRY}/frontend:${GIT_SHA}...${NC}"
kubectl_pi set image deployment/frontend frontend=${REGISTRY}/frontend:${GIT_SHA} -n website || {
  echo -e "${YELLOW}Deployment doesn't exist yet, creating it...${NC}"
  kubectl_pi apply -f - <<EOF
$(cat "${REPO_ROOT}/k8s/frontend/deployment.yaml")
EOF
  kubectl_pi set image deployment/frontend frontend=${REGISTRY}/frontend:${GIT_SHA} -n website
}
echo -e "${GREEN}✓ Frontend deployment updated${NC}"

# Step 4: Apply ingress
echo -e "${YELLOW}Applying ingress configuration...${NC}"
kubectl_pi apply -f - <<EOF
$(cat "${REPO_ROOT}/k8s/ingress.yaml")
EOF
echo -e "${GREEN}✓ Ingress configured${NC}"

# Step 5: Wait for rollout to complete
echo -e "${YELLOW}Waiting for frontend rollout to complete...${NC}"
if kubectl_pi rollout status deployment/frontend -n website --timeout=120s; then
  echo -e "${GREEN}✓ Rollout completed successfully${NC}"
else
  echo -e "${RED}✗ Rollout failed or timed out${NC}"
  echo "Check status with: ssh ${PI_USER}@${PI_HOST} 'kubectl get pods -n website'"
  exit 1
fi

# Step 6: Verify resources
echo ""
echo -e "${YELLOW}=== Kubernetes Resources ===${NC}"

echo -e "${YELLOW}Pods:${NC}"
kubectl_pi get pods -n website

echo ""
echo -e "${YELLOW}Services:${NC}"
kubectl_pi get svc -n website

echo ""
echo -e "${YELLOW}Endpoints:${NC}"
kubectl_pi get endpoints -n website

echo ""
echo -e "${YELLOW}Ingress:${NC}"
kubectl_pi get ingress -n website

echo ""
echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo -e "Git SHA: ${YELLOW}${GIT_SHA}${NC}"
echo -e "Frontend Image: ${YELLOW}${REGISTRY}/frontend:${GIT_SHA}${NC}"
echo -e "Namespace: ${YELLOW}website${NC}"
echo -e "Status: ${GREEN}Deployed${NC}"
echo -e "${GREEN}Frontend deployment to k3s complete!${NC}"
