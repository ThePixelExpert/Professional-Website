#!/bin/bash

# =============================================================================
# Development Environment Setup Script (Linux/Mac)
# =============================================================================
# This script uses Bitwarden CLI to securely retrieve development secrets
# and generate .env files for local development.
#
# Prerequisites:
# - Bitwarden CLI installed (https://bitwarden.com/help/cli/)
# - Bitwarden account with development secrets stored
#
# Usage:
#   ./scripts/setup-dev-env.sh
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BITWARDEN_ITEM_NAME="Professional-Website-Dev-Secrets"
ENV_FILE="contact-backend/.env"
BACKEND_DIR="contact-backend"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# =============================================================================
# Check Prerequisites
# =============================================================================

check_bitwarden_cli() {
    print_header "Checking Bitwarden CLI Installation"
    
    if ! command -v bw &> /dev/null; then
        print_error "Bitwarden CLI is not installed"
        echo ""
        echo "Please install Bitwarden CLI:"
        echo "  macOS:   brew install bitwarden-cli"
        echo "  Linux:   snap install bw"
        echo "  Manual:  https://bitwarden.com/help/cli/"
        echo ""
        exit 1
    fi
    
    BW_VERSION=$(bw --version)
    print_success "Bitwarden CLI installed (version: $BW_VERSION)"
}

# =============================================================================
# Bitwarden Authentication
# =============================================================================

check_bitwarden_login() {
    print_header "Checking Bitwarden Authentication"
    
    # Check if already logged in
    if bw login --check &> /dev/null; then
        print_success "Already logged in to Bitwarden"
        return 0
    fi
    
    print_warning "Not logged in to Bitwarden"
    echo ""
    read -p "Enter your Bitwarden email: " BW_EMAIL
    
    if bw login "$BW_EMAIL"; then
        print_success "Successfully logged in to Bitwarden"
    else
        print_error "Failed to login to Bitwarden"
        exit 1
    fi
}

unlock_bitwarden() {
    print_header "Unlocking Bitwarden Vault"
    
    # Check if already unlocked
    if [ ! -z "$BW_SESSION" ]; then
        if bw unlock --check --session "$BW_SESSION" &> /dev/null; then
            print_success "Vault is already unlocked"
            return 0
        fi
    fi
    
    # Try to unlock
    print_info "Please enter your Bitwarden master password:"
    BW_SESSION=$(bw unlock --raw)
    
    if [ -z "$BW_SESSION" ]; then
        print_error "Failed to unlock vault"
        exit 1
    fi
    
    export BW_SESSION
    print_success "Vault unlocked successfully"
}

# =============================================================================
# Secret Retrieval
# =============================================================================

get_secret_from_bitwarden() {
    local field_name=$1
    local item_name=${2:-$BITWARDEN_ITEM_NAME}
    
    # Try to get from custom field first
    local value=$(bw get item "$item_name" --session "$BW_SESSION" 2>/dev/null | \
                  jq -r ".fields[] | select(.name==\"$field_name\") | .value" 2>/dev/null)
    
    # If not found in custom fields, try standard fields
    if [ -z "$value" ] || [ "$value" = "null" ]; then
        value=$(bw get item "$item_name" --session "$BW_SESSION" 2>/dev/null | \
                jq -r ".$field_name" 2>/dev/null)
    fi
    
    # Return empty string if still null
    if [ "$value" = "null" ]; then
        value=""
    fi
    
    echo "$value"
}

retrieve_secrets() {
    print_header "Retrieving Secrets from Bitwarden"
    
    # Check if the item exists
    if ! bw get item "$BITWARDEN_ITEM_NAME" --session "$BW_SESSION" &> /dev/null; then
        print_error "Bitwarden item '$BITWARDEN_ITEM_NAME' not found"
        echo ""
        echo "Please create this item in Bitwarden with the following custom fields:"
        echo "  - EMAIL_USER"
        echo "  - EMAIL_APP_PASSWORD"
        echo "  - STRIPE_PUBLISHABLE_KEY"
        echo "  - STRIPE_SECRET_KEY"
        echo "  - STRIPE_WEBHOOK_SECRET"
        echo "  - JWT_SECRET"
        echo "  - ADMIN_USER"
        echo "  - ADMIN_PASS"
        echo "  - DB_PASSWORD"
        echo ""
        echo "See docs/SECRET_MANAGEMENT.md for detailed setup instructions"
        exit 1
    fi
    
    print_info "Fetching secrets from Bitwarden item: $BITWARDEN_ITEM_NAME"
    
    # Retrieve all secrets
    EMAIL_USER=$(get_secret_from_bitwarden "EMAIL_USER")
    EMAIL_APP_PASSWORD=$(get_secret_from_bitwarden "EMAIL_APP_PASSWORD")
    STRIPE_PUBLISHABLE_KEY=$(get_secret_from_bitwarden "STRIPE_PUBLISHABLE_KEY")
    STRIPE_SECRET_KEY=$(get_secret_from_bitwarden "STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET=$(get_secret_from_bitwarden "STRIPE_WEBHOOK_SECRET")
    JWT_SECRET=$(get_secret_from_bitwarden "JWT_SECRET")
    ADMIN_USER=$(get_secret_from_bitwarden "ADMIN_USER")
    ADMIN_PASS=$(get_secret_from_bitwarden "ADMIN_PASS")
    DB_PASSWORD=$(get_secret_from_bitwarden "DB_PASSWORD")
    
    print_success "Secrets retrieved successfully"
}

# =============================================================================
# Environment File Generation
# =============================================================================

validate_required_secrets() {
    print_header "Validating Required Secrets"
    
    local missing_secrets=()
    
    [ -z "$EMAIL_USER" ] && missing_secrets+=("EMAIL_USER")
    [ -z "$EMAIL_APP_PASSWORD" ] && missing_secrets+=("EMAIL_APP_PASSWORD")
    [ -z "$JWT_SECRET" ] && missing_secrets+=("JWT_SECRET")
    [ -z "$ADMIN_PASS" ] && missing_secrets+=("ADMIN_PASS")
    
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        print_error "Missing required secrets in Bitwarden:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        echo ""
        echo "Please add these fields to your Bitwarden item: $BITWARDEN_ITEM_NAME"
        echo "See docs/SECRET_MANAGEMENT.md for setup instructions"
        exit 1
    fi
    
    # Check optional secrets and warn
    [ -z "$STRIPE_SECRET_KEY" ] && print_warning "STRIPE_SECRET_KEY not set (optional for development)"
    [ -z "$STRIPE_PUBLISHABLE_KEY" ] && print_warning "STRIPE_PUBLISHABLE_KEY not set (optional for development)"
    [ -z "$DB_PASSWORD" ] && print_warning "DB_PASSWORD not set (optional for development)"
    
    print_success "All required secrets are present"
}

generate_env_file() {
    print_header "Generating Environment File"
    
    # Backup existing .env if it exists
    if [ -f "$ENV_FILE" ]; then
        BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$BACKUP_FILE"
        print_info "Backed up existing .env to: $BACKUP_FILE"
    fi
    
    # Create the .env file
    cat > "$ENV_FILE" << EOF
# =============================================================================
# Development Environment Configuration
# =============================================================================
# Generated by setup-dev-env.sh on $(date)
# DO NOT COMMIT THIS FILE TO GIT!
# =============================================================================

# Server Configuration
PORT=3001

# Admin Credentials
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS}
JWT_SECRET=${JWT_SECRET}

# Email Configuration (Gmail)
EMAIL_USER=${EMAIL_USER}
EMAIL_APP_PASSWORD=${EMAIL_APP_PASSWORD}

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=ecommerce_user
DB_PASSWORD=${DB_PASSWORD:-postgres123}

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_test_placeholder}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}
EOF
    
    print_success "Environment file created: $ENV_FILE"
}

# =============================================================================
# Cleanup
# =============================================================================

cleanup() {
    print_header "Cleanup"
    
    # Lock the vault for security
    if [ ! -z "$BW_SESSION" ]; then
        bw lock &> /dev/null || true
        unset BW_SESSION
        print_info "Bitwarden vault locked for security"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  Professional Website - Development Environment Setup         ║"
    echo "║  Bitwarden Secret Management System                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    
    # Run setup steps
    check_bitwarden_cli
    check_bitwarden_login
    unlock_bitwarden
    retrieve_secrets
    validate_required_secrets
    generate_env_file
    cleanup
    
    # Final success message
    print_header "Setup Complete!"
    echo ""
    print_success "Your development environment is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Review the generated file: $ENV_FILE"
    echo "  2. Start the backend: cd $BACKEND_DIR && npm start"
    echo "  3. Start the frontend: npm start"
    echo ""
    print_info "For help, see: docs/SECRET_MANAGEMENT.md"
    echo ""
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main
