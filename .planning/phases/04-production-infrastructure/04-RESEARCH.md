# Phase 4: Production Infrastructure - Research

**Researched:** 2026-01-29
**Domain:** Self-hosted Supabase deployment on Proxmox VM
**Confidence:** HIGH

## Summary

Self-hosted Supabase deployment on Proxmox VM is a well-documented approach with an established architecture pattern. The official Supabase Docker Compose repository provides a complete stack of 12 interconnected services. Production deployment requires three critical layers: (1) Proxmox VM configured for Docker workloads with proper storage isolation, (2) Supabase Docker Compose with hardened security configuration, and (3) Reverse proxy (Caddy or Nginx) for SSL/TLS termination.

The standard approach uses a dedicated Ubuntu/Debian VM on Proxmox running Docker Engine, with Supabase services deployed via Docker Compose and a reverse proxy (Caddy recommended) handling automatic SSL certificate management from Let's Encrypt. Environment parity between local development (Supabase CLI) and production (Docker Compose) is achievable through consistent configuration and schema migrations tracked in git.

Critical success factors include: never using default passwords/keys from `.env.example`, isolating Docker volumes on separate storage from OS, implementing automated pg_dump backups with retention, and using a reverse proxy instead of configuring Kong SSL directly.

**Primary recommendation:** Deploy on Ubuntu Server 22.04 LTS VM with dedicated storage volume for Docker, use official Supabase Docker Compose with hardened `.env` configuration, and deploy Caddy reverse proxy for automatic SSL management.

## Standard Stack

The established tools for self-hosted Supabase production deployment:

### Core

| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Supabase Docker Compose | Latest (monthly releases) | Complete Supabase stack (12 services) | Official deployment method, includes all services pre-configured |
| PostgreSQL | 15.8.1 | Database engine | Bundled in Supabase stack, matches current Supabase Cloud version |
| Kong | Latest (bundled) | API gateway | Official Supabase API router, handles all external traffic |
| Caddy | 2.x | Reverse proxy with auto-SSL | Automatic Let's Encrypt certificates, simpler than Nginx |
| Docker Engine | 24.x+ | Container runtime | Required for Docker Compose, official Docker recommendation over Docker Desktop for servers |

**Source:** [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting), [Supabase Docker Compose Guide](https://supabase.com/docs/guides/self-hosting/docker)

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| cartoza/docker-pg-backup | Latest | Automated PostgreSQL backups | Production environments requiring scheduled backups |
| Tailscale | Latest | Secure network overlay | When accessing services remotely without exposing ports |
| Nginx | 1.24+ | Reverse proxy (alternative) | If team already uses Nginx or needs complex routing |

**Source:** [Caddy Docker Proxy GitHub](https://github.com/lucaslorentz/caddy-docker-proxy), [Docker PostgreSQL Backup Guide](https://simplebackups.com/blog/docker-postgres-backup-restore-guide-with-examples)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Caddy | Nginx | Nginx requires manual certificate management (Certbot), but offers more configuration flexibility |
| Ubuntu Server | Debian | Debian is more minimal, Ubuntu has better Docker documentation and community support |
| Proxmox VM | Proxmox LXC | LXC has lower overhead but breaks on Proxmox updates, cannot live-migrate, and has Docker compatibility issues |
| Docker Compose | Supabase CLI (production) | CLI is for local dev only, not production; Docker Compose is official production method |

**Sources:**
- [Docker in CT or VM - Proxmox Forum](https://forum.proxmox.com/threads/docker-in-ct-or-vm-best-practices.134164/)
- [Tailscale on Proxmox](https://tailscale.com/kb/1133/proxmox)

**Installation:**

```bash
# On Proxmox VM (Ubuntu Server 22.04 LTS)
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone Supabase repository
git clone --depth 1 https://github.com/supabase/supabase
mkdir -p /opt/supabase
cp -rf supabase/docker/* /opt/supabase/
cp supabase/docker/.env.example /opt/supabase/.env
cd /opt/supabase

# Generate secrets and configure .env (see Configuration section)
# Pull images
docker compose pull

# Deploy Caddy reverse proxy (separate compose file)
# Start Supabase stack
docker compose up -d
```

## Architecture Patterns

### Recommended Deployment Structure

```
Proxmox Host
├── Supabase VM (Ubuntu 22.04 LTS)
│   ├── OS Disk (60GB, VirtIO SCSI)
│   ├── Docker Volume Disk (120GB, VirtIO SCSI, mounted /opt)
│   ├── Network (192.168.0.x, bridged)
│   └── Services:
│       ├── Docker Engine
│       ├── Caddy (Docker container, ports 80/443)
│       └── Supabase Stack (Docker Compose)
│           ├── Kong (API Gateway, internal 8000)
│           ├── PostgreSQL (internal 5432)
│           ├── Auth (GoTrue, internal 9999)
│           ├── REST (PostgREST, internal)
│           ├── Realtime (internal 4000)
│           ├── Storage (internal 5000)
│           ├── Studio (internal 3000)
│           └── Analytics, Meta, Vector, Functions
└── TrueNAS VM (backup target)
```

### Pattern 1: Three-Layer Security Architecture

**What:** Separate network layers (external → reverse proxy → Kong → services)

**When to use:** Production deployments with public internet access

**Example architecture:**

```
Internet (HTTPS 443)
    ↓
Caddy Reverse Proxy (SSL termination)
    ↓ HTTP
Kong API Gateway (localhost:8000, not exposed)
    ↓
Supabase Services (Docker internal network)
```

**Why:** Kong's SSL configuration is complex and requires hardcoded certificates in dbless mode. Using a reverse proxy for SSL is the community-recommended approach.

**Sources:**
- [Supabase SSL GitHub Discussion #3469](https://github.com/orgs/supabase/discussions/3469)
- [Ultimate Supabase Self-Hosting Guide](https://activeno.de/blog/2023-08/the-ultimate-supabase-self-hosting-guide/)

### Pattern 2: Separate Storage Volume for Docker

**What:** Mount separate disk to `/opt` for Docker data, isolate from OS disk

**When to use:** All production VM deployments

**Implementation:**

```bash
# On Proxmox: Add second disk to VM (120GB+)
# In VM:
sudo mkfs.ext4 /dev/sdb
sudo mkdir /opt
echo '/dev/sdb /opt ext4 defaults 0 2' | sudo tee -a /etc/fstab
sudo mount -a

# Store Docker data on /opt
mkdir -p /opt/supabase
mkdir -p /opt/caddy
```

**Why:**
- Keeps application data separate from OS for easier backups
- Allows VM snapshots that exclude large Docker volumes
- Prevents database writes from filling root partition
- Enables storage expansion without resizing root partition

**Source:** [Proxmox Storage Best Practices Forum](https://forum.proxmox.com/threads/adding-storage-to-a-vm-best-practices.99183/)

### Pattern 3: Label-Based Reverse Proxy Configuration

**What:** Use Caddy Docker Proxy with label-based routing instead of static Caddyfile

**When to use:** When managing multiple services with Docker Compose

**Example:**

```yaml
# docker-compose.caddy.yml
services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./caddy-data:/data
    networks:
      - supabase-network
    restart: unless-stopped

# docker-compose.supabase.yml (add labels)
services:
  kong:
    labels:
      caddy: api.edwardstech.dev
      caddy.reverse_proxy: "{{upstreams 8000}}"
    networks:
      - supabase-network
```

**Why:** Automatic SSL certificate management, zero-downtime reloads, no manual Caddyfile editing

**Source:** [Caddy Docker Proxy GitHub](https://github.com/lucaslorentz/caddy-docker-proxy)

### Pattern 4: Environment Parity via Configuration

**What:** Keep local dev (Supabase CLI) and production (Docker Compose) aligned through shared migrations and equivalent configuration

**When to use:** All projects using Supabase CLI for local development

**Implementation:**

```
Project Structure:
├── supabase/
│   ├── config.toml          # Local dev configuration
│   ├── migrations/          # Applied to both local and prod
│   ├── seed.sql             # Test data for local dev
│   └── .env.local           # Local secrets (gitignored)
├── .env.production          # Production secrets (gitignored)
└── production/
    ├── docker-compose.yml   # Supabase stack
    └── .env                 # Production config (generated from template)
```

**Key alignment points:**

| Aspect | Local (CLI) | Production (Docker) | Parity Strategy |
|--------|-------------|---------------------|-----------------|
| Schema | `supabase/migrations/` | Applied via volume mount | Migrations tracked in git |
| Auth providers | `config.toml` [auth.external] | `.env` GOTRUE_EXTERNAL_* | Document provider setup in both |
| JWT secret | Auto-generated by CLI | `.env` JWT_SECRET | Use same secret in both for token compatibility |
| API keys | Auto-generated by CLI | `.env` ANON_KEY / SERVICE_ROLE_KEY | Generate once, share across envs |
| Database version | `config.toml` major_version | Docker image tag | Pin to same PostgreSQL version |

**Source:** [Supabase Managing Config Docs](https://supabase.com/docs/guides/local-development/managing-config)

### Anti-Patterns to Avoid

- **Running Docker on Proxmox host:** Docker iptables rules break Proxmox firewall; updates can wipe containers. Always use a VM.
- **Using default passwords from `.env.example`:** Critical security vulnerability; must generate all secrets before first start.
- **Configuring Kong SSL directly:** Complex, requires hardcoded certs in dbless mode; use reverse proxy instead.
- **Exposing Kong ports directly to internet:** Bypasses reverse proxy SSL termination and rate limiting.
- **Using LXC container for Docker:** Breaks on Proxmox updates, cannot live-migrate, has networking issues.
- **Copying `./volumes/` for backups without stopping services:** Can result in inconsistent state; use pg_dump for database.
- **Mixing Supabase CLI docker-compose with production:** CLI uses different internal structure; use official docker folder.

**Sources:**
- [Running Docker on Proxmox Host Forum](https://forum.proxmox.com/threads/running-docker-on-the-proxmox-host-not-in-vm-ct.147580/)
- [Supabase Self-Hosting Docker Docs](https://supabase.com/docs/guides/self-hosting/docker)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Custom Certbot scripts, manual renewal | Caddy with auto-HTTPS | Caddy handles cert issuance, renewal, OCSP stapling automatically; zero-downtime reloads |
| PostgreSQL backup automation | Custom backup scripts | `kartoza/docker-pg-backup` Docker image | Pre-built with cron scheduling, retention policies, compression, tested by community |
| Supabase Docker configuration | Custom docker-compose from scratch | Official Supabase docker folder | 12 services with proper dependencies, health checks, networking pre-configured; monthly updates |
| Secrets generation | Manual password creation | `openssl rand` commands | Cryptographically secure, meets length requirements, documented in official guide |
| Database connection pooling | Direct PostgreSQL connections | Supavisor (bundled) | Handles connection limits, transaction/session modes, included in Supabase stack |
| API routing | Custom nginx routing rules | Kong (bundled) | Manages API versioning, auth middleware, rate limiting, pre-configured for Supabase services |

**Key insight:** The Supabase Docker Compose stack is a complex orchestration of 12 services with specific dependency ordering, health checks, and inter-service communication. The official configuration has been battle-tested and receives monthly stability updates. Custom configurations miss critical details like Analytics service dependencies, proper Vector log routing, and Supavisor pooler configuration.

**Sources:**
- [Supabase Docker Compose YAML](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml)
- [Kartoza Docker PostgreSQL Backup](https://github.com/kartoza/docker-pg-backup)
- [Caddy Docker Proxy](https://github.com/lucaslorentz/caddy-docker-proxy)

## Common Pitfalls

### Pitfall 1: Docker Volume Data Loss on Restart

**What goes wrong:** Using default volume paths (relative `./volumes/`) without understanding Docker Compose volume behavior can lead to data loss if the working directory changes or the compose file is recreated.

**Why it happens:** Docker Compose creates anonymous volumes if the source path doesn't exist, and the official Supabase docker-compose.yml uses relative paths like `./volumes/db/data`.

**How to avoid:**
- Always use absolute paths for critical data volumes, or
- Use named Docker volumes instead of bind mounts, or
- Store Supabase deployment in fixed location like `/opt/supabase/`

**Warning signs:**
- Database appears empty after restart
- Migrations need to be re-run
- User accounts are missing

**Sources:**
- [Self-Hosting Common Issues GitHub Discussion](https://github.com/orgs/supabase/discussions/39820)
- [Docker Compose Volumes Documentation](https://docs.docker.com/compose/compose-file/07-volumes/)

### Pitfall 2: Incomplete Environment Configuration Before First Start

**What goes wrong:** Starting Supabase with default `.env.example` values creates the database with insecure passwords, generates JWT keys, and initializes services with default secrets. These cannot be safely changed after initialization without data loss.

**Why it happens:** Official documentation warns against this, but the quickstart section can be misread as "start first, configure later."

**How to avoid:**
1. Copy `.env.example` to `.env`
2. Generate ALL secrets before first `docker compose up`:
   ```bash
   # JWT_SECRET (64+ characters)
   openssl rand -base64 48

   # SECRET_KEY_BASE (64+ characters)
   openssl rand -base64 48

   # VAULT_ENC_KEY (exactly 32 characters)
   openssl rand -hex 16

   # POSTGRES_PASSWORD (alphanumeric only)
   openssl rand -base64 32 | tr -d '/+=' | head -c 32
   ```
3. Generate API keys using Supabase CLI or online tools
4. Set all SMTP, URL, and provider configs
5. THEN start services

**Warning signs:**
- Using "postgres" as database password
- JWT_SECRET contains "super-secret-jwt-token-with-at-least-32-characters-long"
- Services start but auth fails mysteriously

**Source:** [Supabase Self-Hosting Docker Guide](https://supabase.com/docs/guides/self-hosting/docker)

### Pitfall 3: API_EXTERNAL_URL Misconfiguration

**What goes wrong:** Email magic links and OAuth redirects use wrong domain, pointing to localhost or internal IP instead of public domain. Users can't complete authentication flows.

**Why it happens:** The `.env.example` file has placeholder values, and the variable name suggests it's only for "external" access, not core functionality.

**How to avoid:**
- Set `API_EXTERNAL_URL=https://api.yourdomain.com` (your public API URL)
- Set `SUPABASE_PUBLIC_URL=https://api.yourdomain.com` (same as API_EXTERNAL_URL)
- Set `SITE_URL=https://app.yourdomain.com` (your frontend URL)
- Set these BEFORE first start; changing later requires updating all issued tokens

**Warning signs:**
- Email links point to `http://localhost:8000`
- OAuth redirects fail with "redirect_uri mismatch"
- Password reset links are not clickable

**Source:** [Self-Hosting Issues GitHub Discussion #20111](https://github.com/orgs/supabase/discussions/20111)

### Pitfall 4: Zero-Downtime Update Assumptions

**What goes wrong:** Assuming `docker compose pull && docker compose up -d` provides zero-downtime updates. Supabase services restart sequentially, causing 30-60 second outages.

**Why it happens:** Docker Compose default behavior is to stop then start each service. Supabase services have complex dependency chains requiring sequential startup.

**How to avoid:**
- Accept that updates cause brief downtime (official Supabase stance)
- Schedule updates during maintenance windows
- Consider blue-green deployment strategy for critical systems:
  - Deploy second Supabase stack on different ports
  - Migrate database to new stack
  - Update reverse proxy to point to new stack
  - Decommission old stack
- For true zero-downtime, use Docker Swarm with rolling updates (advanced)

**Warning signs:**
- Users report "Service Unavailable" during updates
- Active database connections dropped
- WebSocket connections severed

**Sources:**
- [Supabase Docker Updates](https://supabase.com/docs/guides/self-hosting/docker)
- [Zero-Downtime Docker Compose Deployments](https://reintech.io/blog/zero-downtime-deployments-docker-compose-rolling-updates)

### Pitfall 5: Backup Strategy Limited to Database Only

**What goes wrong:** Backing up PostgreSQL with pg_dump but forgetting Storage buckets. Files uploaded via Supabase Storage are lost during disaster recovery.

**Why it happens:** Supabase splits data between PostgreSQL (metadata) and filesystem/S3 (actual files). pg_dump only captures database.

**How to avoid:**
- Backup database: Use `kartoza/docker-pg-backup` or manual pg_dump
- Backup storage:
  - If using file storage: backup `./volumes/storage/` directory
  - If using S3: use AWS backup tools or cross-region replication
- Test restore procedures regularly (backup without tested restore is not a backup)
- Document restore procedure in runbook

**Warning signs:**
- Restore completes but uploaded images/files are missing
- Storage bucket metadata exists but files return 404

**Source:** [Supabase Backup Discussion GitHub #37748](https://github.com/orgs/supabase/discussions/37748)

### Pitfall 6: Forgetting to Enable Row Level Security

**What goes wrong:** Deploying to production with RLS disabled on tables. Anyone with the anon key can read/write all data.

**Why it happens:** RLS is often disabled during prototyping for faster iteration. Developers forget to enable before production deployment.

**How to avoid:**
- Enable RLS on ALL tables before production: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Create policies for each table defining access rules
- Use Supabase Studio to verify RLS is enabled (shield icon)
- Add migration validation step: fail deployment if any table lacks RLS

**Warning signs:**
- Supabase Studio shows red warning icons on tables
- Unauthorized users can access data they shouldn't see
- All data is publicly readable via API

**Source:** [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)

## Code Examples

Verified patterns from official sources:

### Supabase Docker Compose Deployment

```bash
# Source: https://supabase.com/docs/guides/self-hosting/docker

# 1. Clone and prepare
git clone --depth 1 https://github.com/supabase/supabase
mkdir -p /opt/supabase
cp -rf supabase/docker/* /opt/supabase/
cp supabase/docker/.env.example /opt/supabase/.env
cd /opt/supabase

# 2. Generate secrets (do this BEFORE first start)
cat << 'EOF' > generate-secrets.sh
#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "SECRET_KEY_BASE=$(openssl rand -base64 48)"
echo "VAULT_ENC_KEY=$(openssl rand -hex 16)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
echo "LOGFLARE_PUBLIC_ACCESS_TOKEN=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
echo "LOGFLARE_PRIVATE_ACCESS_TOKEN=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
EOF
chmod +x generate-secrets.sh
./generate-secrets.sh

# 3. Edit .env with generated secrets
# Set API_EXTERNAL_URL, SUPABASE_PUBLIC_URL, SITE_URL to your domains

# 4. Pull images
docker compose pull

# 5. Start services
docker compose up -d

# 6. Verify all services are healthy
docker compose ps
# Wait 30-60 seconds, all should show "(healthy)"

# Access Studio at http://your-server:8000 (will be proxied by Caddy)
```

### Caddy Reverse Proxy with Automatic SSL

```yaml
# Source: https://github.com/lucaslorentz/caddy-docker-proxy
# File: /opt/caddy/docker-compose.yml

services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:latest
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    environment:
      - CADDY_INGRESS_NETWORKS=supabase_default
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./caddy-data:/data
    networks:
      - supabase_default
    restart: unless-stopped

networks:
  supabase_default:
    external: true
```

**Add labels to Kong service in Supabase docker-compose.yml:**

```yaml
services:
  kong:
    # ... existing config ...
    labels:
      caddy: api.edwardstech.dev
      caddy.reverse_proxy: "{{upstreams 8000}}"
    networks:
      - default
```

**Then restart Caddy:**
```bash
cd /opt/caddy
docker compose up -d
# Caddy will automatically request Let's Encrypt certificate for api.edwardstech.dev
# Access at https://api.edwardstech.dev
```

### Automated PostgreSQL Backup

```yaml
# Source: https://github.com/kartoza/docker-pg-backup
# File: /opt/supabase/docker-compose.backup.yml

services:
  db-backup:
    image: kartoza/pg-backup:latest
    container_name: supabase-backup
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - POSTGRES_DB=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_PASS=${POSTGRES_PASSWORD}
      - CRON_SCHEDULE=0 2 * * *  # Daily at 2 AM
      - BACKUP_DIR=/backups
      - REMOVE_BEFORE=7  # Keep 7 days of backups
    volumes:
      - /opt/backups/postgres:/backups
    networks:
      - default
    depends_on:
      - db
    restart: unless-stopped

networks:
  default:
    external: true
    name: supabase_default
```

**Deploy backup service:**
```bash
cd /opt/supabase
docker compose -f docker-compose.backup.yml up -d
```

### Manual Backup and Restore

```bash
# Backup database (can be run while services are running)
docker exec supabase-db pg_dump -U postgres postgres \
  --no-owner --no-acl \
  | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Backup storage files
tar -czf storage-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /opt/supabase/volumes/storage/

# Restore database (requires stopping services first)
docker compose down
gunzip -c backup-20260129-140000.sql.gz \
  | docker compose run --rm db psql -U postgres postgres
docker compose up -d

# Restore storage
tar -xzf storage-backup-20260129-140000.tar.gz -C /
```

### Environment Variables Configuration Template

```bash
# Source: https://supabase.com/docs/guides/self-hosting/docker
# File: /opt/supabase/.env

############
# Secrets - CHANGE ALL OF THESE BEFORE FIRST START
############

POSTGRES_PASSWORD=<generate with: openssl rand -base64 32 | tr -d '/+=' | head -c 32>
JWT_SECRET=<generate with: openssl rand -base64 48>
ANON_KEY=<generate via supabase CLI or online tool>
SERVICE_ROLE_KEY=<generate via supabase CLI or online tool>
SECRET_KEY_BASE=<generate with: openssl rand -base64 48>
VAULT_ENC_KEY=<generate with: openssl rand -hex 16>
LOGFLARE_PUBLIC_ACCESS_TOKEN=<generate with: openssl rand -base64 32 | tr -d '/+=' | head -c 32>
LOGFLARE_PRIVATE_ACCESS_TOKEN=<generate with: openssl rand -base64 32 | tr -d '/+=' | head -c 32>

############
# Database
############

POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API URLs - Set these to your public domain
############

SUPABASE_PUBLIC_URL=https://api.edwardstech.dev
API_EXTERNAL_URL=https://api.edwardstech.dev
SITE_URL=https://www.edwardstech.dev

############
# Auth
############

## JWT Settings
JWT_EXPIRY=3600

## OAuth Providers (example: Google)
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<your-google-client-id>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<your-google-client-secret>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.edwardstech.dev/auth/v1/callback

## SMTP Settings (for email auth)
GOTRUE_SMTP_HOST=smtp.sendgrid.net
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=apikey
GOTRUE_SMTP_PASS=<your-sendgrid-api-key>
GOTRUE_SMTP_ADMIN_EMAIL=admin@edwardstech.dev
GOTRUE_SMTP_SENDER_NAME="Edwards Engineering"

############
# Storage
############

STORAGE_BACKEND=file
# For S3: STORAGE_BACKEND=s3
# STORAGE_S3_BUCKET=supabase-storage
# STORAGE_S3_REGION=us-east-1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Kong SSL configuration | Reverse proxy (Caddy/Nginx) for SSL termination | 2023 | Simplified SSL management, automatic cert renewal |
| LXC containers for Docker | Dedicated VMs for Docker | 2024 | Better stability, live migration support, fewer Proxmox update issues |
| Custom docker-compose files | Official Supabase docker folder | 2022 | Standardized deployments, monthly stability updates |
| Exposed Postgres port 5432 | Supavisor connection pooler | 2023 | Better connection management, reduced resource usage |
| Separate Logflare service | Integrated Analytics service | 2024 | Simplified logging, built into stack |
| Docker Desktop on servers | Docker Engine | Always | Lower resource usage, no licensing concerns |

**Deprecated/outdated:**
- **Supabase CLI for production:** The CLI is explicitly for local development only. Production deployments must use Docker Compose. (Source: [Supabase CLI Docs](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Kong SSL configuration in dbless mode:** Community consensus is that reverse proxy SSL is simpler and more maintainable. (Source: [GitHub Discussion #3469](https://github.com/orgs/supabase/discussions/3469))
- **Running Docker directly on Proxmox host:** Breaks Proxmox firewall, risks data loss on updates. (Source: [Proxmox Forum](https://forum.proxmox.com/threads/running-docker-on-the-proxmox-host-not-in-vm-ct.147580/))

## Open Questions

Things that couldn't be fully resolved:

1. **Official backup/restore procedure for self-hosted**
   - What we know: pg_dump works for database, file copies work for storage
   - What's unclear: Official Supabase recommendation, tested procedures for full disaster recovery
   - Recommendation: Use kartoza/docker-pg-backup for database automation, document and test restore procedures manually, monitor GitHub discussions for official guidance

2. **Feature parity between local CLI and self-hosted production**
   - What we know: Some Supabase Cloud features are intentionally disabled in self-hosted (IS_PLATFORM variable)
   - What's unclear: Complete list of features unavailable in self-hosted, roadmap for parity
   - Recommendation: Test critical features (auth, storage, realtime) in production before go-live, maintain feature tracking document

3. **Optimal Proxmox VM resource allocation for Supabase**
   - What we know: Official minimum is 4GB RAM / 2 cores, recommended is 8GB+ RAM / 4+ cores
   - What's unclear: Scaling characteristics with concurrent users, when to upgrade resources
   - Recommendation: Start with 8GB RAM / 4 cores / 120GB storage, monitor with Prometheus/Grafana, scale based on metrics

4. **Update strategy and service downtime**
   - What we know: Monthly Supabase releases, docker compose restarts cause downtime
   - What's unclear: Typical downtime duration, blue-green deployment viability
   - Recommendation: Schedule updates during maintenance windows, test update procedures in staging environment, consider Tailscale for gradual rollout

## Sources

### Primary (HIGH confidence)
- [Supabase Self-Hosting Documentation](https://supabase.com/docs/guides/self-hosting) - Official deployment method
- [Supabase Docker Compose Guide](https://supabase.com/docs/guides/self-hosting/docker) - Prerequisites, configuration, environment variables
- [Supabase Docker Compose YAML](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml) - Service architecture and dependencies
- [Supabase Managing Config](https://supabase.com/docs/guides/local-development/managing-config) - Config.toml structure and environment variables
- [Caddy Docker Proxy](https://github.com/lucaslorentz/caddy-docker-proxy) - Label-based reverse proxy configuration
- [Tailscale on Proxmox](https://tailscale.com/kb/1133/proxmox) - Secure network overlay setup

### Secondary (MEDIUM confidence)
- [Ultimate Supabase Self-Hosting Guide](https://activeno.de/blog/2023-08/the-ultimate-supabase-self-hosting-guide/) - Production best practices, SSL configuration
- [Supabase SSL GitHub Discussion #3469](https://github.com/orgs/supabase/discussions/3469) - Community SSL configuration solutions
- [Docker PostgreSQL Backup Guide](https://simplebackups.com/blog/docker-postgres-backup-restore-guide-with-examples/) - Backup automation strategies
- [Kartoza Docker PostgreSQL Backup](https://github.com/kartoza/docker-pg-backup) - Automated backup container
- [Proxmox VM Best Practices Forum](https://forum.proxmox.com/threads/docker-in-ct-or-vm-best-practices.134164/) - VM vs LXC for Docker
- [Proxmox Storage Best Practices](https://forum.proxmox.com/threads/adding-storage-to-a-vm-best-practices.99183/) - Storage isolation patterns

### Tertiary (LOW confidence - community discussion, not officially verified)
- [Self-Hosting Common Issues GitHub #39820](https://github.com/orgs/supabase/discussions/39820) - User-reported pitfalls
- [Supabase Backup Discussion #37748](https://github.com/orgs/supabase/discussions/37748) - Backup strategy community questions (unanswered)
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Third-party best practices guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase documentation and Docker Compose repository
- Architecture: HIGH - Based on official docker-compose.yml and community-verified patterns
- SSL/TLS: HIGH - Official documentation recommends reverse proxy, community consensus
- Backup: MEDIUM - No official Supabase guidance, but standard PostgreSQL practices apply
- Pitfalls: MEDIUM - Verified through multiple GitHub discussions and community reports

**Research date:** 2026-01-29
**Valid until:** 2026-03-29 (60 days - Supabase releases monthly, infrastructure patterns are stable)
