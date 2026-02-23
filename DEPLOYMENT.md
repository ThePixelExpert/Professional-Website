# Complete Homelab Deployment Guide

**From Zero to Production: Set up the entire infrastructure from scratch**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 0: Network Planning](#phase-0-network-planning)
4. [Phase 1: Proxmox Setup](#phase-1-proxmox-setup)
5. [Phase 2: Raspberry Pi Cluster Setup](#phase-2-raspberry-pi-cluster-setup)
6. [Phase 3: K3s High-Availability Cluster](#phase-3-k3s-high-availability-cluster)
7. [Phase 4: Harbor Registry](#phase-4-harbor-registry)
8. [Phase 5: Supabase Database VM](#phase-5-supabase-database-vm)
9. [Phase 6: Backend API VM](#phase-6-backend-api-vm)
10. [Phase 7: Local Machine Tools](#phase-7-local-machine-tools)
11. [Phase 8: GitHub Actions Runner](#phase-8-github-actions-runner)
12. [Phase 9: Flux GitOps](#phase-9-flux-gitops)
13. [Phase 10: Deploy & Validate](#phase-10-deploy--validate)
14. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Final Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOMELAB LAN                             │
│                      (192.168.68.0/24)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PROXMOX SERVER (192.168.68.10)                                │
│  ├─ Supabase VM (192.168.68.61)                                │
│  │  └─ Docker Compose: PostgreSQL, Auth, Storage, Realtime     │
│  │                                                              │
│  ├─ Backend API VM (192.168.68.66)                             │
│  │  └─ Docker: Express.js backend                              │
│  │                                                              │
│  └─ K3s Control Plane VM (192.168.68.81) ← HA Control Plane #1 │
│     └─ K3s Server (control-plane role)                         │
│                                                                 │
│  RASPBERRY PI CLUSTER                                           │
│  ├─ Pi Master (192.168.68.40) ← HA Control Plane #2           │
│  │  └─ K3s Server (control-plane role)                         │
│  │                                                              │
│  ├─ Pi Worker 1 (192.168.68.41)                                │
│  │  └─ K3s Agent (worker node)                                 │
│  │                                                              │
│  ├─ Pi Worker 2 (192.168.68.42)                                │
│  │  └─ K3s Agent (worker node)                                 │
│  │                                                              │
│  └─ Pi Worker 3 (192.168.68.43)                                │
│     └─ K3s Agent (worker node)                                 │
│                                                                 │
│  SERVICES IN K3S                                                │
│  ├─ Harbor Registry (192.168.68.67:5000)                       │
│  │  └─ Private container registry                              │
│  │                                                              │
│  ├─ Frontend (website namespace)                               │
│  │  └─ React app (2 replicas across workers)                   │
│  │                                                              │
│  ├─ Traefik Ingress (built-in)                                 │
│  │  └─ Routes: edwardstech.dev → Frontend                      │
│  │            api.edwardstech.dev → Backend VM                 │
│  │                                                              │
│  └─ Flux CD (flux-system namespace)                            │
│     └─ GitOps automation                                       │
│                                                                 │
│  YOUR ARCH MACHINE (192.168.68.100)                            │
│  └─ kubectl, flux CLI, development tools                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

- **2 Control Planes (HA)**: If one control plane fails, k3s keeps running
- **Stateful on VMs**: Database and backend on Proxmox VMs (no SD card wear)
- **Stateless on Pis**: Frontend containers can restart freely
- **GitOps**: Flux automates deployments from git pushes
- **Local Registry**: Harbor stores images on LAN (no external dependencies)

---

## Prerequisites

### Hardware

- ✅ **Proxmox server** installed and accessible
- ✅ **4x Raspberry Pi 4** (4GB+ RAM recommended) with power supplies
- ✅ **MicroSD cards** for Pis (32GB+ each, Class 10/A1)
- ✅ **Network switch** with 5+ ports
- ✅ **Ethernet cables** for all devices
- ✅ **Development machine** (your Arch Linux laptop)

### Software on Development Machine

- Git
- SSH client
- Text editor

### Accounts & Access

- GitHub account with repository: `Professional-Website`
- Domain: `edwardstech.dev` (or your domain)
- Cloudflare account (for DNS and optional CDN)
- Google Cloud Console (for OAuth setup)
- Stripe account (for payment processing)

### Knowledge Required

- Basic Linux command line
- SSH access to servers
- Basic networking (IP addresses, DNS)
- Git basics (clone, commit, push)

---

## Phase 0: Network Planning

### 0.1 IP Address Scheme

Reserve static IPs on your router/DHCP server:

| Device | IP Address | Hostname | Purpose |
|--------|------------|----------|---------|
| Proxmox Server | 192.168.68.10 | proxmox | Hypervisor |
| Supabase VM | 192.168.68.61 | supabase-vm | Database, Auth |
| Backend VM | 192.168.68.66 | backend-vm | Express API |
| K3s VM Control Plane | 192.168.68.81 | k3s-control-vm | HA Control Plane #1 |
| Pi Master (Control Plane) | 192.168.68.40 | pi-master | HA Control Plane #2 |
| Pi Worker 1 | 192.168.68.41 | pi-node-1 | K3s Worker |
| Pi Worker 2 | 192.168.68.42 | pi-node-2 | K3s Worker |
| Pi Worker 3 | 192.168.68.43 | pi-node-3 | K3s Worker |
| Your Arch Machine | 192.168.68.100 | arch-dev | Development |

**Note:** Adjust these IPs to match your network subnet. If your network is `192.168.1.x` instead of `192.168.68.x`, update all commands accordingly.

### 0.2 Port Requirements

Ensure these ports are open between devices:

| Service | Port | Source | Destination | Protocol |
|---------|------|--------|-------------|----------|
| K3s API | 6443 | All nodes | Control planes | TCP |
| K3s Agent | 10250 | Control planes | Workers | TCP |
| Harbor Registry | 5000 | All nodes | Pi Master | TCP |
| Supabase API | 8000 | Backend, Frontend | 192.168.68.61 | TCP |
| Backend API | 3001 | K3s Ingress | 192.168.68.66 | TCP |
| PostgreSQL | 5432 | Backend VM | 192.168.68.61 | TCP |
| SSH | 22 | Your machine | All nodes | TCP |

---

## Phase 1: Proxmox Setup

### 1.1 Access Proxmox Web UI

```bash
# Open browser to Proxmox
https://192.168.68.10:8006

# Login with root credentials
```

### 1.2 Upload OS Images

Download and upload these ISOs to Proxmox:

1. **Ubuntu Server 24.04 LTS ARM64** (for VMs)
   - Download: https://ubuntu.com/download/server/arm
   - Upload to Proxmox: Datacenter → Storage → local → ISO Images → Upload

### 1.3 Create VMs Manually via Proxmox UI

You'll need to create VMs through the Proxmox web interface:

**For each VM (Supabase, Backend, K3s Control):**

1. In Proxmox UI, click **"Create VM"**
2. **General Tab:**
   - VM ID: 100 (Supabase), 101 (Backend), 102 (K3s Control)
   - Name: `supabase-vm`, `backend-vm`, `k3s-control-vm`
3. **OS Tab:**
   - ISO: Ubuntu Server 24.04 LTS (upload first if needed)
4. **System Tab:**
   - Default settings (UEFI if available)
5. **Disks Tab:**
   - Boot disk: 50GB minimum (100GB+ recommended for Supabase VM)
6. **CPU Tab:**
   - Cores: 2-4
7. **Memory Tab:**
   - RAM: 4096 MB (4GB minimum, 8GB for Supabase recommended)
8. **Network Tab:**
   - Bridge: vmbr0
   - Static IP will be set after installation

9. **Start VM** and complete Ubuntu installation:
   - Set hostname: `supabase-vm`, `backend-vm`, or `k3s-control-vm`
   - Create user: `ubuntu` with secure password
   - Enable OpenSSH server
   - Set static IP during installation or via netplan later

### 1.4 Post-VM Setup - Run vm-setup.sh

The repository includes an automated setup script for Supabase VM. For other VMs, follow manual steps.

**For All VMs - Manual Setup:**

Since Supabase VM doesn't have a second disk, we'll use manual setup for all VMs:

```bash
# SSH to Supabase VM
ssh ubuntu@192.168.68.61

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# Set hostname
sudo hostnamectl set-hostname supabase-vm
echo "127.0.1.1 supabase-vm" | sudo tee -a /etc/hosts

# Create data directory on root disk
sudo mkdir -p /opt/supabase

# Reboot
sudo reboot
```

**Repeat for Backend VM (192.168.68.66) and K3s Control VM (192.168.68.81):**

```bash
# SSH to VM
ssh ubuntu@192.168.68.66  # or .81 for k3s-control

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# Set hostname
sudo hostnamectl set-hostname backend-vm  # or k3s-control-vm
echo "127.0.1.1 backend-vm" | sudo tee -a /etc/hosts

# Reboot
sudo reboot
```

---

## Phase 2: Raspberry Pi Cluster Setup

### 2.1 Flash Raspberry Pi OS

**On each Pi's microSD card:**

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert microSD card into your computer
3. Flash **Raspberry Pi OS Lite (64-bit)** to each card
4. **Important**: In imager, click settings (gear icon):
   - Set hostname: `pi-master`, `pi-node-1`, `pi-node-2`, `pi-node-3`
   - Enable SSH (password authentication)
   - Set username: `pi`, password: `<your-secure-password>`
   - Configure WiFi (optional, but Ethernet recommended)
   - Set locale/timezone

5. Eject card, insert into Pi, boot

### 2.2 Set Static IPs

**Option A: Router DHCP Reservation (Recommended)**

Log into your router and reserve IPs based on MAC addresses:
- Pi Master: 192.168.68.40
- Pi Node 1: 192.168.68.41
- Pi Node 2: 192.168.68.42
- Pi Node 3: 192.168.68.43

**Option B: Static IPs on Each Pi**

SSH to each Pi and edit `/etc/dhcpcd.conf`:

```bash
# Example for Pi Master (192.168.68.40)
ssh pi@192.168.68.40

sudo nano /etc/dhcpcd.conf

# Add at the end:
interface eth0
static ip_address=192.168.68.40/24
static routers=192.168.68.1
static domain_name_servers=8.8.8.8 8.8.4.4

# Save and reboot
sudo reboot
```

Repeat with appropriate IPs for each Pi.

### 2.3 Update All Pis

```bash
# SSH to each Pi and run:
ssh pi@192.168.68.40
sudo apt update && sudo apt full-upgrade -y && sudo apt install -y iptables
sudo reboot

# Repeat for .41, .42, .43
```

### 2.4 Set Up SSH Keys from Your Machine

From your Arch machine, set up passwordless SSH:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "logan@arch-homelab"

# Copy to all nodes
for IP in 192.168.68.40 192.168.68.41 192.168.68.42 192.168.68.43 \
           192.168.68.61 192.168.68.66 192.168.68.81; do
    ssh-copy-id pi@$IP  # or ubuntu@$IP for VMs
done
```

Test passwordless access:

```bash
ssh pi@192.168.68.40 "hostname"
# Should print: pi-master
```

---

## Phase 3: K3s High-Availability Cluster

### 3.1 Architecture Decision

We'll create an HA cluster with:
- **2 Control Planes**: Pi Master (192.168.68.40) + K3s VM (192.168.68.81)
- **3 Workers**: Pi Node 1-3 (192.168.68.41-43)

### 3.2 Install K3s on First Control Plane (Pi Master)

```bash
# SSH to Pi Master
ssh pi@192.168.68.40

# Install k3s server with cluster init
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --tls-san=192.168.68.40 \
  --tls-san=192.168.68.81 \
  --disable=traefik

# Wait for k3s to start
sudo systemctl status k3s

# Get the join token (save this!)
sudo cat /var/lib/rancher/k3s/server/node-token
# Example output: K10007b5fe9cc996b4908958834a2de08d3c2b700feeae4c408da0e86b7c8376cfd::server:7a0c1833f18eda8c4bc1a6eba71acb38

# Verify cluster is ready
sudo kubectl get nodes
```

**Note:** Save the token from `/var/lib/rancher/k3s/server/node-token` - you'll need it for joining other nodes.

### 3.3 Install K3s on Second Control Plane (K3s VM)

```bash
# SSH to K3s Control VM
ssh ubuntu@192.168.68.81

# Join as server (control plane) to existing cluster
curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.68.40:6443 \
  --token K10007b5fe9cc996b4908958834a2de08d3c2b700feeae4c408da0e86b7c8376cfd::server:7a0c1833f18eda8c4bc1a6eba71acb38 \
  --tls-san=192.168.68.40 \
  --tls-san=192.168.68.81

# Wait for k3s to start
sudo systemctl status k3s

# Verify both control planes are ready
sudo kubectl get nodes
```

**Expected output:**
```
NAME             STATUS   ROLES                       AGE   VERSION
pi-master        Ready    control-plane,etcd,master   5m    v1.34.3+k3s1
k3s-control-vm   Ready    control-plane,etcd,master   1m    v1.34.3+k3s1
```

### 3.4 Join Worker Nodes

```bash
# SSH to each worker Pi and install k3s agent
# Note: Use the token from step 3.2

# Pi Node 1
ssh pi@192.168.68.41
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.68.40:6443 \
  K3S_TOKEN='K10007b5fe9cc996b4908958834a2de08d3c2b700feeae4c408da0e86b7c8376cfd::server:7a0c1833f18eda8c4bc1a6eba71acb38' \
  sh -

# Pi Node 2
ssh pi@192.168.68.42
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.68.40:6443 \
  K3S_TOKEN='K10007b5fe9cc996b4908958834a2de08d3c2b700feeae4c408da0e86b7c8376cfd::server:7a0c1833f18eda8c4bc1a6eba71acb38' \
  sh -

# Pi Node 3
ssh pi@192.168.68.43
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.68.40:6443 \
  K3S_TOKEN='K10007b5fe9cc996b4908958834a2de08d3c2b700feeae4c408da0e86b7c8376cfd::server:7a0c1833f18eda8c4bc1a6eba71acb38' \
  sh -
```

### 3.5 Verify Cluster

```bash
# From any control plane node
ssh pi@192.168.68.40
sudo kubectl get nodes -o wide
```

**Expected output:**
```
NAME             STATUS   ROLES                       AGE   VERSION        INTERNAL-IP
pi-master        Ready    control-plane,etcd,master   10m   v1.34.3+k3s1   192.168.68.40
k3s-control-vm   Ready    control-plane,etcd,master   5m    v1.34.3+k3s1   192.168.68.81
pi-node-1        Ready    <none>                      2m    v1.34.3+k3s1   192.168.68.41
pi-node-2        Ready    <none>                      2m    v1.34.3+k3s1   192.168.68.42
pi-node-3        Ready    <none>                      2m    v1.34.3+k3s1   192.168.68.43
```

**Success! You now have a 5-node HA k3s cluster** (2 control planes + 3 workers).

### 3.6 Install Traefik Ingress

```bash
# From Pi Master
ssh pi@192.168.68.40

# Install Traefik via Helm
sudo kubectl create namespace traefik
sudo kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

# Create Traefik deployment
cat <<EOF | sudo kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: traefik
  namespace: traefik
spec:
  type: LoadBalancer
  ports:
    - name: web
      port: 80
      targetPort: 8000
    - name: websecure
      port: 443
      targetPort: 8443
  selector:
    app: traefik
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: traefik
spec:
  replicas: 2
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik
      containers:
        - name: traefik
          image: traefik:v2.10
          args:
            - --providers.kubernetescrd
            - --entrypoints.web.address=:8000
            - --entrypoints.websecure.address=:8443
          ports:
            - name: web
              containerPort: 8000
            - name: websecure
              containerPort: 8443
EOF
```

---

## Phase 4: Harbor Registry

### 4.1 Option A: Simple Docker Registry (Easiest)

```bash
# SSH to Pi Master
ssh pi@192.168.68.40

# Create registry directory
sudo mkdir -p /opt/harbor

# Run Docker registry
sudo docker run -d \
  --name registry \
  --restart=always \
  -p 5000:5000 \
  -v /opt/harbor:/var/lib/registry \
  registry:2

# Test registry
curl http://192.168.68.67:5000/v2/_catalog
# Should return: {"repositories":[]}
```

### 4.2 Option B: Full Harbor Installation (Better UI, Scanning)

```bash
# SSH to Pi Master
ssh pi@192.168.68.40

# Download Harbor
HARBOR_VERSION=v2.10.0
wget https://github.com/goharbor/harbor/releases/download/${HARBOR_VERSION}/harbor-offline-installer-${HARBOR_VERSION}.tgz

tar xzvf harbor-offline-installer-*.tgz
cd harbor

# Configure Harbor
cp harbor.yml.tmpl harbor.yml
nano harbor.yml

# Edit these lines:
# hostname: 192.168.68.40
# http.port: 5000
# harbor_admin_password: <your-secure-password>
# data_volume: /opt/harbor

# Install Harbor
sudo ./install.sh

# Harbor will be available at: http://192.168.68.67:5000
# Login: admin / <your-password>
```

### 4.3 Configure Insecure Registry on All Nodes

Since Harbor uses HTTP (not HTTPS) on LAN, configure all k3s nodes:

```bash
# Run this on ALL k3s nodes (control planes + workers)
for NODE in 192.168.68.40 192.168.68.41 192.168.68.42 192.168.68.43 192.168.68.81; do
  ssh pi@$NODE "sudo mkdir -p /etc/rancher/k3s && echo '
mirrors:
  \"192.168.68.67:5000\":
    endpoint:
      - \"http://192.168.68.67:5000\"
' | sudo tee /etc/rancher/k3s/registries.yaml && sudo systemctl restart k3s || sudo systemctl restart k3s-agent"
done
```

---

## Phase 5: Supabase Database VM

### 5.1 Deploy Supabase Docker Compose

```bash
# SSH to Supabase VM
ssh ubuntu@192.168.68.61

# Clone Supabase
cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy environment template from our repo
# (assumes you've cloned Professional-Website repo)
sudo cp ~/Professional-Website/production/.env.template .env

# Edit .env with your values
sudo nano .env

# Key variables to update:
# POSTGRES_PASSWORD=<secure-password>
# JWT_SECRET=<generated-secret>   ← generate with: openssl rand -base64 48
# DASHBOARD_USERNAME=admin
# DASHBOARD_PASSWORD=<secure-password>

# Start Supabase
sudo docker compose up -d

# Verify services are running
sudo docker compose ps

# IMPORTANT: Generate ANON_KEY and SERVICE_ROLE_KEY from your JWT_SECRET
# The keys must be signed with the JWT_SECRET above or PostgREST will reject them
# Run this script (replace the secret with your actual JWT_SECRET from .env):
python3 /tmp/gen_keys.py  # see script below

cat > /tmp/gen_keys.py << 'EOF'
import hmac, hashlib, base64, json, time

secret = '<your-JWT_SECRET-from-.env>'

def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d, separators=(',',':')).encode()).rstrip(b'=').decode()

def make_jwt(payload):
    h = b64({'alg':'HS256','typ':'JWT'})
    p = b64(payload)
    sig = hmac.new(secret.encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest()
    return f'{h}.{p}.{base64.urlsafe_b64encode(sig).rstrip(b"=").decode()}'

iat = int(time.time())
exp = iat + 315360000
print('ANON_KEY=' + make_jwt({'role':'anon','iss':'supabase','iat':iat,'exp':exp}))
print('SERVICE_ROLE_KEY=' + make_jwt({'role':'service_role','iss':'supabase','iat':iat,'exp':exp}))
EOF

python3 /tmp/gen_keys.py

# Copy the ANON_KEY and SERVICE_ROLE_KEY output back into .env, then restart:
sudo nano .env
sudo docker compose down && sudo docker compose up -d
```

**Supabase services should be accessible:**
- API: http://192.168.68.61:8000
- Studio Dashboard: http://192.168.68.61:3000
- PostgreSQL: 192.168.68.61:5432

### 5.2 Apply Database Schema

```bash
# From your Arch machine
cd ~/Projects/Professional-Website

# Copy migration files to Supabase VM
scp -r supabase/migrations ubuntu@192.168.68.61:/tmp/

# SSH to Supabase VM
ssh ubuntu@192.168.68.61

# Apply all migrations in order
cd /opt/supabase/docker
for f in $(ls /tmp/migrations/*.sql | sort); do
  echo "Applying $f..."
  sudo docker compose exec -T db psql -U postgres -d postgres < $f
done
```

### 5.3 Configure OAuth (Google)

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Create project: "Professional Website"
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Name: "Supabase Auth"
   - Authorized redirect URIs:
     ```
     http://192.168.68.61:8000/auth/v1/callback
     https://edwardstech.dev/auth/v1/callback
     ```
5. Copy **Client ID** and **Client Secret**
6. Add to Supabase dashboard: http://192.168.68.61:3000
   - Navigate to: Authentication → Providers → Google
   - Enable Google
   - Paste Client ID and Secret
   - Save

---

## Phase 6: Backend API VM

### 6.1 Deploy Backend Container

```bash
# SSH to Backend VM
ssh ubuntu@192.168.68.66

# Clone repository
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/Professional-Website.git
cd Professional-Website/contact-backend

# Create .env file (must be in contact-backend/)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=http://192.168.68.61:8000
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Email (Gmail - use an App Password, not your account password)
# Generate at: myaccount.google.com → Security → 2-Step Verification → App passwords
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=<16-char-app-password>

# Stripe
STRIPE_SECRET_KEY=sk_live_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>
EOF

# Build Docker image (must run from repo root, not contact-backend/)
cd /opt/Professional-Website
sudo docker build -f Dockerfile.backend -t backend:latest .

# Run backend container (use absolute path for --env-file)
sudo docker run -d \
  --name backend \
  --restart=unless-stopped \
  -p 3001:3001 \
  --env-file /opt/Professional-Website/contact-backend/.env \
  backend:latest

# Verify backend is running
curl http://192.168.68.66:3001/api/health
# Should return: {"status":"ok"}
```

### 6.2 Set Up Auto-Deploy Script

This allows Flux to deploy new backend versions:

```bash
# Still on Backend VM
cd /opt/Professional-Website

# Use the k8s backend deployment files
# (Backend deployment is handled via k8s, not directly on VM)

# Create deploy script
cat > /opt/Professional-Website/deploy.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/Professional-Website
git pull origin master
docker build -f Dockerfile.backend -t backend:latest .
docker stop backend || true
docker rm backend || true
docker run -d \
  --name backend \
  --restart=unless-stopped \
  -p 3001:3001 \
  --env-file /opt/Professional-Website/contact-backend/.env \
  backend:latest
EOF

chmod +x /opt/Professional-Website/deploy.sh

# Test deploy script
/opt/Professional-Website/deploy.sh
```

---

## Phase 7: Local Machine Tools (DevPod)

Instead of installing tools manually, use the DevPod — a devcontainer with
kubectl, flux, kubeseal, and helm pre-installed that you SSH into.

### 7.1 Get Your kubeconfig

SSH into the Pi Master and copy the kubeconfig:

```bash
ssh pi@192.168.68.40
sudo cat /etc/rancher/k3s/k3s.yaml
```

Paste the output into `devpod/kubeconfig.yaml` on your local machine, then fix
the server IP (k3s defaults to 127.0.0.1 which won't work from outside):

```bash
sed -i 's/127.0.0.1/192.168.68.40/g' ~/Projects/Professional-Website/devpod/kubeconfig.yaml
```

**Note:** `devpod/kubeconfig.yaml` is gitignored — never commit it.

### 7.2 Start the DevPod

Point DevPod at the `devpod/` folder as the workspace:

```bash
devpod up ~/Projects/Professional-Website/devpod --ide none
```

DevPod will:
1. Build the container using the official devcontainer base image
2. Install kubectl and helm via devcontainer features
3. Run `install-tools.sh` to add flux and kubeseal

### 7.3 SSH Into the DevPod

```bash
ssh devpod.devpod
```

### 7.4 Verify Tools

```bash
kubectl get nodes
flux --version
kubeseal --version
helm version
```

**Expected:** All tools respond and `kubectl get nodes` lists your 5 cluster nodes.

### Troubleshooting

**`kubectl` not found after SSH:**
DevPod may have used a cached image from before tools were installed. Delete and recreate:
```bash
devpod delete devpod
devpod up ~/Projects/Professional-Website/devpod --ide none
```

**`connection refused` on `kubectl get nodes`:**
The kubeconfig still has `127.0.0.1`. Fix it:
```bash
sed -i 's/127.0.0.1/192.168.68.40/g' ~/Projects/Professional-Website/devpod/kubeconfig.yaml
```
Then reconnect — no need to recreate the devpod.

---

## Phase 8: GitHub Actions Runner

### 8.1 Choose Runner Host

**Option A: Pi Master**
- Can build ARM64 images natively

**Option B: x86_64 VM (used in this guide)**
- Separate build environment
- Must download x64 runner binary (not ARM64)

### 8.2 Install GitHub Actions Runner

```bash
# SSH to your runner host (VM example)
ssh logan@<VM_IP>

# Create runner directory
mkdir -p ~/actions-runner && cd ~/actions-runner

# Check your architecture first
uname -m  # x86_64 = use x64 binary, aarch64 = use arm64 binary

# Download latest x64 runner (for x86_64 VM)
RUNNER_VERSION=2.314.1
curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

tar xzf ./actions-runner-linux-x64.tar.gz
rm actions-runner-linux-x64.tar.gz

# If running on ARM64 (Pi), use this instead:
# curl -o actions-runner-linux-arm64.tar.gz -L \
#   https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz
# tar xzf ./actions-runner-linux-arm64.tar.gz
# rm actions-runner-linux-arm64.tar.gz
```

### 8.3 Register Runner

1. Go to GitHub: https://github.com/ThePixelExpert/Professional-Website/settings/actions/runners/new
2. Copy the registration token (starts with `A...`)

```bash
# Run config — when prompted for runner group, press Enter to accept Default
./config.sh \
  --url https://github.com/ThePixelExpert/Professional-Website \
  --token <YOUR_REGISTRATION_TOKEN> \
  --name k3s-runner \
  --labels self-hosted,X64,Linux \
  --work _work

# Runner group: press Enter (uses Default group)

# Install as systemd service
sudo ./svc.sh install
sudo ./svc.sh start

# Verify runner is online
sudo ./svc.sh status
```

Verify in GitHub: Settings → Actions → Runners (should show "pi-runner" as online)

### 8.4 Create .env.production on Runner

> **Note:** The `_work` directory is created automatically when the runner executes its first job.
> Complete Phase 9 (Flux/GitOps setup) and trigger a workflow run first, then come back and run this.

```bash
# On runner host — run this after the first workflow job has executed
mkdir -p ~/_work/Professional-Website/Professional-Website
cd ~/_work/Professional-Website/Professional-Website

# Create production environment file for frontend builds
cat > .env.production << 'EOF'
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_<your-key>
REACT_APP_API_URL=https://api.edwardstech.dev
REACT_APP_SUPABASE_URL=http://192.168.68.61:8000
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
EOF

chmod 600 .env.production
```

---

## Phase 9: Flux GitOps

### 9.1 Merge Feature Branch to Master

```bash
# On your Arch machine
cd ~/Projects/Professional-Website

git status
git checkout master
git merge feature/supabase-migration-gitops
git push origin master
```

### 9.2 Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Name: "Flux GitOps"
3. Expiration: No expiration (or 1 year)
4. Scopes: Check **repo** (all sub-scopes)
5. Generate token
6. Copy token (starts with `ghp_`)

### 9.3 Bootstrap Flux

```bash
# Export GitHub credentials
export GITHUB_USER=YOUR_USERNAME
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

# Run bootstrap script
cd ~/Projects/Professional-Website
./scripts/flux-bootstrap.sh
```

**What happens:**
- Flux controllers installed in `flux-system` namespace
- Sealed Secrets controller installed
- Git repository linked to Flux
- Flux watches `flux/clusters/production/` directory

**Verify Flux is running:**
```bash
kubectl get pods -n flux-system
flux check
```

### 9.4 Seal Secrets

```bash
# Run seal secrets script
cd ~/Projects/Professional-Website
./scripts/seal-secrets.sh
```

**Prompts:**
- Harbor Registry URL: `192.168.68.67:5000`
- Harbor Username: `admin` (or your username)
- Harbor Password: `<your-password>`
- VM SSH Host: `ubuntu@192.168.68.66`
- VM SSH Key Path: `~/.ssh/id_ed25519`

**This creates encrypted secrets for:**
- Harbor registry credentials (for pulling images)
- VM SSH key (for deploying backend)

### 9.5 Commit Sealed Secrets

```bash
# Add sealed secrets to git
git add flux/clusters/production/sealed-secrets/
git commit -m "chore: add sealed secrets for production"
git push origin master
```

### 9.6 Wait for Flux Reconciliation

```bash
# Watch Flux sync from git
watch -n 5 'flux get kustomizations'
```

**Expected progression (within 5-10 minutes):**
1. `sealed-secrets` → Ready ✓
2. `frontend` → Ready ✓
3. `backend-deploy` → Ready ✓
4. `image-automation` → Ready ✓
5. `ingress` → Ready ✓

Press `Ctrl+C` when all show Ready.

---

## Phase 10: Deploy & Validate

### 10.1 Verify Frontend Deployment

```bash
# Check frontend pods
kubectl get pods -n website

# Expected: 2 frontend pods running
# NAME                        READY   STATUS    RESTARTS   AGE
# frontend-xxxxxxxxx-xxxxx    1/1     Running   0          2m
# frontend-xxxxxxxxx-xxxxx    1/1     Running   0          2m

# Check ingress
kubectl get ingress -n website

# Check service
kubectl get svc -n website
```

### 10.2 Verify Backend Deployment

```bash
# SSH to Backend VM
ssh ubuntu@192.168.68.66

# Check backend container
docker ps | grep backend

# Test health endpoint
curl http://192.168.68.66:3001/api/health
# Should return: {"status":"ok"}
```

### 10.3 Verify Supabase

```bash
# Test Supabase API
curl http://192.168.68.61:8000/rest/v1/

# Should return: {"message":"Welcome to PostgREST"}

# Test PostgreSQL connection
ssh ubuntu@192.168.68.61
cd /opt/supabase/docker
docker compose exec postgres psql -U postgres -c '\l'
# Should list databases
```

### 10.4 Test End-to-End Flow

#### 10.4.1 DNS Setup

**Option A: Local /etc/hosts (Testing)**

```bash
# On your Arch machine
echo "192.168.68.40 edwardstech.dev api.edwardstech.dev" | sudo tee -a /etc/hosts
```

**Option B: Cloudflare DNS (Production)**

1. Log into Cloudflare
2. Select domain: `edwardstech.dev`
3. Add A records:
   ```
   edwardstech.dev        → 192.168.68.40 (Proxy off)
   api.edwardstech.dev    → 192.168.68.66 (Proxy off)
   supabase.edwardstech.dev → 192.168.68.61 (Proxy off)
   ```

#### 10.4.2 Frontend Test

```bash
# Test frontend
curl -I http://edwardstech.dev

# Should return 200 OK

# Open in browser
firefox http://edwardstech.dev
```

**Verify:**
- ✅ Homepage loads
- ✅ Products page works
- ✅ Contact form visible

#### 10.4.3 Backend API Test

```bash
# Test backend health
curl http://api.edwardstech.dev/api/health

# Test products endpoint
curl http://api.edwardstech.dev/api/products
```

#### 10.4.4 Admin Login Test

1. Visit: http://edwardstech.dev/#/admin/login
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Should redirect to admin dashboard

**Verify:**
- ✅ OAuth redirect works
- ✅ Admin dashboard loads
- ✅ Can view products

#### 10.4.5 Create Test Product

1. In admin dashboard, click "Add Product"
2. Fill in product details
3. Save
4. Visit homepage: product should appear

#### 10.4.6 Test Order Flow

1. Add product to cart
2. Proceed to checkout
3. Enter test payment details (Stripe test mode):
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
   ```
4. Complete order
5. Check admin dashboard: order should appear

### 10.5 Test GitOps Automation

```bash
# Make a small change
cd ~/Projects/Professional-Website
echo "// GitOps test - $(date)" >> contact-frontend/src/App.jsx

# Commit and push
git add .
git commit -m "test: verify GitOps automation"
git push origin master
```

**Watch automation:**

1. **GitHub Actions** (https://github.com/YOUR_USERNAME/Professional-Website/actions)
   - Workflow run appears
   - Runner builds images
   - Images pushed to Harbor

2. **Flux detects new image** (~1-2 minutes)
   ```bash
   watch -n 5 'flux get image policy'
   ```
   New tag appears

3. **Flux updates git** (automatic commit to deployment.yaml)

4. **Flux reconciles** (pods restart with new image)
   ```bash
   kubectl rollout status deployment/frontend -n website
   ```

5. **Verify change** (refresh browser, see test comment timestamp)

---

## Troubleshooting

### K3s Cluster Issues

**Nodes not joining:**
```bash
# Check k3s service on worker
ssh pi@192.168.68.41
sudo systemctl status k3s-agent
sudo journalctl -u k3s-agent -n 50

# Common issues:
# - Wrong token: Double-check token from master
# - Firewall: Ensure port 6443 open
# - Duplicate hostname: Set unique hostnames
```

**Duplicate hostname error:**
```bash
# Set unique hostnames
ssh pi@192.168.68.41
sudo hostnamectl set-hostname pi-node-1
echo "127.0.1.1 pi-node-1" | sudo tee -a /etc/hosts
sudo systemctl restart k3s-agent
```

### Harbor Registry Issues

**Cannot pull images:**
```bash
# Verify insecure registry config on all nodes
cat /etc/rancher/k3s/registries.yaml

# Should contain:
# mirrors:
#   "192.168.68.67:5000":
#     endpoint:
#       - "http://192.168.68.67:5000"

# Restart k3s
sudo systemctl restart k3s  # or k3s-agent
```

**Test registry access:**
```bash
# From any k3s node
docker pull busybox
docker tag busybox 192.168.68.67:5000/test/busybox
docker push 192.168.68.67:5000/test/busybox
```

### Flux Issues

**Flux not syncing:**
```bash
# Check Flux controllers
kubectl get pods -n flux-system

# Check logs
flux logs --all-namespaces

# Force reconciliation
flux reconcile kustomization flux-system --with-source
```

**Sealed secrets not decrypting:**
```bash
# Check sealed-secrets controller
kubectl get pods -n kube-system | grep sealed-secrets

# Verify secret was created
kubectl get secret harbor-creds -n flux-system

# Re-seal if needed
kubectl delete secret harbor-creds -n flux-system
./scripts/seal-secrets.sh
git add flux/clusters/production/sealed-secrets/
git commit -m "fix: re-seal secrets"
git push origin master
```

### Frontend Not Loading

**Check pods:**
```bash
kubectl get pods -n website
kubectl describe pod -n website -l app=frontend
kubectl logs -n website -l app=frontend
```

**Check ingress:**
```bash
kubectl get ingress -n website
kubectl describe ingress -n website

# Verify Traefik is running
kubectl get pods -n traefik
```

**Common issues:**
- Image pull errors: Check Harbor credentials
- Crashloop: Check frontend logs for React errors
- Ingress not routing: Verify Traefik installation

### Backend API Issues

**Backend not responding:**
```bash
ssh ubuntu@192.168.68.66

# Check container status
docker ps | grep backend
docker logs backend

# Check environment variables
docker inspect backend | grep -A 20 Env

# Restart backend
docker restart backend
```

**Cannot connect to Supabase:**
```bash
# Test connection from backend VM
ssh ubuntu@192.168.68.66
curl http://192.168.68.61:8000/rest/v1/

# Verify Supabase is running
ssh ubuntu@192.168.68.61
cd /opt/supabase/docker
docker compose ps
```

**`PGRST301` - JWT decode error:**

This means the `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` were not generated
from the same `JWT_SECRET` Supabase is running with. Regenerate them on the Supabase VM:

```bash
ssh ubuntu@192.168.68.61
grep JWT_SECRET /opt/supabase/docker/.env  # copy this value

cat > /tmp/gen_keys.py << 'EOF'
import hmac, hashlib, base64, json, time

secret = '<your-JWT_SECRET>'

def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d, separators=(',',':')).encode()).rstrip(b'=').decode()

def make_jwt(payload):
    h = b64({'alg':'HS256','typ':'JWT'})
    p = b64(payload)
    sig = hmac.new(secret.encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest()
    return f'{h}.{p}.{base64.urlsafe_b64encode(sig).rstrip(b"=").decode()}'

iat = int(time.time())
exp = iat + 315360000
print('ANON_KEY=' + make_jwt({'role':'anon','iss':'supabase','iat':iat,'exp':exp}))
print('SERVICE_ROLE_KEY=' + make_jwt({'role':'service_role','iss':'supabase','iat':iat,'exp':exp}))
EOF

python3 /tmp/gen_keys.py
# Copy output into /opt/supabase/docker/.env and backend .env, then restart both
sudo docker compose down && sudo docker compose up -d
```

**`Email configuration error: Missing credentials for "PLAIN"`:**

The server uses `EMAIL_USER` and `EMAIL_APP_PASSWORD` — not `SMTP_USER`/`SMTP_PASS`.
Also requires a Gmail App Password, not your account password.

```bash
# Generate App Password:
# myaccount.google.com → Security → 2-Step Verification → App passwords

# Ensure .env has:
# EMAIL_USER=your-email@gmail.com
# EMAIL_APP_PASSWORD=<16-char-app-password>   ← no spaces
```

### Supabase Issues

**Services not starting:**
```bash
ssh ubuntu@192.168.68.61
cd /opt/supabase/docker

# Check all services
docker compose ps

# Check logs
docker compose logs -f postgres
docker compose logs -f kong
docker compose logs -f auth

# Restart services
docker compose down
docker compose up -d
```

**Migrations not applying:**
```bash
# Verify PostgreSQL is accessible
docker compose exec postgres psql -U postgres -c '\l'

# Re-apply migrations
docker compose exec postgres psql -U postgres -d postgres -f /tmp/migrations/00001_initial_schema.sql
```

### GitHub Actions Runner Issues

**Runner offline:**
```bash
ssh pi@192.168.68.40
cd ~

# Check service status
sudo ./svc.sh status

# Restart runner
sudo ./svc.sh stop
sudo ./svc.sh start

# Check logs
journalctl -u actions.runner.* -f
```

**Builds failing:**
```bash
# Check runner logs in GitHub Actions UI
# Common issues:
# - Out of disk space: Clean up old images
# - Harbor unreachable: Verify network
# - .env.production missing: Create file
```

---

## Success Checklist

### Infrastructure
- [ ] Proxmox accessible and running VMs
- [ ] 3 VMs created: Supabase, Backend, K3s Control
- [ ] 4 Raspberry Pis configured with static IPs
- [ ] K3s cluster: 2 control planes + 3 workers (5 nodes total)
- [ ] All nodes showing `Ready` status

### Services
- [ ] Harbor registry running at 192.168.68.67:5000
- [ ] Supabase accessible at 192.168.68.61:8000
- [ ] Backend API responding at 192.168.68.66:3001
- [ ] Frontend pods running in k3s (2 replicas)
- [ ] Traefik ingress routing traffic

### GitOps
- [ ] Flux controllers running
- [ ] Sealed secrets decrypted
- [ ] GitHub Actions runner online
- [ ] Git push triggers automated build
- [ ] Flux detects new images and deploys

### End-to-End
- [ ] Frontend accessible at edwardstech.dev
- [ ] Admin login with Google OAuth works
- [ ] Can create products in admin dashboard
- [ ] Products appear on frontend
- [ ] Checkout flow works with Stripe
- [ ] Orders saved to Supabase database

---

## Next Steps

### Production Hardening

1. **SSL/TLS Certificates**
   - Install cert-manager: `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml`
   - Configure Let's Encrypt issuer
   - Update ingress to use HTTPS

2. **Monitoring**
   - Install Prometheus + Grafana
   - Set up alerts for pod crashes, disk space
   - Monitor k3s cluster health

3. **Backups**
   - Automate Supabase database backups
   - Back up k3s etcd snapshots
   - Store backups on TrueNAS or external storage

4. **Security**
   - Enable Supabase RLS (Row Level Security)
   - Review and tighten network policies
   - Rotate secrets regularly
   - Enable fail2ban on public-facing services

5. **Performance**
   - Add CDN (Cloudflare proxy)
   - Enable Redis caching for backend
   - Optimize database queries
   - Scale frontend replicas based on load

### Feature Development (v1.1)

- **Supabase Realtime**: Live order status updates
- **Supabase Storage**: File uploads for products
- **Customer Dashboard**: Order history, tracking
- **Email Notifications**: Order confirmations
- **Advanced Admin**: Analytics, reports

---

## Architecture Diagram

```
                           INTERNET
                               ↓
                        Cloudflare DNS
                               ↓
                    ┌──────────┴───────────┐
                    ↓                      ↓
            edwardstech.dev        api.edwardstech.dev
                    ↓                      ↓
              [Traefik Ingress]       [Traefik Ingress]
              on K3s (Pi Cluster)     Routes to Backend VM
                    ↓                      ↓
         ┌──────────┴─────────┐           ↓
         ↓                    ↓           ↓
    [Frontend Pod 1]    [Frontend Pod 2]  ↓
    on Pi Node 1        on Pi Node 2      ↓
         └──────────┬─────────┘           ↓
                    ↓                     ↓
              [API Calls]                 ↓
                    └─────────────────────┘
                                  ↓
                        [Backend API Container]
                        on Backend VM (192.168.68.66)
                                  ↓
                      [Supabase Client Library]
                                  ↓
                        [Supabase PostgreSQL]
                        on Supabase VM (192.168.68.61)
                        + Auth + Storage + Realtime

         [GitOps Automation]
              GitHub
                ↓
         [Push to master]
                ↓
         [GitHub Actions Runner]
         on Pi Master
                ↓
         [Build Images]
                ↓
         [Push to Harbor]
         at 192.168.68.67:5000
                ↓
         [Flux CD detects new image]
                ↓
         [Flux updates git]
                ↓
         [Flux reconciles]
                ↓
         [Pods restart with new image]
```

---

## Maintenance

### Daily
- Monitor GitHub Actions for failed builds
- Check Flux reconciliation status: `flux get kustomizations`

### Weekly
- Review k3s cluster health: `kubectl top nodes`
- Check disk space on all nodes: `df -h`
- Verify backups are running

### Monthly
- Update k3s: `curl -sfL https://get.k3s.io | sh -`
- Update Flux: `flux install --components-extra=image-reflector-controller,image-automation-controller`
- Review and rotate secrets
- Test disaster recovery

---

**Congratulations!** You've built a production-ready homelab infrastructure with high availability, GitOps automation, and best practices. 🎉
