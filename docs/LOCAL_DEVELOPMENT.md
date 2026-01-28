# Local Development Setup

This guide explains how to set up the local development environment for Edwards Engineering website.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Docker** with Docker Compose (for Supabase CLI)
- **npm** or **yarn**

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd Professional-Website

# 2. Install dependencies
cd contact-backend
npm install

# 3. Set up environment variables
cp .env.template .env
# Edit .env if needed (defaults work for local Supabase)

# 4. Start local Supabase
cd ..
npx supabase start

# 5. Verify connection
cd contact-backend
npm run test:supabase

# 6. Start the backend
npm run dev
```

## Supabase CLI

We use the [Supabase CLI](https://supabase.com/docs/guides/cli) for local development. The CLI runs a complete Supabase stack in Docker containers.

### Installing Supabase CLI

The CLI is installed as a dev dependency:
```bash
npm install --save-dev supabase
```

### Starting Local Supabase

```bash
# From project root
npx supabase start
```

First run downloads Docker images (may take a few minutes). Subsequent starts are fast.

### Checking Status

```bash
npx supabase status
```

Shows:
- **Project URL**: http://localhost:54321 (Supabase API via Kong gateway)
- **Studio**: http://localhost:54323 (Dashboard UI)
- **DB URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Publishable** key: JWT for client-side access (anon role)
- **Secret** key: JWT for server-side admin access (service_role)

### Stopping Supabase

```bash
npx supabase stop
```

To also remove Docker volumes (reset database):
```bash
npx supabase stop --no-backup
```

## Supabase Studio

Access the local Supabase dashboard at: http://localhost:54323

Features:
- **Table Editor**: View and edit database tables
- **SQL Editor**: Run SQL queries
- **Authentication**: Manage users (Phase 3)
- **Storage**: Manage file uploads (future)

## Environment Variables

Copy `.env.template` to `.env`:
```bash
cd contact-backend
cp .env.template .env
```

### Local Development Values

For local Supabase CLI, these values are standard:

| Variable | Local Value |
|----------|-------------|
| `SUPABASE_URL` | `http://localhost:54321` |
| `SUPABASE_ANON_KEY` | Get "Publishable" key from `npx supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Get "Secret" key from `npx supabase status` |

Note: JWT keys are generated per project. Run `npx supabase status` to get your keys.

### Production Values

Production uses self-hosted Supabase on Proxmox. See deployment documentation for production environment setup.

## Running Migrations

```bash
# Apply all migrations
npx supabase db push

# Create a new migration
npx supabase migration new <migration_name>

# View migration history
npx supabase migration list
```

## Testing Supabase Connection

Verify the backend can connect to local Supabase:

```bash
cd contact-backend
npm run test:supabase
```

Expected output:
```
Testing Supabase connection...

✓ Supabase client module loaded successfully
  URL: http://localhost:54323
  Has service role: true
✓ Connected to Supabase database successfully

✓ All smoke tests passed!
```

## Troubleshooting

### Docker not running
```
Error: Cannot connect to Docker daemon
```
Solution: Start Docker Desktop or Docker daemon.

### Port conflict
```
Error: Port 54323 already in use
```
Solution: Stop other Supabase instances or change ports in `supabase/config.toml`.

### Missing environment variables
```
Error: Missing Supabase environment variables
```
Solution: Ensure `.env` file exists and contains `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### Database connection failed
```
Error: Failed to connect to Supabase
```
Solution: Run `npx supabase start` and verify with `npx supabase status`.

## Architecture Note

The Supabase CLI uses Docker Compose internally to run:
- PostgreSQL database (port 54322)
- PostgREST API (port 54323)
- GoTrue auth service
- Realtime subscriptions
- Storage service

All services are containerized and managed by the CLI. You don't need to interact with Docker directly.
