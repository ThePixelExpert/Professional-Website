# Production Deployment Guide

## Overview

This directory contains the configuration and documentation for deploying Supabase to production on a Proxmox VM.

### Architecture

```
Internet (HTTPS 443)
    ↓
Caddy Reverse Proxy (SSL termination)
    ↓ HTTP (internal)
Kong API Gateway (localhost:8000)
    ↓
Supabase Services (Docker internal network)
    ├── PostgreSQL (database)
    ├── GoTrue (auth)
    ├── PostgREST (REST API)
    ├── Realtime (websockets)
    ├── Storage (file uploads)
    ├── Studio (admin UI)
    └── Analytics, Meta, Vector, Functions
```

**Domain:** `supabase.edwardstech.dev`

**Target:** Proxmox VM running Ubuntu Server 22.04 LTS with Docker

**Network:** All services communicate via Docker internal networking. Only Caddy exposes ports 80/443 to the host.

## Prerequisites

Before deploying Supabase to production, ensure you have:

### Infrastructure
- [ ] Proxmox server with available resources (8GB+ RAM, 4+ cores recommended)
- [ ] Ubuntu Server 22.04 LTS VM created (see Plan 04-02)
- [ ] Separate storage volume mounted to `/opt` for Docker data
- [ ] Docker Engine installed on VM (not Docker Desktop)

### Networking
- [ ] Static IP assigned to VM (e.g., 192.168.0.x)
- [ ] DNS A record configured: `supabase.edwardstech.dev` → VM IP
- [ ] Firewall ports 80/443 open for Let's Encrypt certificate issuance
- [ ] Domain verification: `dig supabase.edwardstech.dev` returns correct IP

### Configuration
- [ ] Google OAuth credentials created (from Phase 3)
  - Client ID and Secret
  - Authorized redirect URI: `https://supabase.edwardstech.dev/auth/v1/callback`
- [ ] Production secrets generated (use `./generate-secrets.sh`)
- [ ] `.env` file created from `.env.template` with all secrets filled in

### Optional
- [ ] SMTP credentials for email-based authentication (SendGrid, Gmail, etc.)
- [ ] Backup destination configured (TrueNAS NFS share or S3-compatible storage)

## Deployment Steps

This is a high-level overview. Detailed instructions are provided in subsequent phase plans.

### Phase 4: Production Infrastructure

1. **Create Proxmox VM** (Plan 04-02)
   - [ ] Provision Ubuntu Server 22.04 LTS VM
   - [ ] Configure storage (OS disk + Docker data disk)
   - [ ] Install Docker Engine
   - [ ] Set up networking and static IP

2. **Generate Secrets and Configure Environment** (Plan 04-03)
   - [ ] Run `./generate-secrets.sh` to generate all secrets
   - [ ] Create `.env` from `.env.template`
   - [ ] Copy generated secrets to `.env`
   - [ ] Generate JWT API keys (ANON_KEY, SERVICE_ROLE_KEY)
   - [ ] Set domain URLs (API_EXTERNAL_URL, SUPABASE_PUBLIC_URL, SITE_URL)
   - [ ] Configure Google OAuth credentials
   - [ ] Review and configure SMTP settings (optional)

3. **Deploy Supabase Stack** (Plan 04-04)
   - [ ] Clone official Supabase Docker repository
   - [ ] Copy docker-compose.yml to `/opt/supabase/`
   - [ ] Copy `.env` to `/opt/supabase/.env`
   - [ ] Pull Docker images: `docker compose pull`
   - [ ] Start services: `docker compose up -d`
   - [ ] Verify all services healthy: `docker compose ps`
   - [ ] Wait 30-60 seconds for all health checks to pass

4. **Configure DNS and Deploy Caddy Reverse Proxy** (Plan 04-04)
   - [ ] Configure DNS for supabase.edwardstech.dev
   - [ ] Deploy Caddy reverse proxy
   - [ ] Verify SSL certificate is issued
   - [ ] Test HTTPS access: `https://supabase.edwardstech.dev`
   - [ ] Access Supabase Studio and verify OAuth login

5. **Configure Backup Automation** (Plan 04-05)
   - [ ] Deploy PostgreSQL backup container
   - [ ] Configure backup schedule (daily at 2 AM)
   - [ ] Set backup retention policy (7 days)
   - [ ] Configure backup destination (local or NFS mount)
   - [ ] Test backup and restore procedures

6. **Apply Migrations and Configure Auth** (Plan 04-06)
   - [ ] Mount migrations directory to Supabase
   - [ ] Apply database migrations
   - [ ] Configure Auth Hooks (custom_access_token_hook)
   - [ ] Assign admin role to your Google account
   - [ ] Test admin dashboard access

7. **Verify Production System** (Plan 04-07)
   - [ ] Verify OAuth login flow (Google)
   - [ ] Test API access with ANON_KEY
   - [ ] Verify RLS policies work correctly
   - [ ] Test order creation and retrieval
   - [ ] Verify email functionality (if SMTP configured)
   - [ ] Load test with expected traffic

## Deployment Commands

After VM setup and .env configuration, deploy Supabase:

```bash
# SSH into VM
ssh <user>@<VM_IP>

# Copy production files to VM (from local machine)
scp -r production/* <user>@<VM_IP>:/opt/supabase/

# On the VM:
cd /opt/supabase

# Verify environment configuration
./deploy.sh env-check

# Start all services
./deploy.sh start

# Check status
./deploy.sh status

# View logs
./deploy.sh logs
```

### Available Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh start` | Start all Supabase services |
| `./deploy.sh stop` | Stop all services |
| `./deploy.sh restart` | Stop and start services |
| `./deploy.sh pull` | Pull latest Docker images |
| `./deploy.sh update` | Pull images and restart (causes downtime) |
| `./deploy.sh logs` | Follow service logs |
| `./deploy.sh status` | Show service status |
| `./deploy.sh env-check` | Verify .env configuration |

### First-Time Setup

1. Copy .env.template to .env
2. Run `./generate-secrets.sh` and copy secrets to .env
3. Generate ANON_KEY and SERVICE_ROLE_KEY (see below)
4. Configure Google OAuth credentials
5. Run `./deploy.sh start`

### Generating API Keys

ANON_KEY and SERVICE_ROLE_KEY are JWTs signed with your JWT_SECRET.

Option 1: Use Supabase JWT Generator
- Visit: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
- Enter your JWT_SECRET
- Copy generated keys

Option 2: Use the Supabase CLI (requires Node.js)
```bash
npx supabase gen keys --jwt-secret <your-jwt-secret>
```

## Reverse Proxy (Caddy)

Caddy handles SSL termination and proxies traffic to Supabase services.

### How It Works

```
Internet (HTTPS :443)
        ↓
    Caddy (SSL termination)
        ↓ HTTP
    Kong (:8000, internal network)
        ↓
    Supabase Services
```

Caddy uses Docker labels to discover routing configuration:
- Labels on Kong container → supabase.edwardstech.dev
- Labels on Studio container → studio.edwardstech.dev (optional)

### Deploy Caddy

```bash
# On the VM, after Supabase is running:
cd /opt/supabase

# Start Caddy (will auto-request SSL certificates)
docker compose -f docker-compose.caddy.yml up -d

# Check logs for certificate status
docker compose -f docker-compose.caddy.yml logs -f
```

### SSL Certificate

Caddy automatically:
1. Requests Let's Encrypt certificate on first start
2. Renews certificate before expiration
3. Handles OCSP stapling

**Requirements for certificate issuance:**
- DNS must point supabase.edwardstech.dev to VM's public IP
- Port 80 must be accessible (ACME HTTP challenge)
- Port 443 for HTTPS traffic

### DNS Configuration

Before starting Caddy, configure DNS:

1. In Cloudflare (or your DNS provider):
   - Add A record: `supabase.edwardstech.dev` → `<VM_IP>`
   - Add A record: `studio.edwardstech.dev` → `<VM_IP>` (optional)

2. If using Cloudflare proxy (orange cloud):
   - Caddy will still get certificates (Cloudflare handles external SSL)
   - Set SSL mode to "Full (strict)" in Cloudflare

3. If NOT using Cloudflare proxy (grey cloud / DNS only):
   - Caddy handles SSL directly with Let's Encrypt
   - Ensure ports 80/443 are forwarded to VM

### Troubleshooting

**Certificate not issued:**
```bash
# Check Caddy logs
docker logs caddy

# Common issues:
# - DNS not propagated (wait or check with dig)
# - Port 80 blocked (firewall/router)
# - Rate limited (Let's Encrypt limits)
```

**Services not discovered:**
```bash
# Verify Supabase network exists
docker network ls | grep supabase

# Check Kong labels
docker inspect kong | grep -A 10 Labels
```

## File Structure

```
production/
├── .env.template              # Configuration template
├── .env                       # Actual config (gitignored, on VM only)
├── generate-secrets.sh        # Secret generation script
├── docker-compose.override.yml # Caddy labels and networking
├── docker-compose.caddy.yml   # Caddy reverse proxy deployment
├── Caddyfile                  # Backup static Caddy configuration
├── deploy.sh                  # Deployment management script
└── README.md                  # This file
```

**After deployment:**

```
/opt/supabase/            # On production VM
├── docker-compose.yml
├── .env
├── volumes/              # Docker volumes (database, storage, logs)
│   ├── db/
│   ├── storage/
│   └── logs/
└── migrations/           # Mounted from git repository
    └── supabase/migrations/
```

## Environment Parity

Maintaining consistency between local development (Supabase CLI) and production (Docker Compose):

### Local Development (Supabase CLI)
- Configuration: `supabase/config.toml`
- Database: Local PostgreSQL via Docker
- Migrations: `supabase/migrations/` (tracked in git)
- Start command: `npx supabase start`
- Studio access: `http://127.0.0.1:54323`

### Production (Docker Compose)
- Configuration: `production/.env`
- Database: PostgreSQL in Docker Compose stack
- Migrations: Same `supabase/migrations/` (mounted volume)
- Start command: `docker compose up -d`
- Studio access: `https://supabase.edwardstech.dev`

### Alignment Strategy

| Aspect | Local | Production | Parity Method |
|--------|-------|------------|---------------|
| Schema | `supabase/migrations/` | Mounted volume | Same migration files applied to both |
| Auth providers | `config.toml` [auth.external] | `.env` GOTRUE_EXTERNAL_* | Document setup in both environments |
| JWT secret | Auto-generated by CLI | `.env` JWT_SECRET | **Different** - separate environments |
| API keys | Auto-generated by CLI | `.env` ANON_KEY / SERVICE_ROLE_KEY | **Different** - separate keys per environment |
| Database version | `config.toml` major_version | Docker image tag | Pin to same PostgreSQL version |
| Auth hooks | Registered in Studio | Registered in Studio | Manual registration in both |
| OAuth apps | Separate Google OAuth app | Separate Google OAuth app | **Different** - separate apps for local vs prod |

**Key principle:** Schema and migrations are identical. Secrets and OAuth are environment-specific.

## Maintenance

### Updating Supabase

```bash
# On production VM
cd /opt/supabase

# Pull latest images
docker compose pull

# Stop and restart services (causes 30-60 second downtime)
docker compose down
docker compose up -d

# Verify all services healthy
docker compose ps
```

**Note:** Updates are not zero-downtime. Schedule during maintenance windows.

### Backup Verification

```bash
# Check backup logs
docker logs supabase-backup

# List recent backups
ls -lh /opt/backups/postgres/

# Test restore (on staging/test environment)
gunzip -c backup-20260129-020000.sql.gz \
  | docker compose run --rm db psql -U postgres postgres
```

### Log Access

```bash
# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f kong
docker compose logs -f auth
docker compose logs -f db

# View last 100 lines
docker compose logs --tail=100 kong
```

### Health Monitoring

```bash
# Check all services status
docker compose ps

# Restart unhealthy service
docker compose restart kong

# Full restart
docker compose restart
```

## Security Considerations

### Secrets Management
- **Never commit `.env` to git** - It contains production secrets
- Generate all secrets before first start
- Do not regenerate secrets after first start (breaks existing tokens)
- Use strong, cryptographically secure secrets (via `generate-secrets.sh`)

### Network Security
- All Supabase services run on internal Docker network (not exposed to host)
- Only Caddy exposes ports 80/443 to host
- Kong API Gateway provides additional security layer
- Consider Tailscale for remote admin access (avoids exposing Studio publicly)

### Database Security
- PostgreSQL is not exposed to host (only accessible via Docker network)
- Service role key has full admin access - protect carefully
- Enable RLS policies on all tables before production
- Verify RLS policies in Supabase Studio (shield icon)

### OAuth Security
- Use separate Google OAuth apps for local vs production
- Verify authorized redirect URIs match exactly
- Rotate OAuth secrets periodically

### Backup Security
- Store backups on separate storage (not same VM)
- Encrypt backups if storing offsite
- Test restore procedures regularly
- Set appropriate retention policies

## Troubleshooting

### Services Won't Start
- Check logs: `docker compose logs`
- Verify `.env` has all required values
- Ensure secrets were generated correctly
- Check disk space: `df -h /opt`

### SSL Certificate Issues
- Verify DNS points to correct IP: `dig supabase.edwardstech.dev`
- Check Caddy logs: `docker logs caddy`
- Ensure ports 80/443 are open
- Wait 60 seconds for Let's Encrypt validation

### OAuth Login Fails
- Verify Google OAuth redirect URI matches exactly
- Check Auth logs: `docker compose logs auth`
- Verify GOTRUE_EXTERNAL_GOOGLE_* variables in `.env`
- Test with Studio UI first: `https://supabase.edwardstech.dev`

### Database Connection Errors
- Verify POSTGRES_PASSWORD matches between services
- Check database logs: `docker compose logs db`
- Ensure database is healthy: `docker compose ps`
- Check migrations applied correctly

### API Returns 401/403
- Verify ANON_KEY is correct and signed with JWT_SECRET
- Check JWT_SECRET matches between auth and database
- Verify RLS policies allow the operation
- Test with service role key to isolate RLS vs auth issues

## Next Steps

After completing Phase 4:

1. **Phase 5: Deployment Reconfiguration**
   - Containerize Express backend
   - Deploy backend to Proxmox VM
   - Reconfigure frontend for production Supabase
   - Deploy frontend-only to Pi k3s cluster
   - Configure GitOps/Flux for automated deployments

2. **Production Validation**
   - Test full checkout flow (guest and authenticated)
   - Verify Stripe webhooks
   - Test email notifications
   - Load test system with expected traffic
   - Document any issues for post-launch fixes

3. **Monitoring and Observability**
   - Set up Prometheus for metrics
   - Configure Grafana dashboards
   - Set up alerts for service failures
   - Monitor backup success/failure

## Resources

- [Supabase Self-Hosting Documentation](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker Compose Guide](https://supabase.com/docs/guides/self-hosting/docker)
- [Official Supabase Docker Repository](https://github.com/supabase/supabase/tree/master/docker)
- [Caddy Docker Proxy](https://github.com/lucaslorentz/caddy-docker-proxy)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)

---

**Last updated:** 2026-01-29
**Phase:** 4 - Production Infrastructure
**Plan:** 04-01
