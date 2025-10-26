# Set your Pi's IP address
$piIp = "192.168.0.40"

# Generate a unique tag using the current date and time
$tag = Get-Date -Format "yyyyMMddHHmmss"
Write-Host "Using image tag: $tag"

# Ensure ansible/tag.txt exists and write the tag value
$ansibleTagPath = Join-Path $PSScriptRoot 'ansible/tag.txt'
if (!(Test-Path (Split-Path $ansibleTagPath))) {
	New-Item -ItemType Directory -Path (Split-Path $ansibleTagPath) | Out-Null
}
Set-Content -Path $ansibleTagPath -Value $tag


# Ensure all needed directories exist on the Pi
# Note: k8s directory contains Kubernetes YAML files; k3s is the Kubernetes distribution used on the Pi
ssh pi@${piIp} "mkdir -p /home/pi/Professional-Website/ansible /home/pi/Professional-Website/k8s/frontend /home/pi/Professional-Website/k8s/backend /home/pi/Professional-Website/k8s/database"

# Copy k8s deployment files to the Pi
scp k8s/frontend/deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/frontend/deployment.yaml
scp k8s/backend/deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/backend/deployment.yaml
scp k8s/backend/secret.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/backend/secret.yaml
scp k8s/database/postgres-deployment.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/database/postgres-deployment.yaml
scp k8s/ingress.yaml pi@${piIp}:/home/pi/Professional-Website/k8s/ingress.yaml



# 1. Build and push multi-arch frontend Docker image (amd64 and arm64) - no cache to ensure fresh build
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:$tag --push .

# 2. Build and push multi-arch backend Docker image (amd64 and arm64) - no cache to ensure fresh build
docker buildx build --no-cache --platform linux/arm64 -f Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:$tag --push .

scp $ansibleTagPath pi@${piIp}:/home/pi/Professional-Website/ansible/tag.txt

# 5. Run the Ansible playbook to update YAMLs and apply deployments
$ansiblePath = "/mnt/g/Home Lab/Professional-Website/ansible"
wsl bash -c "cd '$ansiblePath' && ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml"

# 6. Clean up old Docker images (keep last 5 tags)
Write-Host "Cleaning up old Docker images..."
try {
    # Get list of frontend tags and delete old ones (keep latest 5)
    $frontendTags = curl -s "http://192.168.0.40:5000/v2/edwards-frontend/tags/list" | ConvertFrom-Json | Select-Object -ExpandProperty tags | Sort-Object -Descending | Select-Object -Skip 5
    foreach ($oldTag in $frontendTags) {
        curl -X DELETE "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$oldTag" 2>$null
    }
    
    # Get list of backend tags and delete old ones (keep latest 5)
    $backendTags = curl -s "http://192.168.0.40:5000/v2/edwards-backend/tags/list" | ConvertFrom-Json | Select-Object -ExpandProperty tags | Sort-Object -Descending | Select-Object -Skip 5
    foreach ($oldTag in $backendTags) {
        curl -X DELETE "http://192.168.0.40:5000/v2/edwards-backend/manifests/$oldTag" 2>$null
    }
    
    Write-Host "Registry cleanup completed"
} catch {
    Write-Host "Registry cleanup failed (this is normal if few images exist): $_"
}

# 7. Clean up local Docker images
Write-Host "Cleaning up local Docker build cache..."
docker builder prune -f

Write-Host "Deployment complete!"
