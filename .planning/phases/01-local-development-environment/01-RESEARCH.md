# Phase 1: Local Development Environment - Research

**Researched:** 2026-01-28
**Domain:** Supabase self-hosting with Docker Compose, local development workflow
**Confidence:** HIGH

## Summary

Supabase provides two approaches for local development: the Supabase CLI (designed specifically for local development) and Docker Compose (designed for self-hosting in production). For this phase, the optimal approach is using the Supabase CLI for local development alongside Docker Compose for production self-hosting on Proxmox. This provides the best developer experience while maintaining parity with production architecture.

The Supabase CLI uses Docker under the hood but provides a streamlined development workflow with migration management, database diffing, and easy environment switching. It runs on localhost (port 54323 by default) and automatically handles service orchestration. The production deployment uses the official Supabase Docker Compose stack with 13 services including PostgreSQL 15, Kong API gateway, Auth, Storage, Realtime, and Studio dashboard.

Environment management follows a three-tier pattern: local development with CLI, staging environment (optional), and production with self-hosted Docker Compose. The Supabase JavaScript client (v2.93.2) connects to both environments using environment variables to switch between local and production URLs. Database migrations are version controlled and applied consistently across all environments.

**Primary recommendation:** Use Supabase CLI (`supabase start`) for local development and official Docker Compose stack for production self-hosting. Connect via `@supabase/supabase-js` client with environment-based URL switching.

## Standard Stack

The established tools for Supabase local development and self-hosting:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase CLI | 2.72.8 | Local development orchestration | Official tool, manages migrations, database diffing, local stack |
| @supabase/supabase-js | 2.93.2 | JavaScript client for Supabase | Official client, isomorphic (browser + Node.js), full feature support |
| Docker Compose | v2+ | Production self-hosting orchestration | Official deployment method, manages 13 services |
| PostgreSQL | 15.8.1 | Database engine | Included in Supabase stack, battle-tested version |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | Latest | Environment variable management | Node.js < 20, or explicit .env loading |
| @supabase/auth-js | Latest (included) | Authentication management | Included in supabase-js, for advanced auth |
| @supabase/realtime-js | Latest (included) | Real-time subscriptions | Included in supabase-js, for live updates |
| @supabase/storage-js | Latest (included) | File storage operations | Included in supabase-js, for file uploads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase CLI | Manual Docker Compose locally | CLI provides better DX with migrations, diffing; manual Docker Compose for production only |
| Official Docker setup | Custom PostgreSQL + auth | Official stack is comprehensive, maintained, includes Studio; custom means reinventing services |
| @supabase/supabase-js | Direct PostgreSQL client | Supabase client handles Auth, Storage, Realtime; direct pg client requires manual integration |

**Installation:**
```bash
# Supabase CLI (local development)
npm install supabase --save-dev

# Supabase JavaScript client (backend/frontend)
npm install @supabase/supabase-js

# For Node.js < 20 (optional)
npm install dotenv
```

**Docker Compose (production self-hosting):**
```bash
# Clone official repo and copy docker files
git clone --depth 1 https://github.com/supabase/supabase
cp -r supabase/docker/. ~/supabase-production/
cd ~/supabase-production
# Copy and configure .env
cp .env.example .env
# Edit .env with production secrets
docker compose pull
docker compose up -d
```

## Architecture Patterns

### Recommended Project Structure
```
professional-website/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js          # Supabase client initialization
│   │   ├── routes/                   # Express routes
│   │   └── middleware/               # Auth middleware using Supabase
│   ├── .env                          # Local: SUPABASE_URL=http://localhost:54323
│   ├── .env.production               # Production: SUPABASE_URL=https://supabase.edwardstech.dev
│   └── package.json
├── supabase/
│   ├── config.toml                   # CLI configuration
│   ├── migrations/                   # Database schema migrations (version controlled)
│   │   └── 20260128000000_initial_schema.sql
│   └── seed.sql                      # Test data for local development
└── docker-compose.yml                # For production self-hosting (on Proxmox VM)
```

### Pattern 1: Environment-Based Client Initialization
**What:** Initialize Supabase client with different URLs/keys based on NODE_ENV
**When to use:** Every Supabase client instantiation in backend/frontend
**Example:**
```javascript
// backend/src/config/supabase.js
// Source: https://supabase.com/docs/reference/javascript/initializing
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false  // For server-side: disable session persistence
  }
})
```

**Environment files:**
```bash
# .env (local development)
SUPABASE_URL=http://localhost:54323
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=<from local CLI output>

# .env.production (production)
SUPABASE_URL=https://supabase.edwardstech.dev
SUPABASE_ANON_KEY=<generated JWT from production .env>
SUPABASE_SERVICE_ROLE_KEY=<generated JWT from production .env>
```

### Pattern 2: Local Development Workflow with CLI
**What:** Use CLI commands to manage local Supabase lifecycle and migrations
**When to use:** Daily development workflow
**Example:**
```bash
# Source: https://supabase.com/docs/guides/cli/local-development

# Initialize Supabase in project (one-time)
npx supabase init

# Start local Supabase stack (runs on http://localhost:54323)
npx supabase start

# Access local Studio dashboard
# http://localhost:54323

# Create new migration
npx supabase migration new create_orders_table

# Generate migration from database changes made in Studio
npx supabase db diff -f migration_name

# Apply migrations and reset database with seed data
npx supabase db reset

# Stop local stack
npx supabase stop
```

### Pattern 3: Production Deployment with Docker Compose
**What:** Deploy full Supabase stack on Proxmox VM using Docker Compose
**When to use:** Production self-hosting setup
**Example:**
```bash
# Source: https://supabase.com/docs/guides/self-hosting/docker

# On Proxmox VM
cd /opt/supabase
cp .env.example .env

# CRITICAL: Edit .env and set all secrets
# - POSTGRES_PASSWORD (letters/numbers only to avoid URL encoding)
# - JWT_SECRET (generate: openssl rand -base64 32)
# - ANON_KEY (generate using JWT_SECRET)
# - SERVICE_ROLE_KEY (generate using JWT_SECRET)
# - DASHBOARD_USERNAME and DASHBOARD_PASSWORD

# Pull latest images
docker compose pull

# Start services
docker compose up -d

# Check service health
docker compose ps

# Access Studio dashboard
# http://proxmox-vm-ip:8000
```

### Pattern 4: Database Migration Workflow
**What:** Version control schema changes as SQL migrations, apply consistently across environments
**When to use:** Any database schema change
**Example:**
```bash
# Source: https://supabase.com/docs/guides/deployment/managing-environments

# Local: Create migration file
npx supabase migration new add_profiles_table

# Write SQL in supabase/migrations/20260128000001_add_profiles_table.sql
# CREATE TABLE profiles (
#   id UUID REFERENCES auth.users PRIMARY KEY,
#   username TEXT UNIQUE,
#   created_at TIMESTAMPTZ DEFAULT NOW()
# );

# Apply locally
npx supabase db reset

# Test changes in local environment
# Once verified, commit migration to git

# Production: Link to remote project and push migrations
npx supabase link --project-ref <production-ref>
npx supabase db push
```

### Pattern 5: Switching Between Environments
**What:** Use environment variables to switch client between local and production
**When to use:** Development, testing, CI/CD pipelines
**Example:**
```javascript
// Source: https://supabase.com/docs/guides/deployment/managing-environments

// Backend uses environment variables
// .env for local: SUPABASE_URL=http://localhost:54323
// .env.production for prod: SUPABASE_URL=https://supabase.edwardstech.dev

// In code, no changes needed - same client initialization works everywhere
import { supabase } from './config/supabase.js'

// This query works against local or production based on env vars
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'pending')
```

### Anti-Patterns to Avoid
- **Hardcoding URLs:** Never hardcode Supabase URLs/keys in code; always use environment variables
- **Skipping migrations:** Don't make schema changes directly in production Studio; always create migrations locally first
- **Using default secrets:** Never use placeholder passwords from .env.example in production; they're widely known
- **Committing .env:** Never commit .env files to git; use .env.example as template
- **Manual Docker Compose locally:** Don't use Docker Compose for local dev; CLI provides better DX with migration tooling
- **Exposing service_role_key client-side:** Never send service_role_key to frontend; it bypasses all RLS policies

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT generation for Supabase keys | Custom JWT script | Supabase CLI or online JWT generator with correct payload | Keys must have specific claims structure, expiry, signing algorithm |
| Database connection pooling | Custom pg pooling | Supavisor (included in Supabase stack) | Handles session vs transaction mode, port 5432 (session) and 6543 (pooled) |
| Migration management | Custom schema versioning | Supabase CLI migrations | Tracks timestamps, handles up/down, generates diffs, applies consistently |
| Environment variable substitution | Manual config file per environment | config.toml with env() function | Single config file, values injected from .env, less duplication |
| Authentication tokens | Custom JWT validation | Supabase Auth service + client library | Handles OAuth, MFA, token refresh, session management, RLS integration |
| Real-time database updates | Custom WebSocket server | Supabase Realtime service | Integrates with Postgres LISTEN/NOTIFY, handles subscriptions, filtering, auth |
| File storage with CDN | Custom S3 + CloudFront | Supabase Storage service | Integrates with RLS, image transformations via imgproxy, bucket policies |

**Key insight:** Supabase's Docker stack includes 13 services working together with shared authentication, RLS, and configuration. Hand-rolling any component means reimplementing complex integrations. Use the full stack and customize configuration instead.

## Common Pitfalls

### Pitfall 1: Using Default Placeholder Secrets
**What goes wrong:** Leaving default passwords from .env.example in production exposes database to known credentials
**Why it happens:** .env.example contains placeholder values; developers forget to generate real secrets
**How to avoid:**
- Generate unique secrets before first startup: `openssl rand -base64 32` for JWT_SECRET
- Use password manager or secrets management tool (Doppler, Infisical, AWS Secrets Manager)
- Document secret generation in deployment runbook
- Validate secrets are changed in deployment checklist
**Warning signs:** Log entries showing "example" or "your-super-secret" values

### Pitfall 2: Changing POSTGRES_PASSWORD After Initial Startup
**What goes wrong:** Changing database password in .env doesn't update password in running PostgreSQL; services fail with "supabase-analytics is unhealthy"
**Why it happens:** PostgreSQL password is set during initial volume creation; subsequent .env changes don't affect initialized database
**How to avoid:**
- Set correct POSTGRES_PASSWORD before first `docker compose up`
- If must change: stop stack, remove volumes (`docker compose down -v`), restart with new password
- Use letters/numbers only in password to avoid URL encoding issues
**Warning signs:** Auth service can't connect to database, analytics unhealthy, connection refused errors

### Pitfall 3: Rootless Docker Socket Location
**What goes wrong:** With rootless Docker, services fail with socket connection errors or "container supabase-vector exited (0)"
**Why it happens:** Default Docker socket path (/var/run/docker.sock) differs in rootless setup (typically /run/user/1000/docker.sock)
**How to avoid:**
- Edit .env and set `DOCKER_SOCKET_LOCATION=/run/user/1000/docker.sock`
- Verify with `echo $DOCKER_HOST` or check Docker info
- Update before first startup
**Warning signs:** Vector container exits immediately, Docker socket mount failures in logs

### Pitfall 4: Network Configuration for Dockerized Backend
**What goes wrong:** Backend running in Docker can't reach Supabase with "localhost"; connection refused errors
**Why it happens:** Localhost in container refers to container itself, not host machine or other containers
**How to avoid:**
- Use Docker service name: `SUPABASE_URL=http://supabase-kong:8000` when both in same Docker network
- Or use host.docker.internal on Docker Desktop: `SUPABASE_URL=http://host.docker.internal:54323`
- Or use VM/host IP: `SUPABASE_URL=http://192.168.0.X:54323`
- For CLI locally: `http://localhost:54323` works when backend runs on host
**Warning signs:** ECONNREFUSED, connection timeouts to localhost from container

### Pitfall 5: Node.js Session Persistence Warning
**What goes wrong:** Warning appears: "localStorage is not available. Set persistSession to false..."
**Why it happens:** Supabase client defaults to persistSession: true; Node.js/Express lacks localStorage
**How to avoid:**
- Set `persistSession: false` in client options for server-side usage
- This is expected for backends; safe to disable as sessions handled differently server-side
- Keep enabled for browser clients
**Warning signs:** Console warnings about localStorage in backend logs

### Pitfall 6: Migration Conflicts from Embedded Postgres Image
**What goes wrong:** Custom migrations conflict with schema embedded in supabase/postgres Docker image
**Why it happens:** Postgres image includes initialization migrations; custom migrations may duplicate or conflict
**How to avoid:**
- Use `supabase db pull` to capture existing schema as initial migration before creating custom migrations
- Check supabase/migrations/ for conflicts before applying new migrations
- Use `supabase db diff` to see what changed instead of writing migrations from scratch
**Warning signs:** Migration errors like "relation already exists", constraint violations during db reset

### Pitfall 7: Forgetting to Restart After Config Changes
**What goes wrong:** Changes to config.toml or .env not reflected in running services
**Why it happens:** Services read configuration at startup; changes require restart
**How to avoid:**
- CLI: `npx supabase stop && npx supabase start`
- Docker Compose: `docker compose restart` or `docker compose down && docker compose up -d`
- Document in dev workflow: "config changes require restart"
**Warning signs:** New environment variables not available, auth providers not working despite config

## Code Examples

Verified patterns from official sources:

### Express Backend with Supabase Client
```javascript
// Source: https://supabase.com/docs/reference/javascript/initializing
// backend/src/config/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// For admin operations requiring service_role_key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

### Auth Middleware for Express Routes
```javascript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
// backend/src/middleware/auth.js

import { supabase } from '../config/supabase.js'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Verify JWT with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.user = user
  next()
}
```

### Database Query with Row Level Security
```javascript
// Source: https://supabase.com/docs/reference/javascript
// backend/src/routes/orders.js

import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

router.get('/orders', requireAuth, async (req, res) => {
  // RLS policies automatically filter based on authenticated user
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      total,
      created_at,
      order_items (
        id,
        product_id,
        quantity,
        price
      )
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ orders })
})
```

### Environment-Specific Configuration Loading
```javascript
// Source: https://supabase.com/docs/guides/deployment/managing-environments
// backend/src/config/env.js

import { config } from 'dotenv'
import { resolve } from 'path'

const env = process.env.NODE_ENV || 'development'

// Load environment-specific .env file
if (env === 'production') {
  config({ path: resolve(process.cwd(), '.env.production') })
} else {
  config({ path: resolve(process.cwd(), '.env') })
}

export const CONFIG = {
  env,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  port: process.env.PORT || 3001
}
```

### Supabase CLI Initialization Script
```bash
# Source: https://supabase.com/docs/guides/cli/local-development
#!/bin/bash
# scripts/init-local-supabase.sh

# Initialize Supabase project structure
npx supabase init

# Start local Supabase (first time pulls Docker images)
npx supabase start

# Display access credentials
echo "Local Supabase started!"
echo "Studio URL: http://localhost:54323"
echo "API URL: http://localhost:54323"
echo ""
echo "Add to .env:"
npx supabase status | grep -E "(API URL|anon key|service_role key)"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Docker Compose for local dev | Supabase CLI (`supabase start`) | CLI v1.0 (2021) | Better DX with migration tooling, diffing, easier local setup |
| Direct pg client in Node.js | @supabase/supabase-js unified client | v2.0 (2022) | Single client for database, auth, storage, realtime instead of separate libraries |
| Separate projects for local/prod | Link local to prod with CLI | CLI v1.20 (2023) | Migration sync between environments, pull/push workflows |
| Manual JWT generation | Supabase generated keys | Always standard | Correct claims structure, expiry, signing |
| Manual session management | Supabase Auth auto token refresh | v2.0 (2022) | Client handles refresh automatically, seamless user experience |
| Anon/service_role keys | Publishable keys (sb_publishable_xxx) | 2026 rollout | Improved security and developer experience, migration period |

**Deprecated/outdated:**
- **Node.js 18 support**: Ended April 30, 2025. Use Node.js 20+ or stay on @supabase/supabase-js v2.78.0 for Node 18
- **Manual Kong configuration**: Early Supabase used manual Kong config; now declarative config in docker-compose.yml
- **Separate auth libraries**: Old approach used multiple packages; now unified in @supabase/supabase-js

## Open Questions

Things that couldn't be fully resolved:

1. **Proxmox VM specific configuration**
   - What we know: Supabase Docker Compose works on Proxmox VMs; use VMs not LXC containers
   - What's unclear: Specific resource allocation recommendations for 4x RPi 4 cluster
   - Recommendation: Start with minimum requirements (4GB RAM, 2 CPU, 50GB storage per Supabase docs), monitor and adjust based on production load

2. **k3s integration with Supabase**
   - What we know: Supabase Docker Compose runs on single VM, not Kubernetes
   - What's unclear: Whether to run Supabase on Proxmox VM outside k3s cluster or attempt k3s deployment
   - Recommendation: Run Supabase on dedicated Proxmox VM outside k3s cluster per user decision (SD card failure risk); k3s cluster for stateless frontend/backend only

3. **Traefik SSL with self-hosted Supabase**
   - What we know: Supabase Docker exposes Kong on port 8000/8443; Traefik can reverse proxy
   - What's unclear: Best practice for SSL termination (Traefik vs Kong) and Let's Encrypt integration
   - Recommendation: Let Traefik handle SSL termination and route to Kong :8000 (HTTP) for simplicity; verify CORS and websocket configs

4. **Migration from existing PostgreSQL to Supabase**
   - What we know: Current backend uses raw pg client; need to refactor to Supabase client
   - What's unclear: Migration path for existing data and auth (JWT vs Supabase Auth)
   - Recommendation: Use `supabase db pull` to capture current schema, migrate users to Supabase Auth with password reset flow, update all queries to use Supabase client

## Sources

### Primary (HIGH confidence)
- [Self-Hosting with Docker | Supabase Docs](https://supabase.com/docs/guides/self-hosting/docker) - Official Docker Compose setup
- [Supabase CLI | Supabase Docs](https://supabase.com/docs/guides/cli) - CLI overview and commands
- [Local Development with Supabase CLI](https://supabase.com/docs/guides/cli/local-development) - Workflow and best practices
- [JavaScript Client Initialization](https://supabase.com/docs/reference/javascript/initializing) - Client setup and configuration
- [Managing Environments | Supabase Docs](https://supabase.com/docs/guides/deployment/managing-environments) - Multi-environment patterns
- [Supabase CLI Config | Supabase Docs](https://supabase.com/docs/guides/local-development/cli/config) - config.toml structure
- [GitHub - supabase/supabase-js](https://github.com/supabase/supabase-js) - Official client repository (v2.93.2)
- [Docker Compose Official Docs - Environment Variables Best Practices](https://docs.docker.com/compose/how-tos/environment-variables/best-practices/) - Docker env patterns

### Secondary (MEDIUM confidence)
- [The Vibe Coder's Guide to Supabase Environments](https://supabase.com/blog/the-vibe-coders-guide-to-supabase-environments) - Official blog on environment management
- [Running Supabase in a Proxmox Docker VM: A Step-by-Step Guide](http://dadhacks.org/2025/08/04/running-supabase-in-a-proxmox-docker-vm-a-step-by-step-guide/) - Community guide for Proxmox deployment
- [GitHub Discussion #35616 - CLI with self-hosted Docker](https://github.com/orgs/supabase/discussions/35616) - CLI integration with Docker self-hosting
- [GitHub Discussion #20211 - Analytics unhealthy issue](https://github.com/orgs/supabase/discussions/20211) - Postgres password change pitfall

### Tertiary (LOW confidence)
- Various Medium articles on Supabase environment management - patterns confirmed with official docs
- Stack Overflow discussions on Docker networking - verified with official Docker docs
- Community blog posts on Supabase deployment - cross-referenced with official guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official CLI and client versions verified, Docker Compose is documented standard
- Architecture: HIGH - Patterns from official documentation and verified examples
- Pitfalls: MEDIUM-HIGH - Mix of official warnings and community-reported issues, all cross-referenced

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days) - Supabase has stable release cycle, CLI/client updated monthly but breaking changes rare
