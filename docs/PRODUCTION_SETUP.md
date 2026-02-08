# Production Setup Guide

Complete guide for setting up the production Supabase deployment.

## Prerequisites

Before starting, ensure you have:
- [ ] Proxmox VM created and configured (see `docs/PROXMOX_VM_SETUP.md`)
- [ ] Docker installed and running on VM
- [ ] Supabase files in `/opt/supabase/`
- [ ] Production files copied from `production/` directory
- [ ] Google Cloud project for OAuth

## Quick Start

If all prerequisites are met:

```bash
# 1. SSH into VM
ssh user@<VM_IP>

# 2. Generate and configure secrets
cd /opt/supabase
./generate-secrets.sh > secrets.txt
# Copy secrets to .env

# 3. Configure .env
cp .env.template .env
nano .env  # Edit with generated secrets and URLs

# 4. Configure Google OAuth (see OAuth section below)

# 5. Deploy services
./deploy.sh start

# 6. Deploy Caddy
docker compose -f docker-compose.caddy.yml up -d

# 7. Apply migrations
./apply-migrations.sh apply-all

# 8. Enable Auth Hook (see Auth Hook section below)

# 9. Verify
curl https://supabase.edwardstech.dev/rest/v1/
```

## Step-by-Step Configuration

### 1. Generate Secrets

```bash
cd /opt/supabase
./generate-secrets.sh
```

Copy the output to a secure location. You'll need:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `SECRET_KEY_BASE`
- `VAULT_ENC_KEY`
- `LOGFLARE_*` tokens

### 2. Generate API Keys

ANON_KEY and SERVICE_ROLE_KEY are JWTs signed with your JWT_SECRET.

**Option A: Online Generator**
1. Go to: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
2. Enter your JWT_SECRET
3. Copy the generated ANON_KEY and SERVICE_ROLE_KEY

**Option B: Using Supabase CLI (requires Node.js)**
```bash
npx supabase gen keys --jwt-secret <your-jwt-secret>
```

### 3. Configure .env

Copy the template and edit:

```bash
cp .env.template .env
nano .env
```

Required fields:
```bash
# Secrets (from step 1 and 2)
POSTGRES_PASSWORD=<generated>
JWT_SECRET=<generated>
ANON_KEY=<generated>
SERVICE_ROLE_KEY=<generated>
SECRET_KEY_BASE=<generated>
VAULT_ENC_KEY=<generated>

# URLs (for edwardstech.dev)
SUPABASE_PUBLIC_URL=https://supabase.edwardstech.dev
API_EXTERNAL_URL=https://supabase.edwardstech.dev
SITE_URL=https://www.edwardstech.dev

# OAuth (from Google Cloud Console)
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<your-client-id>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<your-client-secret>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://supabase.edwardstech.dev/auth/v1/callback
```

### 4. Configure DNS

Before Caddy can get SSL certificates, DNS must be configured.

**In Cloudflare (or your DNS provider):**

1. Add A record:
   - Type: A
   - Name: supabase
   - Content: <VM_IP>
   - Proxy status: DNS only (grey cloud) OR Proxied (orange cloud)

2. (Optional) Add A record for Studio:
   - Type: A
   - Name: studio
   - Content: <VM_IP>

**If using Cloudflare Proxy (orange cloud):**
- Set SSL/TLS mode to "Full (strict)"
- Caddy will still get certificates (for origin connection)

**Verify DNS:**
```bash
dig supabase.edwardstech.dev
# Should return your VM's IP
```

### 5. Configure Google OAuth

**Create Production OAuth Credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new one for production)
3. Navigate to: APIs & Services → Credentials
4. Click: Create Credentials → OAuth client ID
5. Application type: Web application
6. Name: Edwards Engineering Production
7. Authorized JavaScript origins:
   - `https://www.edwardstech.dev`
   - `https://supabase.edwardstech.dev`
8. Authorized redirect URIs:
   - `https://supabase.edwardstech.dev/auth/v1/callback`
9. Click Create and copy Client ID and Secret

**Add to .env:**
```bash
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOTRUE_EXTERNAL_GOOGLE_SECRET=<client-secret>
```

### 6. Deploy Services

```bash
# Verify environment
./deploy.sh env-check

# Start Supabase
./deploy.sh start

# Wait for services (30-60 seconds)
./deploy.sh status

# Start Caddy (after DNS is configured)
docker compose -f docker-compose.caddy.yml up -d

# Check Caddy logs for certificate status
docker logs caddy
```

### 7. Apply Migrations

```bash
# Check migration status
./apply-migrations.sh status

# Apply all migrations
./apply-migrations.sh apply-all
```

### 8. Enable Auth Hook

The custom_access_token_hook (for role injection) must be registered manually in Supabase Studio.

1. Access Studio at: https://studio.edwardstech.dev (or via Supabase API if Studio is disabled)
2. Navigate to: Authentication → Hooks
3. Enable: Custom Access Token
4. Select function: `public.custom_access_token_hook`
5. Save

**Alternative via SQL:**
```sql
-- Run in Supabase SQL Editor or via psql
UPDATE auth.hooks
SET enabled = true
WHERE hook_name = 'custom_access_token_hook';
```

### 9. Create Admin User

After first login via Google OAuth, assign admin role:

```sql
-- In Supabase Studio SQL Editor
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-admin-email@gmail.com';
```

## Verification Checklist

After setup, verify:

- [ ] `curl https://supabase.edwardstech.dev/rest/v1/` returns empty array or data
- [ ] SSL certificate is valid (check browser padlock)
- [ ] Google OAuth login works from frontend
- [ ] Admin can access dashboard
- [ ] Database tables exist (check via Studio)
- [ ] Backup service is running: `docker ps | grep backup`

## Environment Parity

### Local vs Production Differences

| Aspect | Local (CLI) | Production (Docker) |
|--------|-------------|---------------------|
| Start command | `npx supabase start` | `./deploy.sh start` |
| URL | `http://localhost:54321` | `https://supabase.edwardstech.dev` |
| Studio | `http://localhost:54323` | `https://studio.edwardstech.dev` |
| Migrations | Auto-applied on start | Manual: `./apply-migrations.sh` |
| Auth Hook | Via Studio UI | Via Studio UI |
| OAuth | Separate dev credentials | Production credentials |

### Sharing Configuration

To keep local and production aligned:
- Migrations: Same SQL files applied to both
- Schema: Track in git, apply to both environments
- Auth hooks: Must be registered separately in each environment

## Troubleshooting

### Services Won't Start

```bash
# Check logs
./deploy.sh logs

# Common issues:
# - .env missing required values
# - Port conflicts
# - Docker network issues
```

### SSL Certificate Not Issued

```bash
# Check Caddy logs
docker logs caddy

# Common issues:
# - DNS not propagated (wait or check with dig)
# - Port 80 blocked
# - Rate limited by Let's Encrypt
```

### OAuth Not Working

- Verify redirect URI matches EXACTLY (including https)
- Check SITE_URL and API_EXTERNAL_URL in .env
- Verify Google OAuth credentials are for production (not local)

### Database Connection Issues

```bash
# Test connection
docker exec supabase-db psql -U postgres -c "SELECT 1"

# Check logs
docker logs supabase-db
```
