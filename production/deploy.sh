#!/bin/bash
# Supabase Production Deployment Script
# Usage: ./deploy.sh [command]
# Commands:
#   start     - Start all services
#   stop      - Stop all services
#   restart   - Restart all services
#   pull      - Pull latest images
#   update    - Pull and restart (causes brief downtime)
#   logs      - Show logs
#   status    - Show service status
#   env-check - Verify environment configuration

set -e

SUPABASE_DIR="/opt/supabase"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verify environment
check_env() {
    if [ ! -f "$SUPABASE_DIR/.env" ]; then
        log_error ".env file not found at $SUPABASE_DIR/.env"
        log_info "Copy .env.template to .env and configure it first"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "your-.*-here\|<generate\|CHANGEME" "$SUPABASE_DIR/.env"; then
        log_error "Placeholder values found in .env - configure all secrets first"
        exit 1
    fi

    log_info "Environment check passed"
}

# Copy override file if not present
setup_override() {
    if [ ! -f "$SUPABASE_DIR/docker-compose.override.yml" ]; then
        log_info "Copying docker-compose.override.yml..."
        cp "$SCRIPT_DIR/docker-compose.override.yml" "$SUPABASE_DIR/"
    fi
}

# Create Caddy network if not exists
ensure_network() {
    if ! docker network inspect caddy_network >/dev/null 2>&1; then
        log_info "Creating caddy_network..."
        docker network create caddy_network
    fi
}

# Main commands
cmd_start() {
    check_env
    setup_override
    ensure_network
    cd "$SUPABASE_DIR"
    log_info "Starting Supabase services..."
    docker compose up -d
    log_info "Waiting for services to be healthy..."
    sleep 30
    docker compose ps
}

cmd_stop() {
    cd "$SUPABASE_DIR"
    log_info "Stopping Supabase services..."
    docker compose down
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_pull() {
    cd "$SUPABASE_DIR"
    log_info "Pulling latest images..."
    docker compose pull
}

cmd_update() {
    log_warn "This will cause brief service downtime!"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cmd_pull
        cmd_restart
    fi
}

cmd_logs() {
    cd "$SUPABASE_DIR"
    docker compose logs -f --tail=100
}

cmd_status() {
    cd "$SUPABASE_DIR"
    docker compose ps
}

cmd_env_check() {
    check_env
    log_info "Checking required variables..."

    source "$SUPABASE_DIR/.env"

    required_vars=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "ANON_KEY"
        "SERVICE_ROLE_KEY"
        "API_EXTERNAL_URL"
        "SUPABASE_PUBLIC_URL"
        "SITE_URL"
    )

    missing=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Missing: $var"
            missing=$((missing + 1))
        else
            log_info "Found: $var"
        fi
    done

    if [ $missing -gt 0 ]; then
        log_error "$missing required variables missing"
        exit 1
    fi

    log_info "All required variables configured!"
}

# Parse command
case "${1:-help}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    pull)    cmd_pull ;;
    update)  cmd_update ;;
    logs)    cmd_logs ;;
    status)  cmd_status ;;
    env-check) cmd_env_check ;;
    *)
        echo "Usage: $0 {start|stop|restart|pull|update|logs|status|env-check}"
        exit 1
        ;;
esac
