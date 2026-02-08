#!/bin/bash

# =============================================================================
# Supabase Production Secrets Generator
# =============================================================================
# This script generates cryptographically secure secrets for Supabase production
# deployment. Copy the output to your .env file.
#
# WARNING: DO NOT regenerate secrets after first start!
# Regenerating secrets will invalidate all existing tokens and sessions.
#
# Usage: ./generate-secrets.sh
# =============================================================================

set -e

echo "# =============================================================================
# Generated Supabase Production Secrets
# =============================================================================
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
#
# IMPORTANT: Copy these values to your .env file BEFORE first docker compose up
# DO NOT regenerate after first start - will break existing tokens!
# =============================================================================
"

echo "############"
echo "# Core Secrets"
echo "############"
echo ""

# PostgreSQL password (alphanumeric only, no special chars to avoid escaping issues)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""

# JWT secret for signing tokens
JWT_SECRET=$(openssl rand -base64 48)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Secret key base for Phoenix services
SECRET_KEY_BASE=$(openssl rand -base64 48)
echo "SECRET_KEY_BASE=$SECRET_KEY_BASE"
echo ""

# Vault encryption key (exactly 32 characters hex)
VAULT_ENC_KEY=$(openssl rand -hex 16)
echo "VAULT_ENC_KEY=$VAULT_ENC_KEY"
echo ""

# Logflare tokens
LOGFLARE_PUBLIC=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
LOGFLARE_PRIVATE=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo "LOGFLARE_PUBLIC_ACCESS_TOKEN=$LOGFLARE_PUBLIC"
echo "LOGFLARE_PRIVATE_ACCESS_TOKEN=$LOGFLARE_PRIVATE"
echo ""

echo "############"
echo "# JWT API Keys"
echo "############"
echo "# These require the JWT_SECRET to sign, so they must be generated AFTER"
echo "# you set JWT_SECRET in your .env file."
echo "#"
echo "# Option 1: Use Supabase JWT generator"
echo "#   https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys"
echo "#"
echo "# Option 2: Use online JWT generator"
echo "#   https://jwt.io/"
echo "#   Algorithm: HS256"
echo "#   Secret: [your JWT_SECRET from above]"
echo "#"
echo "# ANON_KEY payload:"
echo "#   {"
echo "#     \"role\": \"anon\","
echo "#     \"iss\": \"supabase\","
echo "#     \"iat\": $(date +%s),"
echo "#     \"exp\": $(( $(date +%s) + 315360000 ))"
echo "#   }"
echo "#"
echo "# SERVICE_ROLE_KEY payload:"
echo "#   {"
echo "#     \"role\": \"service_role\","
echo "#     \"iss\": \"supabase\","
echo "#     \"iat\": $(date +%s),"
echo "#     \"exp\": $(( $(date +%s) + 315360000 ))"
echo "#   }"
echo ""
echo "ANON_KEY=[generate with JWT_SECRET]"
echo "SERVICE_ROLE_KEY=[generate with JWT_SECRET]"
echo ""

echo "# =============================================================================
# Next Steps
# =============================================================================
# 1. Copy the secrets above to production/.env
# 2. Generate ANON_KEY and SERVICE_ROLE_KEY using the JWT_SECRET:
#    - Visit https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
#    - Or use jwt.io with HS256 algorithm and the payloads shown above
# 3. Set your domain URLs in .env:
#    - API_EXTERNAL_URL
#    - SUPABASE_PUBLIC_URL
#    - SITE_URL
# 4. Configure Google OAuth credentials
# 5. Deploy: docker compose up -d
# =============================================================================
"
