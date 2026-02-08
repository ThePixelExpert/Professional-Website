# Phase 2: Schema Design & Backend Refactor - Research

**Researched:** 2026-01-28
**Domain:** Supabase backend migration, PostgreSQL schema management
**Confidence:** HIGH

## Summary

This research investigates the migration from raw `pg` (node-postgres) to Supabase client (`@supabase/supabase-js`) while preserving existing functionality. The standard approach involves using Supabase CLI for local development, creating SQL migrations tracked in git, and replacing direct SQL queries with either the supabase-js query builder or RPC functions for complex operations.

Supabase fundamentally changes the data access pattern from raw SQL connection pooling to a PostgREST API layer. The existing backend uses 4 tables (orders, admin_users, customers, products) with UUID primary keys, JSONB columns, and automated timestamp triggers - all of which are well-supported patterns in Supabase.

**Critical insight:** For backend services that need full database access (bypassing Row Level Security), you MUST use the service role key, not the anon key. The service role key should ONLY be used server-side, never in client code.

**Primary recommendation:** Use Supabase CLI migrations for schema management, supabase-js query builder for simple CRUD operations, and PostgreSQL RPC functions (called via `supabase.rpc()`) for complex multi-table operations that require raw SQL.

## Standard Stack

The established libraries/tools for Supabase backend development:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | v2.93.2+ | Supabase JavaScript client | Official client library, type-safe, works server-side and client-side |
| Supabase CLI | v1.8.1+ | Local development & migrations | Official tool for schema management, type generation, local Supabase stack |
| PostgreSQL | 15+ | Database engine | Supabase runs on Postgres, full SQL support via migrations and RPC |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres.js | Latest | Direct Postgres client | Optional - when you need raw SQL queries without PostgREST layer |
| type-fest | Latest | TypeScript utility types | Override generated types when needed (view nullability issues) |
| pg_jsonschema | Built-in | JSONB validation | Add JSON Schema validation to JSONB columns via check constraints |
| moddatetime | Built-in | Timestamp automation | Auto-update updated_at columns (alternative to custom triggers) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js | postgres.js or pg | Direct SQL access but loses RLS integration, realtime subscriptions, and storage capabilities |
| Supabase CLI migrations | Manual SQL scripts | Less structured, no type generation, harder to sync across environments |
| Service role key | Anon key with RLS policies | RLS is more secure but complex for backend services that need full access |

**Installation:**
```bash
# Core dependencies
npm install @supabase/supabase-js

# Development tools
npm install --save-dev supabase

# Optional: for direct SQL access
npm install postgres
```

## Architecture Patterns

### Recommended Project Structure
```
contact-backend/
├── src/
│   ├── config/
│   │   └── supabase.js         # Supabase client initialization
│   ├── services/
│   │   ├── orders.js           # Order-related business logic
│   │   ├── customers.js        # Customer operations
│   │   └── products.js         # Product management
│   ├── middleware/
│   │   └── auth.js             # Authentication/authorization
│   └── routes/
│       ├── orders.js           # Order API routes
│       └── admin.js            # Admin API routes
├── supabase/
│   ├── config.toml             # Local Supabase configuration
│   ├── migrations/
│   │   ├── 20260128000001_initial_schema.sql
│   │   ├── 20260128000002_add_triggers.sql
│   │   └── ...
│   └── seed.sql                # Development seed data
├── .env                        # Environment variables
└── package.json
```

### Pattern 1: Service Role Client Initialization
**What:** Backend services need full database access, bypassing RLS
**When to use:** Express backend, admin operations, scheduled jobs
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/api/api-keys
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // NOT anon key!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### Pattern 2: Environment-Based URL Switching
**What:** Different Supabase URLs for local vs production
**When to use:** All backend services
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/local-development/overview
const supabaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL
  : 'http://127.0.0.1:54321'

const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
```

### Pattern 3: Query Builder for Simple CRUD
**What:** Replace direct SQL with supabase-js query builder
**When to use:** Single-table operations, simple filters
**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/v1
// OLD: pg approach
const result = await pool.query(
  'SELECT * FROM orders WHERE id = $1',
  [orderId]
)

// NEW: supabase-js approach
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single()
```

### Pattern 4: RPC Functions for Complex Operations
**What:** Encapsulate complex SQL in Postgres functions, call via RPC
**When to use:** Multi-table operations, transactions, complex business logic
**Example:**
```sql
-- Source: https://supabase.com/docs/reference/javascript/rpc
-- Migration file: Create RPC function
CREATE OR REPLACE FUNCTION create_order_with_customer(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_items JSONB,
  p_total NUMERIC
) RETURNS TABLE(order_id UUID, customer_id UUID) AS $$
BEGIN
  -- Complex multi-table logic here
  -- Transactions are automatic in functions
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Call from JavaScript
const { data, error } = await supabase.rpc('create_order_with_customer', {
  p_customer_name: 'John Doe',
  p_customer_email: 'john@example.com',
  p_items: items,
  p_total: 99.99
})
```

### Pattern 5: TypeScript Type Safety
**What:** Generate types from schema, use with supabase-js
**When to use:** All TypeScript projects
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/api/rest/generating-types
// Generate types
// $ supabase gen types typescript --local > database.types.ts

import { Database } from './database.types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient<Database>(url, key)

// Type-safe queries
const { data } = await supabase
  .from('orders')  // 'orders' is type-checked
  .select('id, customer_name, total')  // columns are type-checked
  .eq('status', 'pending')  // 'status' must be valid column
```

### Pattern 6: Migration-Driven Schema Changes
**What:** All schema changes via versioned SQL migrations
**When to use:** Always - never modify schema directly in production
**Example:**
```bash
# Source: https://supabase.com/docs/guides/deployment/database-migrations
# Create migration
supabase migration new add_order_notes_column

# Edit: supabase/migrations/TIMESTAMP_add_order_notes_column.sql
# ALTER TABLE orders ADD COLUMN notes TEXT;

# Apply locally
supabase db reset

# Deploy to production
supabase db push
```

### Anti-Patterns to Avoid
- **Never use service role key in frontend code:** Service role bypasses RLS and exposes full database access
- **Don't mix direct SQL and supabase-js randomly:** Choose one primary approach (query builder or RPC) and be consistent
- **Never bypass migrations:** Making manual schema changes in dashboard leads to schema drift
- **Don't forget error handling:** Always check the `error` object returned by supabase-js
- **Avoid query builder for complex operations:** Use RPC functions instead of trying to replicate complex SQL in query builder chains

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool management | Supavisor (built-in) | Supabase provides transaction and session poolers, handles IPv4/IPv6, optimized for serverless |
| Timestamp automation | Manual updated_at in code | MODDATETIME extension or triggers | Postgres-level automation is more reliable, can't be bypassed by bad code |
| UUID generation | Application-level UUIDs | `gen_random_uuid()` default | Native Postgres function, more portable than uuid_generate_v4(), works at database level |
| JSONB validation | Application-level checks | pg_jsonschema extension | Database-level validation with check constraints prevents bad data at source |
| Environment switching | Manual URL/key management | .env + Supabase CLI config | CLI handles local vs production automatically, prevents mistakes |
| Type generation | Manual TypeScript interfaces | `supabase gen types` | Auto-generated from schema, stays in sync, includes constraints and relationships |
| Migration rollbacks | Custom down migrations | Supabase migration history + backups | Built-in migration tracking, automatic rollback strategies |

**Key insight:** Supabase provides a complete backend infrastructure. Don't recreate what's already built-in (connection pooling, type generation, migration management). Focus on business logic, not infrastructure.

## Common Pitfalls

### Pitfall 1: Using Anon Key in Backend Services
**What goes wrong:** Backend queries fail with "RLS policy violation" errors or return no data
**Why it happens:** Anon key respects Row Level Security policies. Without proper RLS setup or authenticated user session, queries are blocked or filtered
**How to avoid:** Use service role key (`SUPABASE_SERVICE_ROLE_KEY`) for backend services, configured with `autoRefreshToken: false` and `persistSession: false`
**Warning signs:**
- Queries work in Supabase Dashboard SQL editor but fail in backend code
- `data` is `null` even though records exist
- Error messages mention "policy" or "RLS"

### Pitfall 2: Forgetting to Enable RLS on New Tables
**What goes wrong:** Tables are publicly accessible, data can be read/modified without authorization
**Why it happens:** RLS is disabled by default on manually-created tables (vs Dashboard Table Editor which enables it)
**How to avoid:** Always add `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;` in migration files
**Warning signs:**
- Security audit tools flag missing RLS
- Unexpected data access in logs
- Supabase Dashboard shows red warning icons on tables

### Pitfall 3: Schema Drift Between Environments
**What goes wrong:** Production database has different schema than git migrations, deployments fail
**Why it happens:** Making "quick fixes" directly in Dashboard SQL editor bypasses migration system
**How to avoid:**
- Always create migrations: `supabase db diff -f fix_name` after Dashboard changes
- Use `supabase db push --dry-run` before deploying
- Set up CI/CD to enforce migration-only schema changes
**Warning signs:**
- `supabase db push` reports unexpected diffs
- Local dev has different column names/types than production
- Migration apply fails with "column already exists"

### Pitfall 4: Wrong Connection Pooler Mode
**What goes wrong:** Connection errors, query timeouts, or "prepared statement" errors
**Why it happens:** Transaction mode (port 6543) doesn't support prepared statements; session mode (port 5432) has connection limits
**How to avoid:**
- Use transaction mode (port 6543) for serverless/short-lived connections
- Use session mode (port 5432) for long-lived Express servers with prepared statements
- Set `connection.prepare = false` if using transaction mode with libraries that default to prepared statements
**Warning signs:**
- Error: "prepared statements are not supported"
- Connection pool exhaustion
- High latency on simple queries

### Pitfall 5: Over-Using JSONB for Structured Data
**What goes wrong:** Poor query performance, difficulty with data integrity, loss of relational benefits
**Why it happens:** JSONB seems flexible and easy, developers avoid "complex" relational design
**How to avoid:** Use JSONB only for truly unstructured/variable data (webhook payloads, metadata). For known fields, create proper columns with constraints
**Warning signs:**
- Queries that need to parse JSONB frequently (`.data->>'field'` everywhere)
- Can't use foreign keys or check constraints on nested data
- TypeScript types are `Json` instead of specific types

### Pitfall 6: Not Testing Migrations Locally First
**What goes wrong:** Migration fails in production, partial application leaves database in inconsistent state
**Why it happens:** Direct `supabase db push` to production without local testing
**How to avoid:**
1. Apply locally: `supabase db reset`
2. Test all queries still work
3. Use `--dry-run` on staging
4. Then push to production
**Warning signs:**
- Failed migrations in production logs
- Need to manually fix production database
- Downtime during deployment

### Pitfall 7: Exposing Service Role Key in Environment Variables Without Encryption
**What goes wrong:** Service role key leaks via logs, error messages, or git commits
**Why it happens:** Adding `SUPABASE_SERVICE_ROLE_KEY` to `.env` and committing it, or logging full environment
**How to avoid:**
- Add `.env` to `.gitignore` (verify it's there!)
- Use encrypted secrets in CI/CD (GitHub Secrets, AWS Secrets Manager)
- Never log full environment variables
- Rotate keys immediately if exposed
**Warning signs:**
- `.env` file in git history
- Keys visible in CI/CD logs
- Full environment dumped in error reports

## Code Examples

Verified patterns from official sources:

### Creating the Supabase Client (Backend)
```typescript
// Source: https://supabase.com/docs/guides/api/api-keys
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### Query Builder CRUD Operations
```typescript
// Source: https://supabase.com/docs/reference/javascript/v1

// CREATE
const { data, error } = await supabase
  .from('orders')
  .insert({
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    items: [{ id: 'prod-1', quantity: 2 }],
    total: 99.99
  })
  .select()
  .single()

// READ with filters
const { data, error } = await supabase
  .from('orders')
  .select('*, customers(name, email)')  // Join syntax
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .limit(50)

// UPDATE
const { data, error } = await supabase
  .from('orders')
  .update({ status: 'shipped', tracking_number: 'TRACK123' })
  .eq('id', orderId)
  .select()
  .single()

// DELETE
const { data, error } = await supabase
  .from('orders')
  .delete()
  .eq('id', orderId)

// Always handle errors
if (error) {
  console.error('Database error:', error.message)
  throw error
}
```

### Creating Migrations
```bash
# Source: https://supabase.com/docs/guides/deployment/database-migrations

# Create new migration
supabase migration new initial_schema

# Apply migrations locally
supabase db reset  # Resets and applies all migrations + seed

# Generate migration from Dashboard changes
supabase db diff -f capture_dashboard_changes

# Deploy to production
supabase db push --dry-run  # Check first
supabase db push            # Apply
```

### Migration File Example: Initial Schema
```sql
-- Source: Adapted from https://supabase.com/docs/guides/database/tables
-- File: supabase/migrations/20260128000001_initial_schema.sql

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  shipping_address TEXT,
  billing_address TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending',
  tracking_number VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (critical!)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role has full access" ON orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes for common queries
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

### Migration File Example: Timestamp Automation
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/triggers
-- File: supabase/migrations/20260128000002_add_triggers.sql

-- Enable moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Create trigger for updated_at automation
CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

### RPC Function for Complex Operations
```sql
-- Source: https://supabase.com/docs/guides/database/functions
-- File: supabase/migrations/20260128000003_rpc_functions.sql

CREATE OR REPLACE FUNCTION get_orders_with_customer_details(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  order_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  total NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  order_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.customer_name,
    o.customer_email,
    o.total,
    o.status,
    o.created_at,
    COUNT(*) OVER() as order_count
  FROM orders o
  WHERE o.customer_email IN (
    SELECT DISTINCT customer_email
    FROM orders
    WHERE created_at > NOW() - INTERVAL '1 year'
  )
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Calling RPC function
const { data, error } = await supabase.rpc('get_orders_with_customer_details', {
  p_limit: 50,
  p_offset: 0
})
```

### TypeScript Type Generation and Usage
```bash
# Source: https://supabase.com/docs/guides/api/rest/generating-types

# Generate types from local database
supabase gen types typescript --local > src/database.types.ts

# Or from remote project
supabase gen types typescript --project-id "your-project-ref" > src/database.types.ts
```

```typescript
// Source: https://supabase.com/docs/reference/javascript/typescript-support
import { Database, Tables } from './database.types'

// Use helper type for cleaner code
type Order = Tables<'orders'>

// Type-safe function
async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  return data
}

// Complex queries with type inference
import { QueryData } from '@supabase/supabase-js'

const ordersWithCustomersQuery = supabase
  .from('orders')
  .select(`
    id,
    customer_name,
    customer_email,
    total,
    items,
    created_at
  `)
  .eq('status', 'pending')

type OrdersWithCustomers = QueryData<typeof ordersWithCustomersQuery>

const { data } = await ordersWithCustomersQuery
// data is typed as OrdersWithCustomers
```

### Environment Configuration
```bash
# Source: https://supabase.com/docs/guides/local-development/overview
# .env file (DO NOT COMMIT!)

# Production
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...your-service-key
SUPABASE_ANON_KEY=eyJhb...your-anon-key

# Local development (from supabase start output)
SUPABASE_LOCAL_URL=http://127.0.0.1:54321
SUPABASE_LOCAL_SERVICE_ROLE_KEY=eyJhb...local-service-key
SUPABASE_LOCAL_ANON_KEY=eyJhb...local-anon-key

NODE_ENV=development
```

```typescript
// config/supabase.js
const isDevelopment = process.env.NODE_ENV !== 'production'

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_LOCAL_URL
  : process.env.SUPABASE_URL

const supabaseKey = isDevelopment
  ? process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw pg Pool connections | Supabase client with connection pooler | 2023-2024 | Automatic pooling, better serverless support, integrated RLS |
| Manual DDL migration scripts | Supabase CLI migrations | 2022+ | Type generation, version tracking, automatic sync |
| uuid_generate_v4() | gen_random_uuid() | 2023+ | Native Postgres, more portable, no extension needed |
| Custom JWT tokens | Supabase Auth | 2021+ | Built-in auth, RLS integration, social providers |
| Port 6543 for both modes | 6543=Transaction, 5432=Session | Feb 2025 | Clearer separation, better serverless optimization |
| Anon/Service JWT keys | Publishable/Secret API keys | 2025+ | Shorter, more secure, easier rotation |

**Deprecated/outdated:**
- **uuid-ossp extension:** Still works but `gen_random_uuid()` is preferred (native, more portable)
- **Legacy JWT-based keys (anon/service_role):** Being phased out in favor of publishable/secret keys
- **Manual connection pooling with pg:** Supavisor handles this better with built-in optimization
- **Direct database access without RLS:** Security best practice is to always enable RLS, even for service role

## Open Questions

Things that couldn't be fully resolved:

1. **Migration rollback strategy specifics**
   - What we know: Supabase tracks migrations in `supabase_migrations.schema_migrations` table
   - What's unclear: Official rollback procedure for failed migrations (manual cleanup vs automated)
   - Recommendation: Create manual rollback SQL scripts alongside migrations, test locally before production deployment

2. **Optimal RPC vs Query Builder threshold**
   - What we know: RPC is better for complex operations, query builder for simple CRUD
   - What's unclear: Exact complexity threshold (how many tables/joins before switching to RPC?)
   - Recommendation: Use query builder for single-table and simple joins (1-2 tables). Switch to RPC for 3+ tables, complex filtering, or transactions

3. **TypeScript type sync automation in monorepo**
   - What we know: Can use GitHub Actions to auto-generate types
   - What's unclear: Best practice for single-repo with both backend and potential frontend
   - Recommendation: Generate types in shared directory (e.g., `types/database.types.ts`), import from both backend and frontend

4. **Connection pooler sizing for Express backend**
   - What we know: Session mode recommended for long-lived connections
   - What's unclear: Optimal pool size configuration for typical Express workload
   - Recommendation: Start with default settings, monitor via Supabase Dashboard metrics, adjust if connection issues arise

## Sources

### Primary (HIGH confidence)
- [Supabase Database Migrations Docs](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development/overview)
- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)
- [Supabase Generating Types](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase JavaScript RPC Reference](https://supabase.com/docs/reference/javascript/rpc)
- [Supabase JSONB Guide](https://supabase.com/docs/guides/database/json)
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Postgres.js Guide](https://supabase.com/docs/guides/database/postgres-js)
- [Supabase Postgres Triggers](https://supabase.com/docs/guides/database/postgres/triggers)

### Secondary (MEDIUM confidence)
- [Supabase Best Practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices)
- [Supabase Common Mistakes (Hrekov)](https://hrekov.com/blog/supabase-common-mistakes)
- [Supabase Connection Pooling Guide (Chat2DB)](https://chat2db.ai/resources/blog/how-to-manage-supabase-migrations)
- [Using TypeScript with Supabase (Supalaunch)](https://supalaunch.com/blog/supabase-typescript-guide)
- [Supabase CLI Migration Guide (Dev.to)](https://dev.to/parth24072001/supabase-managing-database-migrations-across-multiple-environments-local-staging-production-4emg)
- [Automatically Generate Timestamps in Postgres (Jon Meyers)](https://jonmeyers.io/blog/automatically-generate-values-for-created-and-updated-columns-in-postgres/)
- [Choosing a Postgres Primary Key (Supabase Blog)](https://supabase.com/blog/choosing-a-postgres-primary-key)

### Tertiary (LOW confidence)
- Community discussions on GitHub (supabase/supabase and supabase/cli repositories)
- Developer blog posts from 2025-2026 timeframe

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All recommendations from official Supabase documentation
- Architecture patterns: HIGH - Verified with official docs and source code examples
- Pitfalls: MEDIUM to HIGH - Mix of official troubleshooting docs and community-verified issues
- Code examples: HIGH - All examples traced to official documentation or verified working patterns

**Research date:** 2026-01-28
**Valid until:** ~2026-03-28 (60 days - Supabase is stable but CLI and API evolve regularly)

**Notes:**
- Supabase CLI and API are actively developed; check for version updates
- Connection pooling strategy changed in Feb 2025 (port separation); documentation current
- TypeScript type generation is stable (v1.8.1+); syntax unlikely to change
- RLS and auth patterns are core Postgres features; highly stable
