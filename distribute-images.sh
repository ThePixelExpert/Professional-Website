#!/bin/bash

# Edwards Engineering - Docker Image Distribution Script
# This script builds Docker images on the master node and distributes them to all worker nodes

set -e

# Configuration
MASTER_NODE="192.168.0.40"
WORKER_NODES=("192.168.0.41" "192.168.0.42" "192.168.0.43")
SSH_USER="pi"
SSH_PASS="Lomo2715!"
PROJECT_DIR="~/Professional-website"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Edwards Engineering Docker Image Distribution ===${NC}"

# Function to execute SSH command with password
ssh_exec() {
    local node=$1
    local command=$2
    echo -e "${YELLOW}Executing on ${node}: ${command}${NC}"
    sshpass -p "${SSH_PASS}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${node}" "${command}"
}

# Function to copy file with SCP
scp_copy() {
    local source=$1
    local node=$2
    local dest=$3
    echo -e "${YELLOW}Copying ${source} to ${node}:${dest}${NC}"
    sshpass -p "${SSH_PASS}" scp -o StrictHostKeyChecking=no "${source}" "${SSH_USER}@${node}:${dest}"
}

echo -e "${GREEN}Step 1: Building Docker images on master node...${NC}"
ssh_exec "${MASTER_NODE}" "cd ${PROJECT_DIR} && docker build -t edwards-engineering-frontend:latest -f Dockerfile.frontend ."
ssh_exec "${MASTER_NODE}" "cd ${PROJECT_DIR} && docker build -t edwards-engineering-backend:latest -f Dockerfile.backend ."

echo -e "${GREEN}Step 2: Saving Docker images to tar files...${NC}"
ssh_exec "${MASTER_NODE}" "cd ${PROJECT_DIR} && docker save edwards-engineering-frontend:latest -o frontend-image.tar"
ssh_exec "${MASTER_NODE}" "cd ${PROJECT_DIR} && docker save edwards-engineering-backend:latest -o backend-image.tar"

echo -e "${GREEN}Step 3: Distributing images to worker nodes...${NC}"
for node in "${WORKER_NODES[@]}"; do
    echo -e "${YELLOW}Processing node: ${node}${NC}"
    
    # Copy tar files to worker node
    ssh_exec "${MASTER_NODE}" "scp -o StrictHostKeyChecking=no ${PROJECT_DIR}/frontend-image.tar ${SSH_USER}@${node}:~/"
    ssh_exec "${MASTER_NODE}" "scp -o StrictHostKeyChecking=no ${PROJECT_DIR}/backend-image.tar ${SSH_USER}@${node}:~/"
    
    # Load images on worker node
    ssh_exec "${node}" "docker load -i ~/frontend-image.tar"
    ssh_exec "${node}" "docker load -i ~/backend-image.tar"
    
    # Clean up tar files
    ssh_exec "${node}" "rm -f ~/frontend-image.tar ~/backend-image.tar"
    
    echo -e "${GREEN}✓ Images distributed to ${node}${NC}"
done

echo -e "${GREEN}Step 4: Cleaning up tar files on master...${NC}"
ssh_exec "${MASTER_NODE}" "cd ${PROJECT_DIR} && rm -f frontend-image.tar backend-image.tar"

echo -e "${GREEN}Step 5: Verifying images on all nodes...${NC}"
echo -e "${YELLOW}Master node images:${NC}"
ssh_exec "${MASTER_NODE}" "docker images | grep edwards-engineering"

for node in "${WORKER_NODES[@]}"; do
    echo -e "${YELLOW}Node ${node} images:${NC}"
    ssh_exec "${node}" "docker images | grep edwards-engineering"
done

echo -e "${GREEN}=== Image distribution complete! ===${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Delete failing pods: sudo k3s kubectl delete pods -l app=frontend --field-selector=status.phase=Failed"
echo -e "2. Delete failing pods: sudo k3s kubectl delete pods -l app=backend --field-selector=status.phase=Failed"
echo -e "3. Apply updated deployments: sudo k3s kubectl apply -f k8s/"
echo -e "4. Monitor pod distribution: sudo k3s kubectl get pods -o wide -w"