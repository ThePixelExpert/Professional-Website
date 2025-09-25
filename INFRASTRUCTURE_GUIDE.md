# Edwards Engineering Infrastructure Documentation

## Current Status ✅

**Infrastructure:** K3s cluster (4 Raspberry Pi nodes) with automated deployment pipeline

**Website:** [https://edwardstech.dev](https://edwardstech.dev) - Fully automated CI/CD

**Last Updated:** September 21, 2025

---

## Quick Operations Reference

### Daily Commands
```bash
# Deploy website updates
ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml

# Check cluster health  
ansible-playbook -i inventory/hosts.yml playbooks/health-check.yml

# Test connectivity
ansible all -m ping -i inventory/hosts.yml
```

### Emergency Commands
```bash
# Check website status
curl -I https://edwardstech.dev

# Get pod status
ssh pi@192.168.0.40 "sudo k3s kubectl get pods -o wide"

# Restart deployments manually
ssh pi@192.168.0.40 "sudo k3s kubectl rollout restart deployment/frontend-deployment"
```

---

## Infrastructure Architecture

### Network Layout
- **Master Node:** 192.168.0.40 (raspberrypi)
- **Worker Nodes:** 192.168.0.41-43 (node1, node2, node3)
- **Container Registry:** localhost:5000 (on master)
- **Load Balancer:** MetalLB across all nodes

### Key Services
- **K3s Kubernetes:** Container orchestration
- **Docker Registry:** Local image distribution  
- **Ansible:** Deployment automation
- **Let's Encrypt:** SSL certificate management
- **MetalLB:** Load balancing

### File Structure
```
Professional-Website/
├── src/                          # React frontend source
├── backend-options/              # Backend services
├── k8s/                          # Kubernetes manifests
├── ansible/                      # Automation scripts
│   ├── inventory/hosts.yml       # Cluster nodes
│   └── playbooks/
│       ├── deploy-website.yml    # Main deployment
│       └── health-check.yml      # Cluster monitoring
├── Dockerfile.frontend           # Frontend container
├── Dockerfile.backend            # Backend container
└── nginx.conf                    # Load balancer config
```

---

## Deployment Process

### Automated Pipeline (Current)
1. **Build:** Docker images with correct Dockerfiles (`-f Dockerfile.frontend`)
2. **Push:** Images to local registry (localhost:5000)
3. **Deploy:** Rolling updates via Kubernetes
4. **Verify:** Health checks and status reporting

**Time:** ~6 minutes (reduced from 30-minute manual process)

### Deployment Command
```bash
# From master node (192.168.0.40)
cd ~/ansible
ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml
```

---

## Troubleshooting Guide

### Common Issues

**Issue:** Ansible permission denied
```bash
# Solution: Don't use sudo with ansible-playbook
bash quick-deploy.sh  # NOT: sudo bash quick-deploy.sh
```

**Issue:** Docker build fails - "no such file or directory"
```bash
# Solution: Ensure Dockerfile specifications are correct
docker build -f Dockerfile.frontend -t image:tag .
```

**Issue:** Website not accessible
```bash
# Check ingress and certificates
ssh pi@192.168.0.40 "sudo k3s kubectl get ingress,certificates"
```

### Health Check Commands
```bash
# Cluster status
ansible all -m ping -i inventory/hosts.yml

# Node status  
ssh pi@192.168.0.40 "sudo k3s kubectl get nodes -o wide"

# Pod distribution
ssh pi@192.168.0.40 "sudo k3s kubectl get pods -o wide"

# Service status
ssh pi@192.168.0.40 "sudo k3s kubectl get services"
```

---

## Monitoring & Maintenance

### Regular Maintenance
- **Weekly:** Run health checks via Ansible
- **Monthly:** Update Docker images and restart deployments  
- **Quarterly:** Review SSL certificate status

### Key Metrics to Monitor
- Website response time and availability
- Pod resource usage across nodes
- SSL certificate expiry
- Container registry storage

### Access URLs
- **Website:** https://edwardstech.dev
- **Registry:** http://192.168.0.40:5000/v2/_catalog
- **K3s Dashboard:** Available via kubectl proxy

---

## Development Workflow

### Making Website Changes
1. **Edit code** in `src/` or `backend-options/`
2. **Deploy:** `ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml`
3. **Verify:** Check https://edwardsengineering.org

### Infrastructure Changes
1. **Update manifests** in `k8s/` directory
2. **Test locally** before deployment
3. **Deploy via Ansible** for consistency

---

## Security Notes

### Access Control
- **SSH Access:** SSH key-based authentication to all nodes
- **HTTPS:** Let's Encrypt certificates auto-renewed
- **Internal Registry:** HTTP only (internal network)

### Backup Strategy
- **Code:** Git repository (GitHub)
- **Cluster Config:** Stored in K3s etcd
- **Manual Backup:** Export important manifests regularly

---

## Future Enhancements

### Planned Improvements
- [ ] Migrate to SSH key authentication
- [ ] Add Prometheus/Grafana monitoring dashboard
- [ ] Implement dedicated Pi-hole DNS server
- [ ] Set up automated backups

### Performance Optimizations
- [ ] Container image optimization
- [ ] Resource limits and requests tuning  
- [ ] Load balancing optimization

---

## Emergency Contacts

**Infrastructure Owner:** Edwards Engineering Team  
**Documentation:** This file (updated September 21, 2025)  
**Support:** Refer to troubleshooting section above

---

*This documentation consolidates all infrastructure knowledge for the Edwards Engineering website deployment on K3s cluster with Ansible automation.*