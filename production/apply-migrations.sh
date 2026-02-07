#!/bin/bash
# Apply Migrations to Production Supabase
# Usage: ./apply-migrations.sh [migration-file]
#
# Without arguments: applies all migrations in order
# With argument: applies specific migration file

set -e

MIGRATIONS_DIR="../supabase/migrations"
DB_CONTAINER="supabase-db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get script directory (for relative paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_PATH="$SCRIPT_DIR/$MIGRATIONS_DIR"

# Verify migrations directory exists
if [ ! -d "$MIGRATIONS_PATH" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_PATH"
    log_info "Ensure you're running from the production/ directory"
    exit 1
fi

# Verify db container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_error "Database container '$DB_CONTAINER' is not running"
    log_info "Start Supabase first: ./deploy.sh start"
    exit 1
fi

# Apply single migration
apply_migration() {
    local migration_file="$1"
    local filename=$(basename "$migration_file")

    log_info "Applying: $filename"

    # Execute migration
    docker exec -i $DB_CONTAINER psql -U postgres postgres < "$migration_file"

    if [ $? -eq 0 ]; then
        log_info "Success: $filename"
    else
        log_error "Failed: $filename"
        exit 1
    fi
}

# Apply all migrations
apply_all() {
    log_warn "This will apply ALL migrations to production!"
    log_warn "Migrations are NOT idempotent - only run once!"
    echo ""

    # List migrations
    log_info "Migrations to apply:"
    for f in "$MIGRATIONS_PATH"/*.sql; do
        echo "  - $(basename $f)"
    done
    echo ""

    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cancelled"
        exit 0
    fi

    # Create backup first
    log_info "Creating backup before migrations..."
    ./backup.sh backup

    # Apply migrations in order
    for migration in $(ls "$MIGRATIONS_PATH"/*.sql | sort); do
        apply_migration "$migration"
    done

    log_info "All migrations applied successfully!"
}

# Apply specific migration
apply_one() {
    local migration_name="$1"
    local migration_file="$MIGRATIONS_PATH/$migration_name"

    if [ ! -f "$migration_file" ]; then
        # Try adding .sql extension
        migration_file="$MIGRATIONS_PATH/${migration_name}.sql"
    fi

    if [ ! -f "$migration_file" ]; then
        log_error "Migration not found: $migration_name"
        log_info "Available migrations:"
        ls "$MIGRATIONS_PATH"/*.sql | xargs -n1 basename
        exit 1
    fi

    log_warn "This will apply migration to production!"
    log_warn "File: $(basename $migration_file)"
    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cancelled"
        exit 0
    fi

    # Create backup first
    log_info "Creating backup before migration..."
    ./backup.sh backup

    apply_migration "$migration_file"
}

# List migrations
list_migrations() {
    log_info "Available migrations:"
    for f in "$MIGRATIONS_PATH"/*.sql; do
        echo "  $(basename $f)"
    done
}

# Check migration status (basic - checks if tables exist)
check_status() {
    log_info "Checking migration status..."

    # Check for key tables from each migration
    tables=(
        "products:20260128000001"
        "customers:20260128000001"
        "orders:20260128000001"
        "user_roles:20260129000001"
    )

    for item in "${tables[@]}"; do
        table="${item%%:*}"
        migration="${item##*:}"

        exists=$(docker exec $DB_CONTAINER psql -U postgres postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")

        if [ "$exists" = "t" ]; then
            echo -e "  ${GREEN}[APPLIED]${NC} $migration - table '$table' exists"
        else
            echo -e "  ${YELLOW}[PENDING]${NC} $migration - table '$table' not found"
        fi
    done
}

# Main
case "${1:-help}" in
    apply-all)  apply_all ;;
    apply)      apply_one "$2" ;;
    list)       list_migrations ;;
    status)     check_status ;;
    *)
        echo "Migration Management Script"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  apply-all           Apply all migrations in order"
        echo "  apply <file>        Apply specific migration"
        echo "  list                List available migrations"
        echo "  status              Check migration status"
        exit 1
        ;;
esac
