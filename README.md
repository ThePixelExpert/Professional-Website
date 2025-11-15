# Edwards Engineering Professional Website

> **Live Site:** [https://edwardstech.dev](https://edwardstech.dev)

Professional portfolio website featuring React frontend and Node.js backend, deployed on a self-hosted Kubernetes cluster with full CI/CD automation.

## 🚀 Quick Start

### Local Development

**First Time Setup:**
```bash
# 1. Setup development secrets with Bitwarden (one-time setup)
./scripts/setup-dev-env.sh      # Linux/Mac
.\scripts\setup-dev-env.ps1     # Windows

# See docs/SECRET_MANAGEMENT.md for detailed setup instructions
```

**Start Development Servers:**
```bash
# Frontend (Terminal 1)
npm install
npm start                    # Starts React dev server on http://localhost:3000

# Backend (Terminal 2)  
cd contact-backend
npm install
npm start                    # Starts Node.js API server on http://localhost:3001
```

### Production Deployment
```bash
.\scripts\build-and-deploy.ps1       # Windows: Automated build, containerize, and deploy
./scripts/build-and-deploy.sh        # Linux/Mac: Automated build, containerize, and deploy
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js Backend │
│   (Port 3000)    │    │   (Port 3001)   │
│   Nginx + Docker │    │   Express + Docker│
└─────────────────┘    └─────────────────┘
         │                       │
         └───────── Traefik Ingress ──────┘
                         │
            ┌─────────────────────────────┐
            │      K3s Kubernetes Cluster  │
            │  ┌─────┐ ┌─────┐ ┌─────┐     │
            │  │ Pi1 │ │ Pi2 │ │ Pi3 │ ... │  
            │  └─────┘ └─────┘ └─────┘     │
            └─────────────────────────────┘
                         │
                  [edwardstech.dev]
                     (Cloudflare)
```

## 📂 Project Structure

```
Professional-Website/
├── 🌐 src/                    # React frontend source code
│   ├── components/            # React components
│   ├── data/                 # Project data
│   └── assets/               # Images and static assets
├── 🔧 contact-backend/        # Node.js backend (development + production)
│   ├── server.js             # Express API server
│   ├── package.json          # Backend dependencies
│   └── .env.template         # Environment variables template
├── 🔐 scripts/                # Development automation scripts
│   ├── setup-dev-env.sh      # Bitwarden secret retrieval (Linux/Mac)
│   ├── setup-dev-env.ps1     # Bitwarden secret retrieval (Windows)
│   ├── validate-env.sh       # Environment validation script
│   ├── build-and-deploy.sh   # Production deployment (Linux/Mac)
│   ├── build-and-deploy.ps1  # Production deployment (Windows)
│   └── sync-secrets.ps1      # Kubernetes secrets management
├── 📚 docs/                   # Documentation
│   └── SECRET_MANAGEMENT.md  # Secret management guide
├── ☸️ k8s/                   # Kubernetes manifests
│   ├── frontend/             # Frontend deployment config
│   ├── backend/              # Backend deployment config
│   └── ingress.yaml          # Traefik routing rules
├── 🤖 ansible/               # Deployment automation
│   ├── inventory/            # Host configuration
│   └── playbooks/            # Deployment scripts
├── 🐳 Dockerfile.frontend     # Frontend container build
├── 🐳 Dockerfile.backend      # Backend container build
├── ⚙️ nginx.conf             # Frontend nginx configuration
```

## 🔄 Development Workflow

### 1. Local Development
1. **Frontend**: `npm start` (root directory) → http://localhost:3000
2. **Backend**: `npm start` (contact-backend directory) → http://localhost:3001  
3. **Proxy**: Frontend automatically proxies `/api/*` requests to backend

### 2. Production Deployment
1. **Build & Deploy**: `.\scripts\build-and-deploy.ps1` (Windows) or `./scripts/build-and-deploy.sh` (Linux/Mac)
   - Builds Docker images for frontend and backend
   - Pushes to local registry (`192.168.0.40:5000`)
   - Updates Kubernetes deployments via Ansible
   - Applies rolling updates with zero downtime

### 3. Infrastructure Management
- **Cluster Status**: `kubectl get pods -n website`
- **Logs**: `kubectl logs -n website <pod-name>`
- **Secrets**: `.\scripts\sync-secrets.ps1` (sync environment variables to K8s)

## 🌟 Features

### Frontend
- ⚡ React 19 with modern hooks
- 🎨 Responsive design with CSS modules
- 🔄 Client-side routing (`#/admin`, `#/all-projects`)
- 📱 Progressive Web App capabilities
- 🎯 Performance optimized with code splitting

### Backend  
- 🚀 Express.js REST API
- 📧 Email notifications via Nodemailer
- 🔐 JWT-based admin authentication
- 🛡️ Rate limiting and CORS protection
- 💾 In-memory order management

### Infrastructure
- ☸️ **Kubernetes**: K3s cluster on Raspberry Pi hardware
- 🐳 **Containers**: Multi-arch Docker images (ARM64)
- 🔄 **CI/CD**: Ansible-based automated deployment
- 🌐 **Ingress**: Traefik with automatic TLS
- 📊 **Registry**: Self-hosted Docker registry
- ☁️ **DNS**: Cloudflare proxy with SSL termination

## 🔧 Configuration

### Secret Management

This project uses **Bitwarden CLI** for secure secret management. Secrets are stored in your encrypted Bitwarden vault and retrieved automatically during setup.

**Quick Setup:**
```bash
./scripts/setup-dev-env.sh      # Linux/Mac
.\scripts\setup-dev-env.ps1     # Windows
```

📖 **Full Documentation:** [docs/SECRET_MANAGEMENT.md](docs/SECRET_MANAGEMENT.md)

### Environment Variables (.env)

The setup scripts automatically generate `contact-backend/.env` with:

```bash
# Backend Configuration (contact-backend/.env)
PORT=3001
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-app-password
FRONTEND_URL=https://edwardstech.dev
ADMIN_USER=admin
ADMIN_PASS=secure-password
JWT_SECRET=your-jwt-secret
```

### Network Configuration
- **Frontend LoadBalancer**: `192.168.0.241:80`
- **Backend LoadBalancer**: `192.168.0.242:3001`  
- **Traefik Ingress**: `192.168.0.240:80/443`
- **Docker Registry**: `192.168.0.40:5000`

## 🚨 Troubleshooting

### Common Issues
1. **API 404 Errors**: Check ingress routing and backend pod status
2. **Build Failures**: Ensure Docker registry is running (`192.168.0.40:5000`)
3. **Local Dev Issues**: Verify proxy configuration in `package.json`
4. **SSL Issues**: Check Cloudflare SSL mode (use "Flexible" for HTTP backend)

### Useful Commands
```bash
# Check cluster status
kubectl get pods,svc,ingress -n website

# View logs
kubectl logs -n website deployment/backend-deployment
kubectl logs -n website deployment/frontend-deployment

# Force pod restart  
kubectl rollout restart deployment/backend-deployment -n website

# Test backend directly
curl -X POST http://192.168.0.242:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

## 🤝 Contributing

1. **Development**: Make changes and test locally
2. **Testing**: Verify both frontend and backend functionality
3. **Deployment**: Use `.\scripts\build-and-deploy.ps1` or `./scripts/build-and-deploy.sh` for production updates
4. **Monitoring**: Check logs and cluster status post-deployment

---

## 🏷️ Built With
- **Frontend**: React 19, React Router, CSS Modules
- **Backend**: Node.js, Express, JWT, Nodemailer  
- **Infrastructure**: Kubernetes (K3s), Docker, Ansible, Traefik
- **Platform**: Raspberry Pi cluster, Cloudflare DNS
- **CI/CD**: PowerShell automation, Ansible playbooks
