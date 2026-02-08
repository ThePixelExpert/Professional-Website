---
phase: 05-deployment-reconfiguration
plan: 02
type: summary
status: complete
subsystem: frontend-deployment
tags: [docker, nginx, security, traefik, container-hardening]

dependencies:
  requires:
    - 05-01: Phase research documenting split architecture
    - 04-04: Traefik ingress configuration for API routing
  provides:
    - Hardened frontend container with health checks
    - Static-only nginx configuration
    - Build-time environment variable pattern
  affects:
    - 05-04: Image build and push script

tech-stack:
  added: []
  patterns:
    - Multi-stage Docker builds for frontend
    - Non-root container execution
    - Build-time ARG injection for React env vars
    - Container health checks

key-files:
  created: []
  modified:
    - nginx.conf: Removed API proxy, pure static serving
    - Dockerfile.frontend: Added security hardening and health check

decisions:
  - title: "Remove API proxying from nginx.conf"
    rationale: "Traefik ingress handles API routing in split architecture, nginx only serves static files"
    date: "2026-02-07"
  - title: "Use build-time ARGs for React environment variables"
    rationale: "Simpler than runtime injection, acceptable for separate builds per environment"
    date: "2026-02-07"
  - title: "Run frontend container as non-root nginx user"
    rationale: "Security best practice, limits container escape impact"
    date: "2026-02-07"

metrics:
  duration: "2 minutes"
  completed: "2026-02-07"
---

# Phase 05 Plan 02: Frontend Container Configuration Summary

**One-liner:** Removed API proxying from nginx, hardened Dockerfile with non-root user, health checks, and build-time ARGs

## What Was Done

### Task 1: Update nginx.conf - Remove API Proxying
**Commit:** `7575365`

Rewrote nginx.conf to remove ALL API proxy configuration. The frontend container now ONLY serves static files, with API routing delegated to Traefik ingress.

**Removed:**
- `location /api { proxy_pass http://backend-service:3001; ... }` block
- Preflight OPTIONS handler for /api requests
- All CORS headers (Access-Control-Allow-*)

**Retained:**
- Static file serving from `/usr/share/nginx/html`
- `try_files $uri $uri/ /index.html` for React Router support
- Gzip compression (text/css, application/javascript, etc.)
- Security headers (X-Frame-Options, X-XSS-Protection, CSP, etc.)
- Static asset caching (1 year expiry for JS/CSS)

**Why CORS removed:** In the split architecture, browsers request `edwardstech.dev/api` → Traefik routes to backend VM → Express backend returns CORS headers. Having nginx ALSO set CORS headers creates duplicate/conflicting headers that break browsers.

**Files modified:**
- `nginx.conf`: 7 insertions, 34 deletions

### Task 2: Update Dockerfile.frontend with Security Hardening
**Commit:** `e804a79`

Updated multi-stage Dockerfile with security best practices and build-time environment variable support.

**Build stage improvements:**
- Changed `npm install` to `npm ci` for deterministic builds from lock file
- Added ARG declarations for React environment variables:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`
  - `REACT_APP_API_URL`
  - `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- Fixed indentation on RUN npm line

**Runtime stage improvements:**
- Set ownership to nginx user: `/usr/share/nginx/html`, `/var/cache/nginx`, `/var/log/nginx`, `/var/run/nginx.pid`
- `USER nginx` directive to run as non-root
- Health check: `wget --quiet --tries=1 --spider http://localhost/` every 30s with 3s timeout
- Exposed port 80

**Security impact:**
- Non-root execution limits container escape impact
- Health check enables k3s to detect and restart unhealthy containers
- npm ci ensures reproducible builds, prevents supply chain drift

**Files modified:**
- `Dockerfile.frontend`: 28 insertions, 4 deletions

## Technical Details

### Architecture Change: From Monolithic to Split

**Before (monolithic in k8s):**
```
Browser → Traefik → Frontend Pod (nginx)
                      └→ /api requests → Backend Pod
```

**After (split architecture):**
```
Browser → Traefik → Frontend Pod (nginx, static only)
                 └→ /api requests → Backend VM (external)
```

**Why this matters:**
- Backend runs on separate VM (external to k3s cluster)
- Frontend nginx cannot resolve `backend-service:3001` (not a k8s service)
- Double-proxying (nginx → Traefik → VM) is wasteful
- Solution: Traefik directly routes `/api` to backend VM, nginx ignores API requests

### Build-Time vs Runtime Environment Variables

The plan specified build-time ARG injection (not runtime). This means:

**At build time:**
```bash
docker build \
  --build-arg REACT_APP_SUPABASE_URL=https://supabase.edwardstech.dev \
  --build-arg REACT_APP_SUPABASE_ANON_KEY=eyJ... \
  ...
```

**Result:** Variables are baked into the JavaScript bundle during `npm run build`. Different environments require separate image builds.

**Tradeoff accepted:** Simpler than runtime injection (which requires shell script to inject into JS at container startup). Can be enhanced in Phase 6 if GitOps workflows require single-image-multiple-envs pattern.

### Security Hardening Details

**Non-root execution:**
- Nginx user (UID 101) exists in nginx:alpine base image
- Changed ownership of all nginx runtime directories
- `USER nginx` ensures process runs with limited privileges
- If container is compromised, attacker has nginx user permissions (not root)

**Health check:**
- k3s polls `http://localhost/` every 30 seconds
- 3-second timeout for response
- Failure triggers container restart
- Ensures React app is reachable (not just nginx process running)

## Verification Results

All verification checks passed:

1. ✅ nginx.conf does NOT contain `proxy_pass` or `backend-service`
2. ✅ nginx.conf DOES contain `try_files` for React Router
3. ✅ nginx.conf DOES contain gzip and security headers
4. ✅ Dockerfile.frontend builds successfully with build args
5. ✅ Dockerfile.frontend includes HEALTHCHECK
6. ✅ Dockerfile.frontend includes USER nginx
7. ✅ No CORS headers in nginx.conf

Test build command:
```bash
docker build -f Dockerfile.frontend \
  --build-arg REACT_APP_SUPABASE_URL=http://test \
  --build-arg REACT_APP_SUPABASE_ANON_KEY=test \
  --build-arg REACT_APP_API_URL=http://test \
  --build-arg REACT_APP_STRIPE_PUBLISHABLE_KEY=test \
  -t test-frontend:verify .
```

**Build result:** Success (with expected eslint warnings from source code)

**Health check verification:**
```json
{
  "Test": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/ || exit 1"],
  "Interval": 30000000000,
  "Timeout": 3000000000
}
```

**User verification:** `nginx` (non-root)

## Decisions Made

### 1. Remove API Proxying from nginx.conf
**Context:** Frontend container previously proxied `/api` requests to `backend-service:3001` (k8s service).

**Problem:** In split architecture, backend is external VM, not k8s service. Nginx cannot resolve hostname.

**Decision:** Remove all API proxy configuration. Traefik ingress handles routing.

**Impact:** nginx.conf is now environment-agnostic (no backend references).

### 2. Use Build-Time ARGs for React Environment Variables
**Context:** React requires environment variables at build time (baked into bundle).

**Options considered:**
- Build-time ARGs (different image per environment)
- Runtime injection (shell script replaces placeholders at startup)

**Decision:** Build-time ARGs for Phase 5.

**Rationale:**
- Simpler implementation
- Plan explicitly recommended this approach
- Runtime injection can be added in Phase 6 if GitOps requires it

**Impact:** Production and staging require separate builds.

### 3. Run Frontend Container as Non-Root
**Context:** Container security best practice.

**Decision:** Add `USER nginx` and set ownership for nginx runtime directories.

**Rationale:** Limits impact of container escape vulnerabilities.

**Impact:** Container runs with nginx user permissions (UID 101), not root.

### 4. Add Container Health Check
**Context:** k3s needs to detect unhealthy containers.

**Decision:** Health check pings `http://localhost/` every 30s.

**Rationale:** Ensures React app is reachable, not just nginx process running.

**Impact:** k3s automatically restarts containers that fail health check.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Unblocked for Phase 5 Continuation

**Plan 05-03 (Backend reconfiguration):** Can proceed - frontend changes complete.

**Plan 05-04 (Build and push script):** Can proceed - Dockerfile.frontend ready for CI/CD.

### Considerations for Plan 05-04

The build script must:
1. Pass `--build-arg` flags for all 4 REACT_APP_ variables
2. Read values from .env or CI/CD secrets
3. Handle missing REACT_APP_STRIPE_PUBLISHABLE_KEY gracefully (optional for MVP)

Example:
```bash
docker build -f Dockerfile.frontend \
  --build-arg REACT_APP_SUPABASE_URL="${REACT_APP_SUPABASE_URL}" \
  --build-arg REACT_APP_SUPABASE_ANON_KEY="${REACT_APP_SUPABASE_ANON_KEY}" \
  --build-arg REACT_APP_API_URL="${REACT_APP_API_URL}" \
  --build-arg REACT_APP_STRIPE_PUBLISHABLE_KEY="${REACT_APP_STRIPE_PUBLISHABLE_KEY:-''}" \
  -t "${IMAGE_TAG}" .
```

### Dependencies Satisfied

- ✅ Phase 4 complete (Traefik ingress configured)
- ✅ Plan 05-01 complete (research documented split architecture)
- ✅ nginx.conf cleaned (no backend references)
- ✅ Dockerfile.frontend hardened (security + health)

### Known Gaps

**Missing from .env.template:** `REACT_APP_STRIPE_PUBLISHABLE_KEY` not documented in template. Should be added in Plan 05-04 or separate maintenance task.

**Current .env.template variables:**
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- REACT_APP_API_URL
- ~~REACT_APP_STRIPE_PUBLISHABLE_KEY~~ (missing)

**Impact:** Build script can work without it (Stripe optional for MVP), but should be documented for future payment integration.

## Testing Notes

### Local Testing (Post-Phase 5)

After Plan 05-04 (build script) completes:

1. Build image with local env vars:
```bash
./scripts/build-and-push.sh frontend --no-push
```

2. Run container locally:
```bash
docker run -d -p 8080:80 --name test-frontend [IMAGE_TAG]
```

3. Verify:
- Visit http://localhost:8080
- React app loads
- No console errors about missing env vars
- Health check passes: `docker inspect test-frontend | jq '.[0].State.Health'`

4. Clean up:
```bash
docker stop test-frontend && docker rm test-frontend
```

### Production Testing (Phase 6)

After deploying to k3s:
1. Check pod logs: `kubectl logs -l app=frontend`
2. Check health: `kubectl describe pod [frontend-pod]` (look for readiness probe)
3. Test routing: `curl https://edwardstech.dev` (should return HTML)
4. Test API routing: `curl https://edwardstech.dev/api/health` (should hit backend, not 404)

## Summary

Phase 05 Plan 02 successfully updated the frontend container for the split architecture. Nginx now serves ONLY static files, with API routing delegated to Traefik. The Dockerfile is hardened with non-root execution, health checks, and build-time environment variable support.

**Key outcomes:**
- Nginx config cleaned of API proxy logic (34 lines removed)
- Dockerfile enhanced with security hardening (28 lines added)
- Frontend container ready for k3s deployment with health monitoring
- Build-time ARG pattern established for environment variables

**Ready for:** Plan 05-03 (backend reconfiguration) and Plan 05-04 (build script).
