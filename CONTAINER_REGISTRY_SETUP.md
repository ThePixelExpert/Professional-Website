# Container Registry Setup for Edwards Engineering

## Problem
Currently, every website update requires manually distributing Docker images to all 4 Raspberry Pi nodes. This is time-consuming and not scalable.

## Solution: Local Container Registry

### Step 1: Set up Local Registry on Master Node
```bash
# On master node (192.168.0.40)
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Verify registry is running
curl http://localhost:5000/v2/_catalog
```

### Step 2: Configure All Nodes to Trust Local Registry
```bash
# On ALL nodes (master + workers), add insecure registry
sudo nano /etc/rancher/k3s/registries.yaml

# Add this content:
mirrors:
  "192.168.0.40:5000":
    endpoint:
      - "http://192.168.0.40:5000"
configs:
  "192.168.0.40:5000":
    tls:
      insecure_skip_verify: true

# Restart K3s on all nodes
sudo systemctl restart k3s
sudo systemctl restart k3s-agent  # On worker nodes
```

### Step 3: Update Build and Deploy Process
```bash
# New deployment workflow (run on master only)
cd ~/Professional-website

# Build images
docker build -t 192.168.0.40:5000/edwards-engineering-frontend:latest -f Dockerfile.frontend .
docker build -t 192.168.0.40:5000/edwards-engineering-backend:latest -f Dockerfile.backend .

# Push to local registry
docker push 192.168.0.40:5000/edwards-engineering-frontend:latest
docker push 192.168.0.40:5000/edwards-engineering-backend:latest

# Deploy - Kubernetes will automatically pull from registry
sudo k3s kubectl rollout restart deployment frontend-deployment
sudo k3s kubectl rollout restart deployment backend-deployment
```

### Step 4: Update Deployment Files
Update `k8s/frontend/deployment.yaml`:
```yaml
containers:
- name: frontend
  image: 192.168.0.40:5000/edwards-engineering-frontend:latest
  imagePullPolicy: Always  # Always check for updates
```

Update `k8s/backend/deployment.yaml`:
```yaml
containers:
- name: backend
  image: 192.168.0.40:5000/edwards-engineering-backend:latest
  imagePullPolicy: Always  # Always check for updates
```

## Benefits
- ✅ **One Command Deployments**: Just build, push, and restart
- ✅ **Automatic Distribution**: All nodes pull from central registry
- ✅ **Version Control**: Tag images with version numbers
- ✅ **Rollback Capability**: Easy to revert to previous versions
- ✅ **CI/CD Ready**: Can be automated with GitHub Actions

## Future Deployments
After setup, each update is just:
```bash
# 1. Build and push (30 seconds)
docker build -t 192.168.0.40:5000/edwards-engineering-frontend:$(date +%Y%m%d) -f Dockerfile.frontend .
docker push 192.168.0.40:5000/edwards-engineering-frontend:$(date +%Y%m%d)

# 2. Update deployment (10 seconds)
sudo k3s kubectl set image deployment/frontend-deployment frontend=192.168.0.40:5000/edwards-engineering-frontend:$(date +%Y%m%d)

# 3. Done! Kubernetes handles the rest
```

## Alternative: GitHub Container Registry
For even better CI/CD integration:
```bash
# Push to GitHub Container Registry
docker tag edwards-engineering-frontend:latest ghcr.io/thepixelexpert/edwards-engineering-frontend:latest
docker push ghcr.io/thepixelexpert/edwards-engineering-frontend:latest

# Use in deployment
image: ghcr.io/thepixelexpert/edwards-engineering-frontend:latest
```

This eliminates manual image distribution entirely!