#!/bin/bash

# Set your Pi's IP address
PI_IP="192.168.0.40"

# Generate a unique tag using the current date and time
TAG=$(date +%Y%m%d%H%M%S)
echo "Using image tag: $TAG"

# Ensure ansible/tag.txt exists and write the tag value
ANSIBLE_TAG_PATH="$(dirname "$0")/ansible/tag.txt"
mkdir -p "$(dirname "$ANSIBLE_TAG_PATH")"
echo "$TAG" > "$ANSIBLE_TAG_PATH"

# Ensure all needed directories exist on the Pi
ssh pi@${PI_IP} "mkdir -p /home/pi/Professional-Website/ansible /home/pi/Professional-Website/k8s/frontend /home/pi/Professional-Website/k8s/backend /home/pi/Professional-Website/k8s/database /home/pi/Professional-Website/k3s/frontend /home/pi/Professional-Website/k3s/backend"

# Copy k8s deployment files to the Pi
scp k8s/frontend/deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/frontend/deployment.yaml
scp k8s/backend/deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/backend/deployment.yaml
scp k8s/backend/secret.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/backend/secret.yaml
scp k8s/database/postgres-deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/database/postgres-deployment.yaml
scp k8s/ingress.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/ingress.yaml

# 1. Build and push multi-arch frontend Docker image (amd64 and arm64) - no cache to ensure fresh build
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:$TAG --push .

# 2. Build and push multi-arch backend Docker image (amd64 and arm64) - no cache to ensure fresh build
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:$TAG --push .

scp "$ANSIBLE_TAG_PATH" pi@${PI_IP}:/home/pi/Professional-Website/ansible/tag.txt

# 5. Run the Ansible playbook to update YAMLs and apply deployments
ANSIBLE_PATH="/mnt/g/Home Lab/Professional-Website/ansible"
cd "$ANSIBLE_PATH" && ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml

# 6. Clean up old Docker images (keep last 5 tags)
echo "Cleaning up old Docker images..."

# Get list of frontend tags and delete old ones (keep latest 5)
FRONTEND_TAGS=$(curl -s "http://192.168.0.40:5000/v2/edwards-frontend/tags/list" | grep -oP '"tags":\[\K[^\]]*' | tr -d '"' | tr ',' '\n' | sort -r | tail -n +6)
for OLD_TAG in $FRONTEND_TAGS; do
    curl -X DELETE "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$OLD_TAG" 2>/dev/null || true
done

# Get list of backend tags and delete old ones (keep latest 5)
BACKEND_TAGS=$(curl -s "http://192.168.0.40:5000/v2/edwards-backend/tags/list" | grep -oP '"tags":\[\K[^\]]*' | tr -d '"' | tr ',' '\n' | sort -r | tail -n +6)
for OLD_TAG in $BACKEND_TAGS; do
    curl -X DELETE "http://192.168.0.40:5000/v2/edwards-backend/manifests/$OLD_TAG" 2>/dev/null || true
done

echo "Registry cleanup completed"

# 7. Clean up local Docker build cache
echo "Cleaning up local Docker build cache..."
docker builder prune -f

echo "Deployment complete!"
