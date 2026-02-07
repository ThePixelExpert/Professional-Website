#!/bin/bash
# Manual Backup and Restore Script for Supabase PostgreSQL
# Usage:
#   ./backup.sh backup              - Create manual backup
#   ./backup.sh restore <file>      - Restore from backup file
#   ./backup.sh list                - List available backups
#   ./backup.sh storage-backup      - Backup storage files

set -e

BACKUP_DIR="/opt/backups/postgres"
STORAGE_DIR="/opt/supabase/volumes/storage"
DB_CONTAINER="supabase-db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create manual database backup
cmd_backup() {
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/manual-backup-$TIMESTAMP.sql.gz"

    log_info "Creating backup: $BACKUP_FILE"

    # Verify db container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        log_error "Database container '$DB_CONTAINER' is not running"
        exit 1
    fi

    # Create backup
    docker exec $DB_CONTAINER pg_dump -U postgres postgres \
        --no-owner --no-acl \
        | gzip > "$BACKUP_FILE"

    # Verify backup was created
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        log_info "Backup complete: $BACKUP_FILE ($SIZE)"
    else
        log_error "Backup failed!"
        exit 1
    fi
}

# Restore from backup
cmd_restore() {
    BACKUP_FILE="$1"

    if [ -z "$BACKUP_FILE" ]; then
        log_error "Usage: $0 restore <backup-file>"
        exit 1
    fi

    # Handle relative paths
    if [[ ! "$BACKUP_FILE" = /* ]]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_warn "WARNING: This will OVERWRITE the current database!"
    log_warn "Backup file: $BACKUP_FILE"
    read -p "Are you sure? Type 'yes' to continue: " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Stopping Supabase services..."
    cd /opt/supabase
    docker compose stop

    log_info "Starting only database container..."
    docker compose up -d db
    sleep 10  # Wait for db to be ready

    log_info "Restoring database..."
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i $DB_CONTAINER psql -U postgres postgres
    else
        docker exec -i $DB_CONTAINER psql -U postgres postgres < "$BACKUP_FILE"
    fi

    log_info "Starting all services..."
    docker compose up -d

    log_info "Restore complete! Verify data integrity."
}

# List available backups
cmd_list() {
    log_info "Available backups in $BACKUP_DIR:"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null || echo "No backup files found"
    else
        log_warn "Backup directory does not exist: $BACKUP_DIR"
    fi
}

# Backup storage files
cmd_storage_backup() {
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/storage-backup-$TIMESTAMP.tar.gz"

    if [ ! -d "$STORAGE_DIR" ]; then
        log_warn "Storage directory not found: $STORAGE_DIR"
        log_info "This is normal if no files have been uploaded"
        exit 0
    fi

    log_info "Creating storage backup: $BACKUP_FILE"
    tar -czf "$BACKUP_FILE" -C /opt/supabase/volumes storage

    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    log_info "Storage backup complete: $BACKUP_FILE ($SIZE)"
}

# Restore storage files
cmd_storage_restore() {
    BACKUP_FILE="$1"

    if [ -z "$BACKUP_FILE" ]; then
        log_error "Usage: $0 storage-restore <backup-file>"
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_warn "WARNING: This will OVERWRITE current storage files!"
    read -p "Continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restoring storage files..."
    tar -xzf "$BACKUP_FILE" -C /opt/supabase/volumes

    log_info "Storage restore complete!"
}

# Main
case "${1:-help}" in
    backup)          cmd_backup ;;
    restore)         cmd_restore "$2" ;;
    list)            cmd_list ;;
    storage-backup)  cmd_storage_backup ;;
    storage-restore) cmd_storage_restore "$2" ;;
    *)
        echo "Supabase Backup/Restore Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  backup              Create manual database backup"
        echo "  restore <file>      Restore from backup file"
        echo "  list                List available backups"
        echo "  storage-backup      Backup storage files"
        echo "  storage-restore     Restore storage files"
        exit 1
        ;;
esac
