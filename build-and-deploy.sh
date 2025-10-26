#!/bin/bash

# Exit on error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set your Pi's IP address
piIp="192.168.0.40"

# Generate a unique tag using the current date and time
tag=$(date +"%Y%m%d%H%M%S")
echo -e "${GREEN}Using image tag: $tag${NC}"

# Get script directory (equivalent to $PSScriptRoot)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure ansible/tag.txt exists and write the tag value
ansibleTagPath="$SCRIPT_DIR/ansible/tag.txt"
ansibleDir="$(dirname "$ansibleTagPath")"

# Create directory if it doesn't exist
if [ ! -d "$ansibleDir" ]; then
    mkdir -p "$ansibleDir"
fi

# Write tag to file
echo "$tag" > "$ansibleTagPath"

# Ensure all needed directories exist on the Pi
# Note: k8s directory contains Kubernetes YAML files; k3s is the Kubernetes distribution used on the Pi
echo -e "${YELLOW}Creating directories on Pi...${NC}"
ssh pi@${piIp} "mkdir -p /home/pi/Professional-Website/ansible /home/pi/Professional-Website/k8s/frontend /home/pi/Professional-Website/k8s/backend /home/pi/Professional-Website/k8s/database"

# Copy k8s deployment files to the Pi
echo -e "${YELLOW}Copying k8s deployment files to Pi...${NC}"
scp k8s/frontend/deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/frontend/deployment.yaml
scp k8s/backend/deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/backend/deployment.yaml
scp k8s/backend/secret.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/backend/secret.yaml
scp k8s/database/postgres-deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/database/postgres-deployment.yaml
scp k8s/ingress.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/ingress.yaml

# 1. Build and push multi-arch frontend Docker image (amd64 and arm64) - no cache to ensure fresh build
echo -e "${YELLOW}Building and pushing frontend Docker image...${NC}"
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:$tag --push .

# 2. Build and push multi-arch backend Docker image (amd64 and arm64) - no cache to ensure fresh build
echo -e "${YELLOW}Building and pushing backend Docker image...${NC}"
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:$tag --push .

# Copy tag file to Pi
echo -e "${YELLOW}Copying tag file to Pi...${NC}"
scp $ansibleTagPath pi@${piIp}:/home/pi/Professional-Website/ansible/tag.txt

# 5. Run the Ansible playbook to update YAMLs and apply deployments
echo -e "${YELLOW}Running Ansible playbook...${NC}"
ansiblePath="$SCRIPT_DIR/ansible"
cd "$ansiblePath" && ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml

# 6. Clean up old Docker images (keep last 5 tags)
echo -e "${YELLOW}Cleaning up old Docker images...${NC}"

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Warning: jq is not installed. Skipping registry cleanup.${NC}"
    echo -e "${YELLOW}Install jq with: sudo apt-get install jq${NC}"
else
    # Get list of frontend tags and delete old ones (keep latest 5)
    frontendTags=$(curl -s "http://192.168.0.40:5000/v2/edwards-frontend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
    if [ ! -z "$frontendTags" ]; then
        echo "$frontendTags" | while read -r oldTag; do
            if [ ! -z "$oldTag" ]; then
                # Get manifest digest first
                manifest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')
                if [ ! -z "$manifest" ]; then
                    curl -s -X DELETE "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$manifest" 2>/dev/null || true
                fi
            fi
        done
    fi
    
    # Get list of backend tags and delete old ones (keep latest 5)
    backendTags=$(curl -s "http://192.168.0.40:5000/v2/edwards-backend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
    if [ ! -z "$backendTags" ]; then
        echo "$backendTags" | while read -r oldTag; do
            if [ ! -z "$oldTag" ]; then
                # Get manifest digest first
                manifest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://192.168.0.40:5000/v2/edwards-backend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')
                if [ ! -z "$manifest" ]; then
                    curl -s -X DELETE "http://192.168.0.40:5000/v2/edwards-backend/manifests/$manifest" 2>/dev/null || true
                fi
            fi
        done
    fi
    
    echo -e "${GREEN}Registry cleanup completed${NC}"
fi

# 7. Clean up local Docker images
echo -e "${YELLOW}Cleaning up local Docker build cache...${NC}"
docker builder prune -f

echo -e "${GREEN}Deployment complete!${NC}"
