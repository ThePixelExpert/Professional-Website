# Rancher Setup Guide for Edwards Engineering K3s Cluster

## Overview
Rancher provides a web-based GUI for managing your Kubernetes cluster, making it much easier to monitor, deploy, and manage your Edwards Engineering website and future applications.

## Why Rancher on Your K3s Cluster?

### ✅ **Perfect Compatibility**
- K3s and Rancher are both SUSE products
- K3s is officially supported by Rancher
- No compatibility issues or complex configuration

### ✅ **What You Get**
- **Web GUI**: Manage your cluster through a browser
- **Visual Pod Management**: See pod distribution across nodes
- **Resource Monitoring**: CPU, memory, storage usage
- **Easy Deployments**: Deploy apps through UI instead of kubectl
- **User Management**: Multiple users with different permissions
- **Application Catalog**: One-click app installations
- **Backup Management**: Automated cluster backups
- **Multi-Cluster**: Manage multiple clusters from one interface

### ✅ **Perfect for Your Setup**
- Monitor your Edwards Engineering website visually
- See load balancing across your 4 Raspberry Pi nodes
- Easy SSL certificate management
- Simple scaling of your frontend/backend pods
- Future app deployments without YAML files

## Installation Methods

### Method 1: Helm Installation (Recommended)
**Time**: 15-20 minutes  
**Difficulty**: Easy (copy/paste commands)

### Method 2: Docker Installation
**Time**: 10 minutes  
**Difficulty**: Very Easy (single command)

### Method 3: Kubernetes Manifest
**Time**: 25 minutes  
**Difficulty**: Intermediate

## Method 1: Helm Installation (Recommended)

### Step 1: Install Helm on Master Node
```bash
# SSH to master node
ssh pi@192.168.0.40

# Install Helm
curl https://get.helm.sh/helm-v3.12.0-linux-arm64.tar.gz -o helm.tar.gz
tar -zxvf helm.tar.gz
sudo mv linux-arm64/helm /usr/local/bin/helm
rm -rf helm.tar.gz linux-arm64/

# Verify Helm installation
helm version
```

### Step 2: Add Rancher Helm Repository
```bash
# Add the Rancher repository
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest

# Update repositories
helm repo update

# Verify repository
helm search repo rancher
```

### Step 3: Create Rancher Namespace
```bash
# Create cattle-system namespace for Rancher
sudo k3s kubectl create namespace cattle-system
```

### Step 4: Install cert-manager (if not already installed)
```bash
# Check if cert-manager is already installed
sudo k3s kubectl get pods -n cert-manager

# If not installed, install it:
sudo k3s kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Wait for cert-manager to be ready
sudo k3s kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
sudo k3s kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
sudo k3s kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
```

### Step 5: Install Rancher
```bash
# Install Rancher with Let's Encrypt SSL
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.edwardsengineering.org \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=your-email@example.com \
  --set letsEncrypt.environment=production

# Alternative: Install with self-signed certificates (easier)
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.edwardsengineering.org \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=rancher \
  --set replicas=1
```

### Step 6: Wait for Rancher Deployment
```bash
# Watch Rancher pods come online
sudo k3s kubectl -n cattle-system rollout status deploy/rancher

# Check all pods are running
sudo k3s kubectl get pods -n cattle-system

# Expected output:
# NAME                       READY   STATUS    RESTARTS   AGE
# rancher-5d84d4c5f7-abc123  1/1     Running   0          2m
# rancher-webhook-xyz789     1/1     Running   0          2m
```

### Step 7: Access Rancher Web Interface
```bash
# Get Rancher URL
echo "Rancher URL: https://rancher.edwardsengineering.org"

# Get initial admin password (if you didn't set one)
sudo k3s kubectl get secret --namespace cattle-system bootstrap-secret -o go-template='{{.data.bootstrappassword|base64decode}}{{"\n"}}'
```

## Method 2: Docker Installation (Simplest)

### Single Command Installation
```bash
# SSH to master node
ssh pi@192.168.0.40

# Run Rancher in Docker (simplest method)
sudo docker run -d --restart=unless-stopped \
  -p 8080:80 -p 8443:443 \
  --privileged \
  --name rancher \
  rancher/rancher:latest \
  --no-cacerts

# Access at: https://192.168.0.40:8443
# Initial setup will ask you to set admin password
```

## Post-Installation Configuration

### Step 8: Initial Rancher Setup
1. **Access Rancher**: Navigate to `https://rancher.edwardsengineering.org` or `https://192.168.0.40:8443`
2. **Login**: Use `admin` / `admin` or the password you set
3. **Change Password**: Set a secure password
4. **Server URL**: Confirm the server URL
5. **Terms**: Accept the terms and conditions

### Step 9: Import Your K3s Cluster
```bash
# Your cluster should auto-import, but if not:
# 1. In Rancher UI, go to "Cluster Management"
# 2. Click "Import Existing"
# 3. Select "Generic"
# 4. Run the provided kubectl command on your master node
```

### Step 10: Configure Your Edwards Engineering Project
1. **Create Project**: Name it "Edwards Engineering"
2. **Create Namespace**: If you want to separate from default
3. **Import Workloads**: Your existing deployments will appear
4. **Set up Monitoring**: Enable cluster monitoring

## What You'll See in Rancher

### 🎯 **Dashboard Overview**
- Cluster health status
- Node status (all 4 Raspberry Pis)
- CPU/Memory usage across cluster
- Pod distribution visualization

### 🎯 **Workload Management**
- Visual representation of your frontend/backend deployments
- Easy scaling sliders (increase/decrease replicas)
- Pod logs accessible through web interface
- Rolling update management

### 🎯 **Network & Storage**
- Service mesh visualization
- Ingress management (your SSL certificates)
- Load balancer configuration
- Storage class management

### 🎯 **Monitoring & Alerting**
- Grafana dashboards (built-in)
- Prometheus metrics
- Alert rules for high CPU, memory, disk usage
- Historical performance data

## Benefits for Your Edwards Engineering Setup

### ✅ **Immediate Benefits**
- **Visual Monitoring**: See your website's health at a glance
- **Easy Scaling**: Drag sliders to scale frontend/backend
- **Log Aggregation**: All pod logs in one place
- **SSL Management**: Visual certificate status
- **Resource Usage**: Know when to add more Pis

### ✅ **Future Benefits**
- **Easy App Deployment**: Deploy new services through UI
- **Team Collaboration**: Multiple users can manage cluster
- **Backup Management**: Automated cluster backups
- **Multi-Environment**: Easy dev/staging/prod separation

## DNS Configuration

### Option 1: Add DNS Record
```bash
# Add to your DNS provider:
# rancher.edwardsengineering.org A 192.168.0.40
```

### Option 2: Use IP Address
```bash
# Access directly via IP:
# https://192.168.0.40:8443 (Docker method)
# https://192.168.0.40 (Helm method with ingress)
```

### Option 3: Local hosts file
```bash
# Add to your computer's hosts file:
# 192.168.0.40 rancher.edwardsengineering.org
```

## Troubleshooting

### Common Issues and Solutions
```bash
# 1. Rancher pods stuck in pending
sudo k3s kubectl describe pod -n cattle-system

# 2. Certificate issues
sudo k3s kubectl get certificates -n cattle-system
sudo k3s kubectl describe certificate -n cattle-system

# 3. Check Rancher logs
sudo k3s kubectl logs -n cattle-system deployment/rancher

# 4. Restart Rancher
sudo k3s kubectl rollout restart deployment/rancher -n cattle-system
```

## Resource Requirements

### ✅ **Your Cluster Can Handle It**
- **RAM**: Rancher needs ~1GB RAM (you have 4GB+ per Pi)
- **CPU**: Minimal CPU usage when idle
- **Storage**: ~2GB for Rancher components
- **Network**: No additional network requirements

### ✅ **Performance Impact**
- **Minimal**: Rancher is lightweight
- **Your apps**: Edwards Engineering website unaffected
- **Monitoring**: Actually helps optimize performance

## Upgrade and Maintenance

### Easy Updates
```bash
# Update Rancher via Helm
helm repo update
helm upgrade rancher rancher-latest/rancher -n cattle-system

# Update via Docker
sudo docker stop rancher
sudo docker rm rancher
# Run new version with same command
```

## Cost and Licensing

### ✅ **Completely Free**
- Rancher is 100% open source
- No licensing costs
- No user limits
- All features included

## Integration with Your Current Setup

### ✅ **No Disruption**
- Your Edwards Engineering website keeps running
- All existing deployments remain unchanged
- Kubectl commands still work normally
- Ansible automation remains functional

### ✅ **Enhanced Management**
- Visual confirmation of your load balancing
- Easy monitoring of your mobile-optimized deployments
- Simple SSL certificate management
- Future deployments much easier

## Summary: Should You Install Rancher?

### ✅ **Pros**
- **Easy Installation**: 15-20 minutes
- **Zero Disruption**: Your website keeps running
- **Better Monitoring**: Visual cluster management
- **Future-Proof**: Makes adding new apps much easier
- **Professional**: Industry-standard cluster management
- **Free**: No cost, full features

### ❌ **Cons**
- **Additional Complexity**: One more component to manage
- **Resource Usage**: Uses some RAM/CPU (minimal)
- **Learning Curve**: New interface to learn (but intuitive)

## Recommendation

**YES, install Rancher!** 

For your Edwards Engineering cluster, Rancher would provide:
1. **Immediate value**: Better visibility into your current deployment
2. **Future value**: Much easier management as you add more applications
3. **Professional appearance**: Impressive dashboard for your portfolio
4. **Learning opportunity**: Industry-standard tool experience

**Suggested approach:**
1. **Try Method 2 first** (Docker installation) - 5 minutes, easily removable
2. **If you like it**, upgrade to **Method 1** (Helm installation) for production use
3. **Access via IP initially**, add DNS later

The installation is completely reversible, so there's no risk in trying it out!

---

**Installation Time**: 15-20 minutes  
**Risk Level**: Very Low (easily removable)  
**Benefit Level**: High (much better cluster management)  
**Recommendation**: Definitely worth installing