#!/bin/bash

# =============================================================================
# Environment Variables Validation Script
# =============================================================================
# This script validates that all required environment variables are set
# for the development environment.
#
# Usage:
#   ./scripts/validate-env.sh
# =============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env file if it exists
ENV_FILE="contact-backend/.env"
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)
fi

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
# Validation Functions
# =============================================================================

validate_variable() {
    local var_name=$1
    local var_value="${!var_name}"
    local is_required=$2
    local description=$3
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            print_error "$var_name is NOT SET (Required) - $description"
            return 1
        else
            print_warning "$var_name is NOT SET (Optional) - $description"
            return 0
        fi
    else
        # Mask sensitive values for display
        local display_value
        if [[ "$var_name" == *"PASSWORD"* ]] || [[ "$var_name" == *"SECRET"* ]] || [[ "$var_name" == *"KEY"* ]]; then
            display_value="***${var_value: -4}"
        else
            display_value="$var_value"
        fi
        print_success "$var_name is set: $display_value"
        return 0
    fi
}

validate_email_format() {
    local email=$1
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_stripe_key_format() {
    local key=$1
    local key_type=$2
    
    if [ "$key_type" = "publishable" ]; then
        if [[ "$key" =~ ^pk_(test|live)_ ]]; then
            return 0
        fi
    elif [ "$key_type" = "secret" ]; then
        if [[ "$key" =~ ^sk_(test|live)_ ]]; then
            return 0
        fi
    elif [ "$key_type" = "webhook" ]; then
        if [[ "$key" =~ ^whsec_ ]]; then
            return 0
        fi
    fi
    
    return 1
}

# =============================================================================
# Main Validation
# =============================================================================

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  Environment Variables Validation                             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    
    print_header "Checking .env File"
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found at: $ENV_FILE"
        echo ""
        echo "Please run setup-dev-env.sh to generate the .env file:"
        echo "  ./scripts/setup-dev-env.sh"
        exit 1
    fi
    print_success ".env file found"
    
    # Track validation results
    local has_errors=false
    local has_warnings=false
    
    print_header "Server Configuration"
    validate_variable "PORT" "false" "Backend server port" || has_warnings=true
    
    print_header "Admin Credentials"
    validate_variable "ADMIN_USER" "false" "Admin username for authentication" || has_warnings=true
    validate_variable "ADMIN_PASS" "true" "Admin password for authentication" || has_errors=true
    validate_variable "JWT_SECRET" "true" "Secret key for JWT token generation" || has_errors=true
    
    # Check JWT secret length
    if [ ! -z "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
        print_warning "JWT_SECRET is shorter than recommended (32+ characters)"
        has_warnings=true
    fi
    
    print_header "Email Configuration"
    validate_variable "EMAIL_USER" "true" "Email address for sending notifications" || has_errors=true
    validate_variable "EMAIL_APP_PASSWORD" "true" "Gmail app password for SMTP authentication" || has_errors=true
    
    # Validate email format
    if [ ! -z "$EMAIL_USER" ]; then
        if ! validate_email_format "$EMAIL_USER"; then
            print_warning "EMAIL_USER does not appear to be a valid email format"
            has_warnings=true
        fi
    fi
    
    print_header "Frontend Configuration"
    validate_variable "FRONTEND_URL" "false" "URL of the frontend application" || has_warnings=true
    
    print_header "Database Configuration"
    validate_variable "DB_HOST" "false" "PostgreSQL database host" || has_warnings=true
    validate_variable "DB_PORT" "false" "PostgreSQL database port" || has_warnings=true
    validate_variable "DB_NAME" "false" "PostgreSQL database name" || has_warnings=true
    validate_variable "DB_USER" "false" "PostgreSQL database user" || has_warnings=true
    validate_variable "DB_PASSWORD" "false" "PostgreSQL database password" || has_warnings=true
    
    print_header "Stripe Configuration"
    validate_variable "STRIPE_PUBLISHABLE_KEY" "false" "Stripe publishable key for client-side" || has_warnings=true
    validate_variable "STRIPE_SECRET_KEY" "false" "Stripe secret key for server-side" || has_warnings=true
    validate_variable "STRIPE_WEBHOOK_SECRET" "false" "Stripe webhook secret for event verification" || has_warnings=true
    
    # Validate Stripe key formats
    if [ ! -z "$STRIPE_PUBLISHABLE_KEY" ]; then
        if ! validate_stripe_key_format "$STRIPE_PUBLISHABLE_KEY" "publishable"; then
            print_warning "STRIPE_PUBLISHABLE_KEY format is invalid (should start with pk_test_ or pk_live_)"
            has_warnings=true
        fi
    fi
    
    if [ ! -z "$STRIPE_SECRET_KEY" ]; then
        if ! validate_stripe_key_format "$STRIPE_SECRET_KEY" "secret"; then
            print_warning "STRIPE_SECRET_KEY format is invalid (should start with sk_test_ or sk_live_)"
            has_warnings=true
        fi
    fi
    
    if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
        if ! validate_stripe_key_format "$STRIPE_WEBHOOK_SECRET" "webhook"; then
            print_warning "STRIPE_WEBHOOK_SECRET format is invalid (should start with whsec_)"
            has_warnings=true
        fi
    fi
    
    # Final summary
    print_header "Validation Summary"
    
    if [ "$has_errors" = true ]; then
        print_error "Validation FAILED - Required environment variables are missing"
        echo ""
        echo "Please fix the errors above and run this script again."
        echo "You can use setup-dev-env.sh to retrieve secrets from Bitwarden:"
        echo "  ./scripts/setup-dev-env.sh"
        exit 1
    elif [ "$has_warnings" = true ]; then
        print_warning "Validation completed with warnings"
        echo ""
        echo "The application may run with reduced functionality."
        echo "Consider setting the optional variables for full features."
        exit 0
    else
        print_success "All environment variables are properly configured!"
        echo ""
        echo "Your environment is ready for development."
        echo ""
        echo "Next steps:"
        echo "  1. Start the backend: cd contact-backend && npm start"
        echo "  2. Start the frontend: npm start"
        exit 0
    fi
}

# Run main function
main
