# Phase 5: Deployment Reconfiguration - Research

**Researched:** 2026-02-07
**Domain:** Container orchestration, split architecture deployment, Kubernetes/Docker hybrid infrastructure
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 involves deploying the Express backend to a Proxmox VM using Docker Compose while deploying the frontend-only container to the existing Raspberry Pi k3s cluster. This split architecture separates stateful workloads (backend with database connections) from stateless workloads (static frontend), preventing SD card wear on the Pi cluster while leveraging existing infrastructure.

The standard approach for this architecture uses multi-stage Docker builds for both frontend and backend, a self-hosted Docker registry for image distribution, and Kubernetes Service+Endpoints for routing traffic from k3s to the external VM backend. Environment variables are managed through Kubernetes ConfigMaps/Secrets for the frontend and .env files for the Docker Compose backend.

Key challenges include managing environment variables across two deployment targets, configuring Traefik to route API calls to an external VM, and ensuring the build-once-deploy-everywhere principle for the frontend container despite React's build-time variable embedding.

**Primary recommendation:** Use Docker Compose on Proxmox VM for backend deployment, Kubernetes Deployment for frontend, and Kubernetes Service with manual Endpoints (not ExternalName) to route API traffic to the backend VM's IP address. Build frontend with placeholder environment variables and inject runtime configuration via window.env.js pattern.

## Standard Stack

The established tools for split architecture deployment:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Docker | 24.x+ | Container runtime | Industry standard for containerization, required for both k3s and VM deployment |
| Kubernetes | 1.28+ | Container orchestration | k3s is production-ready lightweight K8s distribution, already deployed on Pi cluster |
| Docker Compose | 2.x | VM service orchestration | Simple multi-container management for VM-based backend, no orchestrator needed |
| Traefik | 2.x/3.x | Ingress controller | Already deployed on k3s cluster, supports path-based routing and external backends |
| Nginx | 1.25+ (alpine) | Frontend web server | Minimal image size (~20MB), efficient static file serving, industry standard for React |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Docker Registry | 2.x | Private image registry | Self-hosted at 192.168.0.40:5000, avoid Docker Hub rate limits |
| kubectl | 1.28+ | Kubernetes CLI | Deploy manifests to k3s cluster |
| docker-compose | 2.x | Compose CLI | Manage backend services on Proxmox VM |
| minikube/kind | Latest | Local testing | Test k8s manifests locally before deploying to Pi cluster |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Endpoints | ExternalName Service | ExternalName requires DNS, not IP addresses; Manual Endpoints work with direct VM IP |
| Docker Compose on VM | Kubernetes on VM | Over-engineering; single-node backend doesn't benefit from K8s orchestration overhead |
| Build-time env vars | Runtime env injection | Build-time simpler but requires rebuild per environment; Runtime enables true build-once-deploy-everywhere |

**Installation:**
```bash
# On development machine
kubectl version --client
docker --version
docker-compose --version

# On Proxmox VM (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Architecture Patterns

### Recommended Project Structure
```
Professional-Website/
├── Dockerfile.backend           # Express API container
├── Dockerfile.frontend          # Multi-stage: React build + Nginx serve
├── docker-compose.backend.yml   # Backend deployment for Proxmox VM
├── k8s/
│   ├── frontend/
│   │   ├── deployment.yaml     # Frontend pods on k3s
│   │   ├── service.yaml        # Frontend ClusterIP service
│   │   └── configmap.yaml      # Frontend runtime env vars
│   ├── backend/
│   │   ├── service.yaml        # Backend Service (no selector)
│   │   └── endpoints.yaml      # Manual Endpoints pointing to VM IP
│   └── ingress.yaml            # Traefik routing (/ → frontend, /api → backend)
├── nginx.conf                   # Nginx config for frontend container
└── scripts/
    ├── build-and-push.sh       # Build images, tag with git SHA, push to registry
    └── deploy-k8s.sh           # Apply k8s manifests to Pi cluster
```

### Pattern 1: Multi-Stage Frontend Build
**What:** Separate build stage (Node.js) from runtime stage (Nginx) to minimize image size
**When to use:** Always for production React deployments
**Example:**
```dockerfile
# Source: https://docs.docker.com/build/building/multi-stage/
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Runtime stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
**Benefits:** Reduces final image from ~1GB (with Node) to ~50MB (Nginx only), improves security by removing build tools

### Pattern 2: Backend Containerization
**What:** Containerize Express backend with production-ready configurations
**When to use:** When deploying backend to VM with Docker Compose
**Example:**
```dockerfile
# Source: https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
FROM node:18-alpine

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

WORKDIR /app

# Layer caching: dependencies first
COPY contact-backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY contact-backend/src ./src
COPY contact-backend/server.js ./
COPY contact-backend/database.js ./

# Runtime configuration via environment
ENV NODE_ENV=production
ENV PORT=3001

RUN chown -R backend:nodejs /app
USER backend

EXPOSE 3001

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
```

### Pattern 3: Service + Manual Endpoints for External Backend
**What:** Kubernetes Service without selectors, with manually created Endpoints pointing to VM IP
**When to use:** When backend runs outside Kubernetes cluster (on Proxmox VM)
**Example:**
```yaml
# Source: https://kubernetes.io/docs/concepts/services-networking/service/
# Service definition (no selector)
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: website
spec:
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
---
# Manual Endpoints pointing to VM
apiVersion: v1
kind: Endpoints
metadata:
  name: backend-service  # Must match Service name
  namespace: website
subsets:
  - addresses:
      - ip: 192.168.0.50  # Proxmox VM IP
    ports:
      - port: 3001
```
**Why not ExternalName:** ExternalName requires DNS hostname, not IP addresses. Manual Endpoints allow direct IP routing without DNS dependency.

### Pattern 4: Frontend Runtime Environment Variables
**What:** Inject environment variables at container startup, not build time
**When to use:** When frontend container must run in multiple environments without rebuild
**Example:**
```bash
# Source: https://dev.to/imzihad21/runtime-environment-variables-for-react-apps-with-nginx-and-docker-3p62
# entrypoint.sh in frontend container
#!/bin/sh
# Generate env-config.js from environment variables at runtime
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  REACT_APP_SUPABASE_URL: "${REACT_APP_SUPABASE_URL}",
  REACT_APP_SUPABASE_ANON_KEY: "${REACT_APP_SUPABASE_ANON_KEY}",
  REACT_APP_API_URL: "${REACT_APP_API_URL}"
};
EOF

# Start nginx
nginx -g 'daemon off;'
```
```html
<!-- index.html - load env-config.js before React -->
<script src="/env-config.js"></script>
<script src="/static/js/main.js"></script>
```
**Limitation:** Only works for variables accessed via `window.ENV`, not `process.env`. Requires code changes to read from `window.ENV`.

### Pattern 5: Docker Image Tagging Strategy
**What:** Tag images with multiple identifiers for traceability and rollback
**When to use:** All CI/CD builds
**Example:**
```bash
# Source: https://medium.com/@nirmalkushwah08/docker-image-tagging-strategy-4aa886fb4fcc
GIT_SHA=$(git rev-parse --short HEAD)
VERSION=$(cat VERSION)  # Semantic version from file
BUILD_DATE=$(date +%Y%m%d)

docker build -t 192.168.0.40:5000/backend:${GIT_SHA} \
             -t 192.168.0.40:5000/backend:${VERSION} \
             -t 192.168.0.40:5000/backend:latest \
             -f Dockerfile.backend .

docker push 192.168.0.40:5000/backend:${GIT_SHA}
docker push 192.168.0.40:5000/backend:${VERSION}
docker push 192.168.0.40:5000/backend:latest
```
**Benefit:** Git SHA enables exact traceability, semantic version for releases, latest for convenience

### Pattern 6: Traefik Path-Based Routing for Split Architecture
**What:** Single Ingress routing frontend and backend to different services
**When to use:** When frontend and backend are separate deployments
**Example:**
```yaml
# Source: https://doc.traefik.io/traefik/providers/kubernetes-ingress/
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: website-ingress
  namespace: website
  annotations:
    traefik.ingress.kubernetes.io/router.priority: "100"
spec:
  ingressClassName: traefik
  rules:
  - host: edwardstech.dev
    http:
      paths:
      # API routes to backend (external VM)
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service  # Points to manual Endpoints
            port:
              number: 3001
      # All other routes to frontend
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```
**Priority:** Higher priority on /api path ensures API requests match before / catch-all

### Anti-Patterns to Avoid
- **Building frontend in k8s InitContainer:** Slow pod startup, wasted cluster resources. Build should happen in CI/CD pipeline or local development machine.
- **Using :latest tag in production:** Non-deterministic deployments, impossible to rollback. Always use explicit versions or git SHA.
- **Exposing backend VM directly to internet:** Security risk. Backend should only be accessible via LAN from k3s cluster and Traefik ingress.
- **Storing secrets in ConfigMaps:** ConfigMaps are not encrypted at rest. Use Secrets for sensitive data.
- **Rebuilding frontend for environment changes:** Violates build-once principle. Use runtime environment injection if config differs between environments.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local Kubernetes testing | Custom VM setup scripts | minikube, kind, k3d | Pre-configured, disposable clusters with registry support. kind runs k8s nodes as Docker containers (no VMs needed). |
| Container health checks | Custom health check scripts | Docker HEALTHCHECK, K8s liveness/readiness probes | Built into container orchestration, automatic restart on failure, integrated with rolling updates |
| Secret management | .env files in containers | Kubernetes Secrets, Docker secrets | Encrypted at rest, RBAC-controlled, can be rotated without rebuilding images |
| Image registry authentication | Hardcoded credentials | Kubernetes imagePullSecrets | Secure credential injection, namespace-scoped, supports multiple registries |
| SSL/TLS termination | Custom Nginx SSL config | Traefik automatic cert management | Let's Encrypt integration, automatic renewal, no manual certificate handling |
| Container log aggregation | SSH + tail -f | kubectl logs, Docker logs driver | Centralized logging, searchable, works with crashed containers |
| Multi-environment config | Multiple Dockerfiles | Build args + runtime env injection | Single Dockerfile, deterministic builds, separation of build-time and runtime config |

**Key insight:** Container orchestration platforms (Docker, Kubernetes) provide battle-tested solutions for operational concerns. Building custom solutions creates maintenance burden and misses security updates. Use platform primitives first, custom tooling only when platform limitations are proven.

## Common Pitfalls

### Pitfall 1: React Environment Variables Embedded at Build Time
**What goes wrong:** React apps built with Create React App embed environment variables at build time via Webpack. Changing REACT_APP_API_URL requires rebuilding the entire frontend container, violating the build-once-deploy-everywhere principle.
**Why it happens:** `process.env.REACT_APP_*` variables are replaced with string literals during webpack build. The runtime environment has no concept of these variables.
**How to avoid:**
- **Option A (Simple):** Accept build-time variables, maintain separate builds for local/staging/production. Store build outputs in registry with environment-specific tags (`frontend:local`, `frontend:prod`).
- **Option B (Complex):** Implement runtime injection by generating `env-config.js` at container startup and loading before React bundle. Requires code changes to read from `window.ENV` instead of `process.env`.
**Warning signs:** Need to rebuild frontend container when changing API URLs or Supabase endpoints.

### Pitfall 2: Kubernetes ExternalName Service with IP Addresses
**What goes wrong:** ExternalName services only work with DNS hostnames, not IP addresses. Creating `externalName: 192.168.0.50` results in DNS resolution errors and failed routing.
**Why it happens:** ExternalName creates a CNAME DNS record. IP addresses cannot be used in CNAME records (A records required).
**How to avoid:** Use Service without selectors + manual Endpoints resource. Endpoints resource accepts IP addresses directly.
**Warning signs:** Backend service shows DNS resolution errors, Traefik logs show "no such host" errors.
**Example:**
```yaml
# WRONG: ExternalName with IP
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ExternalName
  externalName: 192.168.0.50  # ERROR: IP not allowed

# CORRECT: Service + manual Endpoints
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  ports:
    - port: 3001
---
apiVersion: v1
kind: Endpoints
metadata:
  name: backend-service
subsets:
  - addresses:
      - ip: 192.168.0.50  # OK: IP in Endpoints
    ports:
      - port: 3001
```

### Pitfall 3: Insecure Docker Registry Pull Without imagePullSecrets
**What goes wrong:** k3s cluster attempts to pull images from self-hosted registry (192.168.0.40:5000) but fails with "unauthorized" or "x509: certificate signed by unknown authority" errors.
**Why it happens:**
1. Self-hosted registries without TLS are blocked by default (Docker security policy)
2. Self-signed TLS certificates are not trusted by k3s nodes
3. No authentication credentials provided to k3s
**How to avoid:**
```bash
# Option A: Configure k3s to allow insecure registry (LAN-only, acceptable for homelab)
# On each Pi node: /etc/rancher/k3s/registries.yaml
mirrors:
  "192.168.0.40:5000":
    endpoint:
      - "http://192.168.0.40:5000"
configs:
  "192.168.0.40:5000":
    tls:
      insecure_skip_verify: true

# Restart k3s
sudo systemctl restart k3s

# Option B: Use imagePullSecrets with registry authentication
kubectl create secret docker-registry regcred \
  --docker-server=192.168.0.40:5000 \
  --docker-username=admin \
  --docker-password=password \
  -n website

# In deployment.yaml
spec:
  imagePullSecrets:
    - name: regcred
```
**Warning signs:** Pods stuck in `ImagePullBackOff` status, events show "x509" or "unauthorized" errors.

### Pitfall 4: Nginx Proxying API Requests Instead of Traefik
**What goes wrong:** Nginx config in frontend container includes `location /api { proxy_pass http://backend-service:3001; }`. This breaks when frontend runs on k3s because `backend-service` hostname is not resolvable from within the frontend pod, or resolves to wrong IP.
**Why it happens:** Two conflicting routing patterns:
1. Client-side: Browser makes requests to `/api`, expects routing via Traefik ingress
2. Server-side: Nginx tries to proxy `/api` internally, bypassing Traefik
**How to avoid:** Remove API proxying from Nginx config. Frontend should make direct requests to `/api` relative to domain, letting Traefik handle routing via Ingress rules.
**Correct nginx.conf:**
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
    # NO proxy_pass for /api - let Traefik handle it via Ingress
}
```
**Warning signs:** API requests fail with DNS errors or CORS issues after deploying frontend to k3s.

### Pitfall 5: Frontend Pods Overwhelm Pi Cluster Resources
**What goes wrong:** Deploying 3+ frontend replicas on 4 Raspberry Pis causes memory pressure, evictions, or slow response times.
**Why it happens:** Each Nginx+React pod consumes 128-256MB RAM. Pis have limited memory (4GB), shared with system services and k3s components.
**How to avoid:**
```yaml
# In frontend deployment.yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"
replicas: 2  # Start with 2, monitor resource usage
```
**Monitoring:**
```bash
# Check node memory usage
kubectl top nodes

# Check pod resource usage
kubectl top pods -n website

# Watch for evictions
kubectl get events -n website --sort-by='.lastTimestamp'
```
**Warning signs:** Pods in `OOMKilled` status, nodes showing memory pressure, slow UI response times.

### Pitfall 6: Missing Health Checks Cause Downtime During Deployments
**What goes wrong:** Rolling update deploys new backend version, Kubernetes marks pods as "Ready" before Express server finishes initializing. Traffic is routed to pods before database connections are established, causing 502/503 errors.
**Why it happens:** Without readiness probes, Kubernetes considers container "ready" as soon as it starts. Express initialization (database connection, Supabase client setup) takes 5-10 seconds.
**How to avoid:**
```yaml
# Backend deployment on VM (docker-compose.yml)
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 10s
      timeout: 3s
      start_period: 30s
      retries: 3

# Frontend deployment on k3s
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: frontend
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```
**Warning signs:** 502 errors during deployments, intermittent API failures after pod restarts.

### Pitfall 7: Docker Compose on VM Not Exposed to LAN
**What goes wrong:** Backend container runs on Proxmox VM (192.168.0.50) but binds to 127.0.0.1. k3s cluster on 192.168.0.40-43 cannot reach backend.
**Why it happens:** Docker port mapping defaults to localhost. `-p 3001:3001` actually binds to `127.0.0.1:3001`, not `0.0.0.0:3001`.
**How to avoid:**
```yaml
# docker-compose.backend.yml
services:
  backend:
    ports:
      - "0.0.0.0:3001:3001"  # Explicit bind to all interfaces
    # OR
    network_mode: host  # Use host networking (Linux only)
```
**Verification:**
```bash
# On Proxmox VM
netstat -tuln | grep 3001
# Should show: 0.0.0.0:3001, not 127.0.0.1:3001

# From Pi node
curl http://192.168.0.50:3001/api/health
# Should return health check response
```
**Warning signs:** Backend works when curling from VM itself, but times out from k3s cluster.

### Pitfall 8: Forgetting to Update Ingress After Backend IP Change
**What goes wrong:** Proxmox VM gets assigned new DHCP IP after reboot. Frontend works, but all API calls return 503 Service Unavailable.
**Why it happens:** Manual Endpoints resource has hardcoded IP address. Unlike Services with selectors (which auto-update via label matching), manual Endpoints must be updated explicitly.
**How to avoid:**
1. **Assign static IP to backend VM** via DHCP reservation or static network config
2. **Document IP in infrastructure repo** (e.g., `docs/INFRASTRUCTURE.md`)
3. **Use DNS hostname instead of IP** (if homelab has internal DNS server):
```yaml
# Service + Endpoints with DNS
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ExternalName
  externalName: backend.home.lan  # Internal DNS hostname
```
**Warning signs:** Frontend loads, API calls timeout, `kubectl describe endpoints backend-service` shows outdated IP.

## Code Examples

Verified patterns from official sources:

### Complete Frontend Dockerfile with Multi-Stage Build
```dockerfile
# Source: https://www.docker.com/blog/how-to-dockerize-react-app/
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source and build
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build artifacts
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config (handles React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run as non-root (nginx:nginx user exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Complete Backend Docker Compose Configuration
```yaml
# Source: https://docs.docker.com/compose/compose-file/
# docker-compose.backend.yml for Proxmox VM
version: '3.8'

services:
  backend:
    image: 192.168.0.40:5000/backend:${GIT_SHA:-latest}
    container_name: edwards-backend
    restart: unless-stopped

    # Environment from .env file
    env_file:
      - .env

    # Expose to LAN
    ports:
      - "0.0.0.0:3001:3001"

    # Health check
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    # Resource limits (Docker)
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Complete Frontend Deployment Manifest
```yaml
# Source: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: website
  labels:
    app: frontend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime deployments
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      # Pull from self-hosted registry
      imagePullSecrets:
        - name: registry-credentials

      containers:
      - name: frontend
        image: 192.168.0.40:5000/frontend:latest
        imagePullPolicy: Always

        ports:
        - containerPort: 80
          name: http

        # Resource limits for Pi cluster
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"

        # Health checks
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 3
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3

        # Environment variables from ConfigMap
        envFrom:
          - configMapRef:
              name: frontend-config

        # Security context
        securityContext:
          runAsNonRoot: true
          runAsUser: 101  # nginx user
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
            add:
              - NET_BIND_SERVICE

        # Writable volumes for Nginx
        volumeMounts:
          - name: cache
            mountPath: /var/cache/nginx
          - name: run
            mountPath: /var/run

      volumes:
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: website
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: website
data:
  REACT_APP_SUPABASE_URL: "https://supabase.edwardstech.dev"
  REACT_APP_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Replace with actual key
  REACT_APP_API_URL: "https://edwardstech.dev/api"
```

### Complete Backend Service with Manual Endpoints
```yaml
# Source: https://kubernetes.io/docs/concepts/services-networking/service/
# Backend runs on Proxmox VM, not in k8s
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: website
spec:
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  # No selector - manually managed Endpoints

---
apiVersion: v1
kind: Endpoints
metadata:
  name: backend-service  # Must match Service name exactly
  namespace: website
subsets:
  - addresses:
      - ip: 192.168.0.50  # Proxmox VM static IP
    ports:
      - port: 3001
```

### Build and Push Script
```bash
#!/bin/bash
# Source: https://medium.com/@nirmalkushwah08/docker-image-tagging-strategy-4aa886fb4fcc
# scripts/build-and-push.sh

set -e  # Exit on error

REGISTRY="192.168.0.40:5000"
GIT_SHA=$(git rev-parse --short HEAD)
VERSION=$(cat VERSION 2>/dev/null || echo "0.1.0")

echo "Building images..."
echo "Git SHA: $GIT_SHA"
echo "Version: $VERSION"

# Build frontend
docker build \
  -t ${REGISTRY}/frontend:${GIT_SHA} \
  -t ${REGISTRY}/frontend:${VERSION} \
  -t ${REGISTRY}/frontend:latest \
  -f Dockerfile.frontend .

# Build backend
docker build \
  -t ${REGISTRY}/backend:${GIT_SHA} \
  -t ${REGISTRY}/backend:${VERSION} \
  -t ${REGISTRY}/backend:latest \
  -f Dockerfile.backend .

echo "Pushing images to registry..."
docker push ${REGISTRY}/frontend:${GIT_SHA}
docker push ${REGISTRY}/frontend:${VERSION}
docker push ${REGISTRY}/frontend:latest

docker push ${REGISTRY}/backend:${GIT_SHA}
docker push ${REGISTRY}/backend:${VERSION}
docker push ${REGISTRY}/backend:latest

echo "Build complete!"
echo "Frontend: ${REGISTRY}/frontend:${GIT_SHA}"
echo "Backend: ${REGISTRY}/backend:${GIT_SHA}"
```

### Deploy to Proxmox VM Script
```bash
#!/bin/bash
# scripts/deploy-backend-vm.sh
# Deploy backend to Proxmox VM via SSH

set -e

VM_HOST="192.168.0.50"
VM_USER="ubuntu"
GIT_SHA=$(git rev-parse --short HEAD)

echo "Deploying backend to VM..."

# Copy docker-compose and .env
scp docker-compose.backend.yml ${VM_USER}@${VM_HOST}:~/backend/docker-compose.yml
scp contact-backend/.env.production ${VM_USER}@${VM_HOST}:~/backend/.env

# Pull new image and restart
ssh ${VM_USER}@${VM_HOST} << EOF
  cd ~/backend
  export GIT_SHA=${GIT_SHA}
  docker-compose pull
  docker-compose up -d
  docker-compose logs --tail=50
EOF

echo "Backend deployed: ${GIT_SHA}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single k8s deployment for frontend+backend | Split architecture: backend on VM, frontend on k8s | 2025+ | Backend on reliable storage (VM), frontend stays on low-cost Pi cluster |
| Create React App (CRA) for new projects | Vite for new React projects | 2023+ | Faster dev server, better build performance, but CRA still widely used for existing projects |
| Docker Hub for image storage | Self-hosted registries | Ongoing | Avoid rate limits, faster pulls on LAN, privacy for private projects |
| Build-time environment variables only | Runtime environment injection | 2024+ | True build-once-deploy-everywhere, but requires code changes to read from window.ENV |
| ExternalName Service for external backends | Service + manual Endpoints | Stable pattern | ExternalName DNS-only, manual Endpoints work with IPs |
| NGINX Ingress Controller | Traefik | 2026 | NGINX Ingress project retired March 2026, Traefik actively maintained |

**Deprecated/outdated:**
- **NGINX Ingress Controller**: Project retired March 2026, no security patches. Migrate to Traefik or other ingress controllers.
- **Docker Compose v1 (docker-compose)**: Deprecated in favor of v2 (docker compose). V1 Python implementation no longer maintained.
- **Create React App active development**: CRA in maintenance mode as of 2023. Still usable for existing projects, but Vite/Next.js recommended for new projects.

## Open Questions

Things that couldn't be fully resolved:

1. **React Runtime Environment Variables**
   - What we know: Standard CRA embeds variables at build time. Runtime injection requires custom entrypoint script and code changes.
   - What's unclear: Whether existing codebase is too tightly coupled to `process.env` to make runtime injection practical. Need to audit all `process.env.REACT_APP_*` usage.
   - Recommendation: Start with build-time approach (accept separate builds per environment), revisit runtime injection in Phase 6 if needed for GitOps automation.

2. **Optimal Frontend Replica Count**
   - What we know: 4 Raspberry Pi 4 nodes with 4GB RAM each. Nginx+React container ~64-128MB per pod.
   - What's unclear: What replica count balances availability with resource constraints? How much overhead do k3s system pods consume?
   - Recommendation: Start with 2 replicas, monitor with `kubectl top nodes` and `kubectl top pods`. Scale to 3 if memory permits, but not 4 (leave headroom).

3. **Testing Strategy for Split Architecture**
   - What we know: minikube/kind can test frontend k8s manifests locally. Backend can test with docker-compose locally.
   - What's unclear: How to integration test frontend+backend interaction before deploying to production? Manual Endpoints point to real VM IP, can't mock in local k8s.
   - Recommendation: Use separate test stack: local kind cluster with backend also running in kind (not VM) for integration tests. Document in Phase 6 testing plan.

4. **Network Reliability Between k3s and VM**
   - What we know: Both on same LAN (192.168.0.x), standard TCP communication.
   - What's unclear: What happens if backend VM is temporarily unreachable? Does Traefik retry? What's the timeout behavior?
   - Recommendation: Add retry logic in frontend API client (axios retry interceptor). Document network troubleshooting in deployment runbook.

5. **Self-Hosted Registry Authentication**
   - What we know: Registry at 192.168.0.40:5000 exists, k3s needs imagePullSecrets or insecure registry config.
   - What's unclear: Is registry configured with authentication, or open on LAN? If authenticated, where are credentials managed?
   - Recommendation: Check current registry config (Phase 1 decision). If unauthenticated on LAN, document security tradeoff. If authenticated, create imagePullSecrets in website namespace.

## Sources

### Primary (HIGH confidence)
- Docker Official Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Kubernetes Official Docs: Environment variables - https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes Official Docs: Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Official Docs: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Official Docs: Health checks - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Docker Official Docs: Node.js containerization - https://docs.docker.com/guides/nodejs/containerize/
- Traefik Official Docs: Kubernetes Ingress - https://doc.traefik.io/traefik/providers/kubernetes-ingress/

### Secondary (MEDIUM confidence)
- Docker Blog: How to Dockerize React App (2024) - https://www.docker.com/blog/how-to-dockerize-react-app/
- Docker Blog: 9 Tips for Containerizing Node.js Apps - https://www.docker.com/blog/9-tips-for-containerizing-your-node-js-application/
- Snyk Blog: 10 Best Practices to Containerize Node.js (2024) - https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
- DEV Community: Runtime Environment Variables for React with Nginx (2024) - https://dev.to/imzihad21/runtime-environment-variables-for-react-apps-with-nginx-and-docker-3p62
- FreeCodeCamp: Runtime Env Vars with CRA, Docker, Nginx (2020, still relevant) - https://www.freecodecamp.org/news/how-to-implement-runtime-environment-variables-with-create-react-app-docker-and-nginx-7f9d42a91d70/
- Medium: Docker Image Tagging Strategy - https://medium.com/@nirmalkushwah08/docker-image-tagging-strategy-4aa886fb4fcc
- Raf Rasenberg: Kubernetes Traefik Ingress (2026) - https://rafrasenberg.com/kubernetes-traefik-ingress/
- Virtualization Howto: Docker on Proxmox Best Practices (2025) - https://www.virtualizationhowto.com/2025/10/how-to-run-docker-on-proxmox-the-right-way-and-avoid-common-mistakes/
- Docker Blog: Deploy on Remote Docker Hosts with docker-compose - https://www.docker.com/blog/how-to-deploy-on-remote-docker-hosts-with-docker-compose/

### Tertiary (LOW confidence - marked for validation)
- Multiple search results on Kubernetes multi-namespace ingress patterns
- Community forum discussions on ExternalName vs manual Endpoints
- Blog posts on split frontend/backend architecture pitfalls

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools officially documented and widely adopted for this use case
- Architecture patterns: HIGH - Multi-stage builds and Service+Endpoints are official Kubernetes patterns
- Pitfalls: MEDIUM-HIGH - Drawn from official documentation, community experience, and logical inference from existing project constraints
- React runtime env vars: MEDIUM - Pattern exists but requires validation against existing codebase
- Network reliability: LOW - Homelab-specific considerations not well documented in official sources

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - deployment patterns stable, but Docker/K8s versions evolve)

**Notes:**
- Existing Dockerfiles (Dockerfile.backend, Dockerfile.frontend) already exist and follow best practices
- Existing nginx.conf contains API proxying which should be REMOVED for split architecture
- Self-hosted registry at 192.168.0.40:5000 confirmed in existing manifests
- Traefik already deployed on k3s cluster (confirmed in existing ingress.yaml)
- Phase 4 completed production infrastructure setup (Supabase on Proxmox), Phase 5 focuses on application deployment reconfiguration
