# Supabase Migration Guide

This document describes how to migrate the Edwards Engineering backend from direct PostgreSQL to Supabase.

## Why Supabase?

We migrated from in-cluster PostgreSQL to Supabase hosted on TrueNAS Scale for:

1. **Better Security Isolation** - Database runs on a separate machine with dedicated resources
2. **Built-in Features** - Supabase provides authentication, real-time subscriptions, and a web-based Studio UI
3. **Row Level Security (RLS)** - Fine-grained access control at the database level
4. **Backup Management** - TrueNAS provides enterprise-grade backup and snapshot capabilities
5. **Easier Administration** - Supabase Studio provides a user-friendly interface for database management

## Setting Up Supabase on TrueNAS Scale

### Prerequisites

- TrueNAS Scale with Docker/Docker Compose support
- Minimum 4GB RAM allocated for Supabase services
- Network access from Kubernetes cluster to TrueNAS (port 8000 for API, 5432 for PostgreSQL)

### Installation Steps

1. **Create a directory for Supabase:**
   ```bash
   mkdir -p /mnt/tank/supabase
   cd /mnt/tank/supabase
   ```

2. **Download the Supabase Docker Compose file:**
   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml
   curl -o .env.example https://raw.githubusercontent.com/supabase/supabase/master/docker/.env.example
   cp .env.example .env
   ```

3. **Generate JWT keys** (see section below)

4. **Configure the `.env` file** with your settings:
   ```env
   POSTGRES_PASSWORD=your-secure-postgres-password
   JWT_SECRET=your-jwt-secret-at-least-32-characters
   ANON_KEY=your-generated-anon-key
   SERVICE_ROLE_KEY=your-generated-service-role-key
   SITE_URL=http://192.168.0.50:8000
   API_EXTERNAL_URL=http://192.168.0.50:8000
   ```

5. **Start Supabase:**
   ```bash
   docker-compose up -d
   ```

6. **Access Supabase Studio:**
   Open `http://192.168.0.50:8000` in your browser

## Generating Supabase JWT Keys

Supabase uses JWT tokens for authentication. You need to generate the following keys:

### Using Node.js

```javascript
const jwt = require('jsonwebtoken');

// Generate a secure JWT secret (at least 32 characters)
const JWT_SECRET = require('crypto').randomBytes(32).toString('hex');

// Generate ANON_KEY (public, limited access)
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};
const ANON_KEY = jwt.sign(anonPayload, JWT_SECRET);

// Generate SERVICE_ROLE_KEY (private, full access - bypasses RLS)
const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};
const SERVICE_ROLE_KEY = jwt.sign(servicePayload, JWT_SECRET);

console.log('JWT_SECRET:', JWT_SECRET);
console.log('ANON_KEY:', ANON_KEY);
console.log('SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY);
```

### Using Online Generator

You can also use the official Supabase JWT generator:
https://supabase.com/docs/guides/self-hosting#api-keys

## Running the Migration SQL

1. **Open Supabase Studio** at `http://192.168.0.50:8000`

2. **Navigate to the SQL Editor** (Database → SQL Editor)

3. **Open the migration file:**
   Copy the contents of `contact-backend/migrations/001_initial_schema.sql`

4. **Run the migration:**
   Paste the SQL into the editor and click "Run"

5. **Verify tables were created:**
   Navigate to Table Editor and confirm all tables exist:
   - `orders`
   - `admin_users`
   - `customers`
   - `products`

## Local Development Configuration

1. **Copy the environment template:**
   ```bash
   cp contact-backend/.env.template contact-backend/.env
   ```

2. **Update the Supabase configuration:**
   ```env
   SUPABASE_URL=http://192.168.0.50:8000
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **Start the development server:**
   ```bash
   cd contact-backend
   npm install
   npm run dev
   ```

## Production Kubernetes Configuration

### Update Secrets

Create or update the `backend-secrets` secret in Kubernetes:

```bash
# Base64 encode the keys
echo -n "your-anon-key" | base64
echo -n "your-service-role-key" | base64

# Apply the secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: website
type: Opaque
data:
  supabase-anon-key: <base64-encoded-anon-key>
  supabase-service-key: <base64-encoded-service-role-key>
  # ... other existing secrets
EOF
```

### Apply Deployment Changes

```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/networkpolicy.yaml
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods -n website -l app=backend

# Check logs
kubectl logs -n website -l app=backend --tail=50

# Test health endpoint
kubectl exec -n website -it <pod-name> -- curl http://localhost:3001/api/health
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

1. **Service Role Full Access** - The backend uses the service role key which bypasses RLS, allowing full CRUD operations on all tables

2. **Public Read Access for Products** - Anonymous users can read products that are `in_stock = true`

### Network Policy

The Kubernetes NetworkPolicy (`k8s/backend/networkpolicy.yaml`) restricts backend pod egress traffic to:

- **DNS (port 53)** - Required for name resolution
- **Supabase API (192.168.0.50:8000)** - Database operations
- **Supabase PostgreSQL (192.168.0.50:5432)** - Direct database access if needed
- **SMTP (port 587)** - Email sending via Gmail
- **HTTPS (port 443)** - Stripe API and other external services

All other internal network access is blocked.

### Secret Management

- **Never commit** Supabase keys to version control
- Use **Kubernetes secrets** for production deployments
- Use **SOPS** for encrypted secret management in the homelab repository
- Rotate keys periodically and after any potential exposure

## Rollback Procedure

If you need to rollback to the original PostgreSQL:

1. **Update server.js:**
   ```javascript
   const { db, initializeDatabase } = require('./database');
   ```

2. **Revert deployment.yaml:**
   Restore the original PostgreSQL environment variables

3. **Apply the changes:**
   ```bash
   kubectl apply -f k8s/backend/deployment.yaml
   ```

The original `database.js` file is preserved for this purpose.

## Troubleshooting

### Connection Issues

1. **Check Supabase is running:**
   ```bash
   curl http://192.168.0.50:8000/rest/v1/
   ```

2. **Verify environment variables:**
   ```bash
   kubectl exec -n website <pod-name> -- env | grep SUPABASE
   ```

3. **Check network connectivity:**
   ```bash
   kubectl exec -n website <pod-name> -- nc -zv 192.168.0.50 8000
   ```

### Authentication Errors

1. **Verify service role key is correct:**
   The key should start with `eyJ` (base64 encoded JWT)

2. **Check JWT expiration:**
   Decode the key at jwt.io to verify it hasn't expired

3. **Ensure RLS policies are correct:**
   Service role should bypass RLS automatically

### Table Not Found Errors

1. **Run the migration SQL:**
   Navigate to Supabase Studio → SQL Editor and run `001_initial_schema.sql`

2. **Check table ownership:**
   Ensure tables were created under the correct schema (public)
