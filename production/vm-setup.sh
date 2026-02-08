#!/bin/bash
################################################################################
# Supabase VM Setup Script
#
# Prepares a fresh Ubuntu 22.04 LTS VM for Supabase deployment.
# This script installs Docker Engine, configures storage on a separate disk,
# and clones the Supabase Docker Compose files.
#
# USAGE:
#   sudo ./vm-setup.sh
#
# PREREQUISITES:
#   - Fresh Ubuntu 22.04 LTS installation
#   - Second disk attached to VM (will be /dev/sdb)
#   - Internet connectivity
#   - Run as root (sudo)
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

################################################################################
# PRE-FLIGHT CHECKS
################################################################################

log_info "Starting pre-flight checks..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Check if Ubuntu 22.04
if ! lsb_release -d | grep -q "Ubuntu 22.04"; then
    log_warn "This script is designed for Ubuntu 22.04 LTS"
    lsb_release -d
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if /dev/sdb exists (data disk)
if [[ ! -b /dev/sdb ]]; then
    log_error "/dev/sdb not found. Ensure a second disk is attached to the VM in Proxmox."
    log_error "Hardware -> Add -> Hard Disk (VirtIO Block, 120GB+)"
    exit 1
fi

log_info "Pre-flight checks passed!"

################################################################################
# SYSTEM UPDATES
################################################################################

log_info "Updating system packages..."
apt update
apt upgrade -y
apt install -y curl git lsb-release

################################################################################
# FORMAT AND MOUNT DATA DISK
################################################################################

log_info "Configuring data disk (/dev/sdb)..."

# Check if /opt is already mounted
if mount | grep -q "/opt"; then
    log_warn "/opt is already mounted. Skipping disk formatting."
    df -h /opt
else
    # Format disk
    log_info "Formatting /dev/sdb as ext4..."
    mkfs.ext4 /dev/sdb

    # Create mount point if it doesn't exist
    mkdir -p /opt

    # Add to /etc/fstab for persistence
    if ! grep -q "/dev/sdb" /etc/fstab; then
        log_info "Adding /dev/sdb to /etc/fstab..."
        echo '/dev/sdb /opt ext4 defaults 0 2' >> /etc/fstab
    fi

    # Mount the disk
    log_info "Mounting /opt..."
    mount /opt

    log_info "Data disk mounted successfully:"
    df -h /opt
fi

################################################################################
# INSTALL DOCKER ENGINE
################################################################################

log_info "Installing Docker Engine..."

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    log_warn "Docker is already installed ($(docker --version))"
else
    # Download and run Docker installation script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    log_info "Docker installed: $(docker --version)"
fi

################################################################################
# CONFIGURE DOCKER
################################################################################

log_info "Configuring Docker..."

# Add current user to docker group (if not root-only)
if [[ -n "${SUDO_USER:-}" ]]; then
    log_info "Adding user $SUDO_USER to docker group..."
    usermod -aG docker "$SUDO_USER"
fi

# Configure Docker to store data in /opt/docker
mkdir -p /opt/docker
mkdir -p /etc/docker

# Create or update daemon.json
DAEMON_JSON="/etc/docker/daemon.json"
if [[ -f "$DAEMON_JSON" ]]; then
    log_warn "$DAEMON_JSON already exists. Backing up..."
    cp "$DAEMON_JSON" "$DAEMON_JSON.backup"
fi

log_info "Setting Docker data-root to /opt/docker..."
cat > "$DAEMON_JSON" << 'EOF'
{
  "data-root": "/opt/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply changes
log_info "Restarting Docker daemon..."
systemctl restart docker
systemctl enable docker

log_info "Docker configuration complete!"

################################################################################
# CREATE DIRECTORY STRUCTURE
################################################################################

log_info "Creating directory structure..."

mkdir -p /opt/supabase
mkdir -p /opt/caddy
mkdir -p /opt/backups/postgres

log_info "Directories created:"
ls -la /opt/

################################################################################
# CLONE SUPABASE DOCKER FILES
################################################################################

log_info "Cloning Supabase Docker Compose files..."

# Clone to temp directory
if [[ -d /tmp/supabase ]]; then
    log_warn "/tmp/supabase already exists. Removing..."
    rm -rf /tmp/supabase
fi

git clone --depth 1 https://github.com/supabase/supabase /tmp/supabase

# Copy Docker files to /opt/supabase
log_info "Copying Docker files to /opt/supabase..."
cp -rf /tmp/supabase/docker/* /opt/supabase/
cp /tmp/supabase/docker/.env.example /opt/supabase/.env

# Clean up temp directory
rm -rf /tmp/supabase

log_info "Supabase files copied successfully!"
ls -la /opt/supabase/

################################################################################
# VERIFY DOCKER COMPOSE
################################################################################

log_info "Verifying Docker Compose..."

if docker compose version &> /dev/null; then
    log_info "Docker Compose: $(docker compose version)"
else
    log_error "Docker Compose not available. This is unexpected."
    exit 1
fi

################################################################################
# SUCCESS MESSAGE
################################################################################

echo
echo "=========================================="
log_info "VM setup complete!"
echo "=========================================="
echo
echo "Next steps:"
echo "  1. Log out and log back in (or run 'newgrp docker') for docker group to take effect"
echo "  2. Edit /opt/supabase/.env with your configuration:"
echo "     - Generate secrets (see docs/PROXMOX_VM_SETUP.md)"
echo "     - Set API_EXTERNAL_URL to your public domain"
echo "     - Configure OAuth providers"
echo "  3. Start Supabase:"
echo "     cd /opt/supabase"
echo "     docker compose pull"
echo "     docker compose up -d"
echo
log_warn "WARNING: Do NOT start Supabase with default .env values!"
log_warn "Generate all secrets BEFORE first start to avoid security issues."
echo
echo "For detailed instructions, see:"
echo "  - docs/PROXMOX_VM_SETUP.md"
echo "  - production/README.md"
echo
