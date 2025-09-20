# Edwards Engineering Kubernetes Deployment Guide

## Overview
This document outlines the complete setup and deployment of the Edwards Engineering website on a 4-node Raspberry Pi K3s Kubernetes cluster with load balancing and SSL termination.

## Architecture
- **Master Node**: 192.168.0.40 (raspberrypi)
- **Worker Nodes**: 
  - 192.168.0.41 (node1)
  - 192.168.0.42 (node2) 
  - 192.168.0.43 (node3)
- **Frontend**: React application (6 replicas)
- **Backend**: Node.js/Express API (4 replicas)
- **Load Balancer**: Traefik (built into K3s)
- **SSL**: cert-manager with Let's Encrypt

## Deployment Summary

### Phase 1: Infrastructure Setup
✅ **K3s Cluster Installation**
- Installed K3s v1.33.4+k3s1 on master node (192.168.0.40)
- Joined 3 worker nodes to the cluster
- Verified cluster connectivity and node status

✅ **SSL Certificate Management**
- Installed cert-manager for automatic SSL certificate provisioning
- Configured Let's Encrypt ClusterIssuer for edwardsengineering.org

### Phase 2: Application Development
✅ **Mobile Responsive Design Fixes**
- Updated `App.css` with comprehensive mobile breakpoints (@media queries for 768px and 480px)
- Implemented 2-column skills grid for mobile devices
- Enhanced container width calculations (calc(100% - 1rem)) for better mobile space utilization
- Fixed banner navigation and project card layouts for mobile

✅ **Docker Containerization**
- Created multi-stage Dockerfile.frontend for React application
- Created Dockerfile.backend for Node.js/Express API
- Optimized images for ARM64 architecture (Raspberry Pi)

### Phase 3: Kubernetes Configuration
✅ **Deployment Manifests**
- Frontend deployment with 6 replicas and anti-affinity rules
- Backend deployment with 4 replicas and anti-affinity rules
- ClusterIP services for internal communication
- Traefik ingress with SSL termination

✅ **Load Balancing Strategy**
- Pod anti-affinity rules to distribute pods across nodes
- Horizontal scaling: 6 frontend pods, 4 backend pods
- Cross-node scheduling for high availability

### Phase 4: Image Distribution
✅ **Docker Image Management**
- Built images on master node using Docker
- Imported Docker images into K3s containerd runtime
- Exported images using K3s ctr for distribution
- Distributed images to all worker nodes via scp and K3s ctr import
- Updated imagePullPolicy to IfNotPresent for reliable pod scheduling

## Technical Implementation Details

### Cluster Setup Commands
```bash
# Master Node Installation
curl -sfL https://get.k3s.io | sh -

# Worker Node Join Commands
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.0.40:6443 K3S_TOKEN=${NODE_TOKEN} sh -

# Verify Cluster
sudo k3s kubectl get nodes
```

### Image Distribution Process
```bash
# Import Docker images to K3s containerd
docker save edwards-engineering-frontend:latest -o frontend-docker.tar
docker save edwards-engineering-backend:latest -o backend-docker.tar
sudo k3s ctr images import frontend-docker.tar
sudo k3s ctr images import backend-docker.tar

# Export for distribution
sudo k3s ctr images export frontend-image.tar docker.io/library/edwards-engineering-frontend:latest
sudo k3s ctr images export backend-image.tar docker.io/library/edwards-engineering-backend:latest

# Distribute to worker nodes
for node in 192.168.0.41 192.168.0.42 192.168.0.43; do
    scp frontend-image.tar pi@${node}:~/
    scp backend-image.tar pi@${node}:~/
    ssh pi@${node} "sudo k3s ctr images import ~/frontend-image.tar"
    ssh pi@${node} "sudo k3s ctr images import ~/backend-image.tar"
    ssh pi@${node} "rm -f ~/frontend-image.tar ~/backend-image.tar"
done
```

### Deployment and Scaling
```bash
# Apply configurations
sudo k3s kubectl apply -f k8s/

# Scale applications
sudo k3s kubectl scale deployment frontend-deployment --replicas=6
sudo k3s kubectl scale deployment backend-deployment --replicas=4

# Restart deployments
sudo k3s kubectl rollout restart deployment frontend-deployment
sudo k3s kubectl rollout restart deployment backend-deployment
```

## File Structure
```
Professional-Website/
├── k8s/
│   ├── frontend/
│   │   ├── deployment.yaml          # Frontend deployment with 6 replicas
│   │   └── service.yaml             # ClusterIP service
│   ├── backend/
│   │   ├── deployment.yaml          # Backend deployment with 4 replicas
│   │   └── service.yaml             # ClusterIP service
│   ├── ingress.yaml                 # Traefik ingress with SSL
│   └── cert-manager.yaml            # Let's Encrypt configuration
├── src/
│   ├── App.css                      # Mobile-responsive styles
│   ├── components/
│   │   ├── ProjectCard.css          # Mobile project card styles
│   │   └── AllProjects.css          # Mobile navigation styles
│   └── index.css                    # Global mobile fixes
├── Dockerfile.frontend              # Multi-stage React build
├── Dockerfile.backend               # Node.js API container
└── package.json
```

## Key Configuration Changes

### Mobile CSS Improvements (App.css)
```css
/* Mobile breakpoints for responsive design */
@media (max-width: 768px) {
  .skills-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 0.75rem;
  }
  
  .container {
    width: calc(100% - 1rem);
    margin: 0 0.5rem;
  }
}

@media (max-width: 480px) {
  .banner-nav {
    flex-direction: column;
    gap: 0.5rem;
  }
}
```

### Kubernetes Deployment Configuration
```yaml
# Frontend Deployment (k8s/frontend/deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
spec:
  replicas: 6
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - frontend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: frontend
        image: edwards-engineering-frontend:latest
        imagePullPolicy: IfNotPresent
```

## Current Status
✅ **Cluster**: 4-node K3s cluster operational
✅ **Applications**: Frontend (6 pods) and Backend (4 pods) running across all nodes
✅ **Load Balancing**: Traffic distributed across multiple nodes
✅ **SSL**: cert-manager configured for automatic certificate management
✅ **Mobile**: Responsive design optimized for mobile devices

## Next Steps (Optional)
- [ ] Configure DNS A records for edwardsengineering.org → 192.168.0.40
- [ ] Set up router port forwarding (80/443 → 192.168.0.40)
- [ ] Configure monitoring with Prometheus/Grafana
- [ ] Implement automatic backups
- [ ] Set up CI/CD pipeline for automated deployments

## Troubleshooting Commands
```bash
# Check pod status and distribution
sudo k3s kubectl get pods -o wide

# View pod logs
sudo k3s kubectl logs -f deployment/frontend-deployment
sudo k3s kubectl logs -f deployment/backend-deployment

# Check services and ingress
sudo k3s kubectl get services
sudo k3s kubectl get ingress

# Verify image availability on nodes
sudo k3s ctr images list | grep edwards-engineering

# Monitor cluster resources
sudo k3s kubectl top nodes
sudo k3s kubectl top pods
```

## Security Considerations
- All container images use non-root users
- Network policies could be implemented for additional segmentation
- RBAC is enabled by default in K3s
- SSL certificates are automatically renewed by cert-manager

## Performance Metrics
- **Frontend Pods**: 6 replicas across 4 nodes
- **Backend Pods**: 4 replicas across 4 nodes
- **Load Distribution**: Anti-affinity rules ensure cross-node distribution
- **High Availability**: Multiple replicas prevent single points of failure

---

**Deployment Completed**: September 20, 2025
**Cluster Status**: Operational with load balancing
**Website**: Ready for public access at edwardsengineering.org (pending DNS configuration)