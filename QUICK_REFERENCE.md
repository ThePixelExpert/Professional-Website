# Quick Operations Reference

## Essential Commands

### Deployment
```bash
# Full website deployment (from master node)
ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml

# Quick health check
ansible-playbook -i inventory/hosts.yml playbooks/health-check.yml

# Test cluster connectivity
ansible all -m ping -i inventory/hosts.yml
```

### Emergency Access
```bash
# SSH to master
ssh pi@192.168.0.40

# SSH to workers
ssh pi@192.168.0.41  # node1
ssh pi@192.168.0.42  # node2
ssh pi@192.168.0.43  # node3
```

### Status Checks
```bash
# Website status
curl -I https://edwardsengineering.org

# Cluster nodes
sudo k3s kubectl get nodes -o wide

# All pods
sudo k3s kubectl get pods -o wide

# Services and ingress
sudo k3s kubectl get services,ingress

# Container registry
curl http://192.168.0.40:5000/v2/_catalog
```

### Manual Deployment (Emergency)
```bash
# Build images manually
cd /home/pi/Professional-website
docker build -f Dockerfile.frontend -t localhost:5000/edwards-frontend:latest .
docker build -f Dockerfile.backend -t localhost:5000/edwards-backend:latest .

# Push to registry
docker push localhost:5000/edwards-frontend:latest
docker push localhost:5000/edwards-backend:latest

# Restart deployments
sudo k3s kubectl rollout restart deployment/frontend-deployment
sudo k3s kubectl rollout restart deployment/backend-deployment
```

## Troubleshooting

### Common Fixes
```bash
# Fix Ansible permission issues
bash quick-deploy.sh  # NOT sudo

# Reset stuck deployment
sudo k3s kubectl rollout restart deployment/frontend-deployment

# Check certificate issues
sudo k3s kubectl get certificates
sudo k3s kubectl describe certificate tls-secret

# View pod logs
sudo k3s kubectl logs -f deployment/frontend-deployment
```

### Access Information
- **Authentication:** SSH key-based
- **Registry:** http://192.168.0.40:5000
- **Website:** https://edwardsengineering.org
- **Ansible Directory:** ~/ansible (on master node)

## File Locations
```bash
# Ansible automation
~/ansible/playbooks/deploy-website.yml
~/ansible/inventory/hosts.yml

# Website source
~/Professional-website/

# K8s manifests  
~/Professional-website/k8s/

# Dockerfiles
~/Professional-website/Dockerfile.frontend
~/Professional-website/Dockerfile.backend
```