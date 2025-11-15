# =============================================================================
# Development Environment Setup Script (Windows PowerShell)
# =============================================================================
# This script uses Bitwarden CLI to securely retrieve development secrets
# and generate .env files for local development.
#
# Prerequisites:
# - Bitwarden CLI installed (https://bitwarden.com/help/cli/)
# - Bitwarden account with development secrets stored
#
# Usage:
#   .\scripts\setup-dev-env.ps1
# =============================================================================

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$BitwardenItemName = "Professional-Website-Dev-Secrets"
$EnvFile = "contact-backend\.env"
$BackendDir = "contact-backend"

# =============================================================================
# Helper Functions
# =============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-InfoMsg {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# =============================================================================
# Check Prerequisites
# =============================================================================

function Test-BitwardenCLI {
    Write-Header "Checking Bitwarden CLI Installation"
    
    try {
        $bwVersion = bw --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Bitwarden CLI not found"
        }
        Write-Success "Bitwarden CLI installed (version: $bwVersion)"
        return $true
    }
    catch {
        Write-ErrorMsg "Bitwarden CLI is not installed"
        Write-Host ""
        Write-Host "Please install Bitwarden CLI:"
        Write-Host "  Chocolatey: choco install bitwarden-cli"
        Write-Host "  Scoop:      scoop install bitwarden-cli"
        Write-Host "  Manual:     https://bitwarden.com/help/cli/"
        Write-Host ""
        exit 1
    }
}

# =============================================================================
# Bitwarden Authentication
# =============================================================================

function Test-BitwardenLogin {
    Write-Header "Checking Bitwarden Authentication"
    
    # Check if already logged in
    $loginCheck = bw login --check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Already logged in to Bitwarden"
        return $true
    }
    
    Write-WarningMsg "Not logged in to Bitwarden"
    Write-Host ""
    $email = Read-Host "Enter your Bitwarden email"
    
    try {
        bw login $email
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully logged in to Bitwarden"
            return $true
        }
        else {
            throw "Login failed"
        }
    }
    catch {
        Write-ErrorMsg "Failed to login to Bitwarden"
        exit 1
    }
}

function Unlock-BitwardenVault {
    Write-Header "Unlocking Bitwarden Vault"
    
    # Check if already unlocked
    if ($env:BW_SESSION) {
        $unlockCheck = bw unlock --check --session $env:BW_SESSION 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Vault is already unlocked"
            return $env:BW_SESSION
        }
    }
    
    # Try to unlock
    Write-InfoMsg "Please enter your Bitwarden master password:"
    try {
        $session = bw unlock --raw
        if ([string]::IsNullOrWhiteSpace($session)) {
            throw "Unlock failed"
        }
        
        $env:BW_SESSION = $session
        Write-Success "Vault unlocked successfully"
        return $session
    }
    catch {
        Write-ErrorMsg "Failed to unlock vault"
        exit 1
    }
}

# =============================================================================
# Secret Retrieval
# =============================================================================

function Get-BitwardenSecret {
    param(
        [string]$FieldName,
        [string]$ItemName = $BitwardenItemName,
        [string]$Session = $env:BW_SESSION
    )
    
    try {
        # Get the item
        $item = bw get item $ItemName --session $Session 2>$null | ConvertFrom-Json
        
        if (-not $item) {
            return $null
        }
        
        # Try to get from custom fields first
        $customField = $item.fields | Where-Object { $_.name -eq $FieldName } | Select-Object -First 1
        if ($customField) {
            return $customField.value
        }
        
        # Try standard fields
        if ($item.PSObject.Properties.Name -contains $FieldName) {
            return $item.$FieldName
        }
        
        return $null
    }
    catch {
        return $null
    }
}

function Get-AllSecrets {
    Write-Header "Retrieving Secrets from Bitwarden"
    
    # Check if the item exists
    try {
        $item = bw get item $BitwardenItemName --session $env:BW_SESSION 2>$null
        if ([string]::IsNullOrWhiteSpace($item)) {
            throw "Item not found"
        }
    }
    catch {
        Write-ErrorMsg "Bitwarden item '$BitwardenItemName' not found"
        Write-Host ""
        Write-Host "Please create this item in Bitwarden with the following custom fields:"
        Write-Host "  - EMAIL_USER"
        Write-Host "  - EMAIL_APP_PASSWORD"
        Write-Host "  - STRIPE_PUBLISHABLE_KEY"
        Write-Host "  - STRIPE_SECRET_KEY"
        Write-Host "  - STRIPE_WEBHOOK_SECRET"
        Write-Host "  - JWT_SECRET"
        Write-Host "  - ADMIN_USER"
        Write-Host "  - ADMIN_PASS"
        Write-Host "  - DB_PASSWORD"
        Write-Host ""
        Write-Host "See docs\SECRET_MANAGEMENT.md for detailed setup instructions"
        exit 1
    }
    
    Write-InfoMsg "Fetching secrets from Bitwarden item: $BitwardenItemName"
    
    # Retrieve all secrets
    $secrets = @{
        EMAIL_USER = Get-BitwardenSecret "EMAIL_USER"
        EMAIL_APP_PASSWORD = Get-BitwardenSecret "EMAIL_APP_PASSWORD"
        STRIPE_PUBLISHABLE_KEY = Get-BitwardenSecret "STRIPE_PUBLISHABLE_KEY"
        STRIPE_SECRET_KEY = Get-BitwardenSecret "STRIPE_SECRET_KEY"
        STRIPE_WEBHOOK_SECRET = Get-BitwardenSecret "STRIPE_WEBHOOK_SECRET"
        JWT_SECRET = Get-BitwardenSecret "JWT_SECRET"
        ADMIN_USER = Get-BitwardenSecret "ADMIN_USER"
        ADMIN_PASS = Get-BitwardenSecret "ADMIN_PASS"
        DB_PASSWORD = Get-BitwardenSecret "DB_PASSWORD"
    }
    
    Write-Success "Secrets retrieved successfully"
    return $secrets
}

# =============================================================================
# Validation
# =============================================================================

function Test-RequiredSecrets {
    param([hashtable]$Secrets)
    
    Write-Header "Validating Required Secrets"
    
    $missingSecrets = @()
    
    $requiredSecrets = @("EMAIL_USER", "EMAIL_APP_PASSWORD", "JWT_SECRET", "ADMIN_PASS")
    
    foreach ($secret in $requiredSecrets) {
        if ([string]::IsNullOrWhiteSpace($Secrets[$secret])) {
            $missingSecrets += $secret
        }
    }
    
    if ($missingSecrets.Count -gt 0) {
        Write-ErrorMsg "Missing required secrets in Bitwarden:"
        foreach ($secret in $missingSecrets) {
            Write-Host "  - $secret"
        }
        Write-Host ""
        Write-Host "Please add these fields to your Bitwarden item: $BitwardenItemName"
        Write-Host "See docs\SECRET_MANAGEMENT.md for setup instructions"
        exit 1
    }
    
    # Check optional secrets and warn
    if ([string]::IsNullOrWhiteSpace($Secrets.STRIPE_SECRET_KEY)) {
        Write-WarningMsg "STRIPE_SECRET_KEY not set (optional for development)"
    }
    if ([string]::IsNullOrWhiteSpace($Secrets.STRIPE_PUBLISHABLE_KEY)) {
        Write-WarningMsg "STRIPE_PUBLISHABLE_KEY not set (optional for development)"
    }
    if ([string]::IsNullOrWhiteSpace($Secrets.DB_PASSWORD)) {
        Write-WarningMsg "DB_PASSWORD not set (optional for development)"
    }
    
    Write-Success "All required secrets are present"
}

# =============================================================================
# Environment File Generation
# =============================================================================

function New-EnvFile {
    param([hashtable]$Secrets)
    
    Write-Header "Generating Environment File"
    
    # Backup existing .env if it exists
    if (Test-Path $EnvFile) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "$EnvFile.backup.$timestamp"
        Copy-Item $EnvFile $backupFile
        Write-InfoMsg "Backed up existing .env to: $backupFile"
    }
    
    # Create the .env file
    $envContent = @"
# =============================================================================
# Development Environment Configuration
# =============================================================================
# Generated by setup-dev-env.ps1 on $(Get-Date)
# DO NOT COMMIT THIS FILE TO GIT!
# =============================================================================

# Server Configuration
PORT=3001

# Admin Credentials
ADMIN_USER=$($Secrets.ADMIN_USER ?? 'admin')
ADMIN_PASS=$($Secrets.ADMIN_PASS)
JWT_SECRET=$($Secrets.JWT_SECRET)

# Email Configuration (Gmail)
EMAIL_USER=$($Secrets.EMAIL_USER)
EMAIL_APP_PASSWORD=$($Secrets.EMAIL_APP_PASSWORD)

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=ecommerce_user
DB_PASSWORD=$($Secrets.DB_PASSWORD ?? 'postgres123')

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=$($Secrets.STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder')
STRIPE_SECRET_KEY=$($Secrets.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')
STRIPE_WEBHOOK_SECRET=$($Secrets.STRIPE_WEBHOOK_SECRET ?? 'whsec_placeholder')
"@
    
    Set-Content -Path $EnvFile -Value $envContent -Encoding UTF8
    Write-Success "Environment file created: $EnvFile"
}

# =============================================================================
# Cleanup
# =============================================================================

function Invoke-Cleanup {
    Write-Header "Cleanup"
    
    # Lock the vault for security
    if ($env:BW_SESSION) {
        bw lock 2>$null | Out-Null
        Remove-Item Env:\BW_SESSION -ErrorAction SilentlyContinue
        Write-InfoMsg "Bitwarden vault locked for security"
    }
}

# =============================================================================
# Main Execution
# =============================================================================

function Main {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Professional Website - Development Environment Setup         ║" -ForegroundColor Cyan
    Write-Host "║  Bitwarden Secret Management System                           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    try {
        # Run setup steps
        Test-BitwardenCLI
        Test-BitwardenLogin
        $session = Unlock-BitwardenVault
        $secrets = Get-AllSecrets
        Test-RequiredSecrets -Secrets $secrets
        New-EnvFile -Secrets $secrets
        
        # Final success message
        Write-Header "Setup Complete!"
        Write-Host ""
        Write-Success "Your development environment is ready!"
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "  1. Review the generated file: $EnvFile"
        Write-Host "  2. Start the backend: cd $BackendDir; npm start"
        Write-Host "  3. Start the frontend: npm start"
        Write-Host ""
        Write-InfoMsg "For help, see: docs\SECRET_MANAGEMENT.md"
        Write-Host ""
    }
    catch {
        Write-ErrorMsg "Setup failed: $_"
        exit 1
    }
    finally {
        Invoke-Cleanup
    }
}

# Run main function
Main
