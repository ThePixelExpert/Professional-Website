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
VM_HOST="192.168.0.50"
VM_USER="ubuntu"
DEPLOY_DIR="~/backend"
GIT_SHA=$(git rev-parse --short HEAD)

echo -e "${GREEN}=== Backend Deployment to Proxmox VM ===${NC}"
echo -e "${YELLOW}VM: ${VM_USER}@${VM_HOST}${NC}"
echo -e "${YELLOW}Deploy Dir: ${DEPLOY_DIR}${NC}"
echo -e "${YELLOW}Git SHA: ${GIT_SHA}${NC}"
echo ""

# Step 1: Create deploy directory on VM
echo -e "${YELLOW}Creating deployment directory on VM...${NC}"
ssh ${VM_USER}@${VM_HOST} "mkdir -p ${DEPLOY_DIR}"
echo -e "${GREEN}✓ Directory created${NC}"

# Step 2: Copy docker-compose.backend.yml
echo -e "${YELLOW}Copying docker-compose.backend.yml to VM...${NC}"
scp "${REPO_ROOT}/docker-compose.backend.yml" ${VM_USER}@${VM_HOST}:${DEPLOY_DIR}/docker-compose.yml
echo -e "${GREEN}✓ Compose file copied${NC}"

# Step 3: Copy .env.production if it exists
if [ -f "${REPO_ROOT}/contact-backend/.env.production" ]; then
  echo -e "${YELLOW}Copying .env.production to VM...${NC}"
  scp "${REPO_ROOT}/contact-backend/.env.production" ${VM_USER}@${VM_HOST}:${DEPLOY_DIR}/.env
  echo -e "${GREEN}✓ Environment file copied${NC}"
else
  echo -e "${RED}Warning: contact-backend/.env.production not found!${NC}"
  echo "You need to create it from the template before deploying:"
  echo ""
  echo "  cd contact-backend"
  echo "  cp .env.template .env.production"
  echo "  # Edit .env.production with production Supabase credentials"
  echo ""
  exit 1
fi

# Step 4: Pull image and restart services
echo -e "${YELLOW}Pulling latest backend image (SHA: ${GIT_SHA})...${NC}"
ssh ${VM_USER}@${VM_HOST} "cd ${DEPLOY_DIR} && export GIT_SHA=${GIT_SHA} && docker compose pull"
echo -e "${GREEN}✓ Image pulled${NC}"

echo -e "${YELLOW}Starting backend container...${NC}"
ssh ${VM_USER}@${VM_HOST} "cd ${DEPLOY_DIR} && export GIT_SHA=${GIT_SHA} && docker compose up -d"
echo -e "${GREEN}✓ Container started${NC}"

# Step 5: Show container status
echo -e "${YELLOW}Container status:${NC}"
ssh ${VM_USER}@${VM_HOST} "cd ${DEPLOY_DIR} && docker compose ps"

# Step 6: Show recent logs
echo -e "${YELLOW}Recent logs:${NC}"
ssh ${VM_USER}@${VM_HOST} "cd ${DEPLOY_DIR} && docker compose logs --tail=20"

# Step 7: Wait for startup then verify health
echo -e "${YELLOW}Waiting 10 seconds for backend to start...${NC}"
sleep 10

echo -e "${YELLOW}Checking backend health...${NC}"
if ssh ${VM_USER}@${VM_HOST} "curl -sf http://localhost:3001/api/health" > /dev/null; then
  echo -e "${GREEN}✓ Backend health check passed${NC}"
else
  echo -e "${RED}✗ Backend health check failed!${NC}"
  echo "Check logs with: ssh ${VM_USER}@${VM_HOST} 'cd ${DEPLOY_DIR} && docker compose logs'"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo -e "Git SHA: ${YELLOW}${GIT_SHA}${NC}"
echo -e "Backend: ${GREEN}http://${VM_HOST}:3001${NC}"
echo -e "Status: ${GREEN}Healthy${NC}"
echo -e "${GREEN}Backend deployment complete!${NC}"
