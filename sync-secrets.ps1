# PowerShell script to sync .env file values to Kubernetes secrets
# This script reads from contact-backend/.env and updates K8s secrets accordingly

Write-Host "Syncing environment variables to Kubernetes secrets..." -ForegroundColor Yellow

# Read the .env file
$envFile = "contact-backend/.env"
if (!(Test-Path $envFile)) {
    Write-Host ".env file not found at: $envFile" -ForegroundColor Red
    Write-Host "Creating .env file with template values..." -ForegroundColor Yellow
    Copy-Item "contact-backend/.env.template" $envFile
}

# Parse .env file
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]*?)=(.*)$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

# Set admin credentials (CHANGE THESE IN PRODUCTION!)
# WARNING: Change these values before production deployment
$adminUser = Read-Host "Enter admin username (default: admin)"
if ([string]::IsNullOrEmpty($adminUser)) { $adminUser = "admin" }

$securePass = Read-Host "Enter admin password" -AsSecureString
$adminPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))
$jwtSecret = "edwards-engineering-secure-jwt-key-2024-production-$(Get-Random -Maximum 9999)"

# Get email credentials from .env
$emailUser = $envVars["EMAIL_USER"]
$emailPass = $envVars["EMAIL_APP_PASSWORD"]

if (!$emailUser -or !$emailPass) {
    Write-Host "Missing email credentials in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Using email: $emailUser" -ForegroundColor Green
Write-Host "Using admin user: $adminUser" -ForegroundColor Green

# Delete existing secrets if they exist
Write-Host "Removing existing secrets..." -ForegroundColor Yellow
kubectl delete secret email-secret -n website --ignore-not-found
kubectl delete secret admin-secret -n website --ignore-not-found

# Create email secret
Write-Host "Creating email secret..." -ForegroundColor Green
kubectl create secret generic email-secret -n website `
    --from-literal=email-user="$emailUser" `
    --from-literal=email-password="$emailPass"

# Create admin secret  
Write-Host "Creating admin secret..." -ForegroundColor Green
kubectl create secret generic admin-secret -n website `
    --from-literal=admin-user="$adminUser" `
    --from-literal=admin-password="$adminPass" `
    --from-literal=jwt-secret="$jwtSecret"

# Restart backend deployment to pick up new secrets
Write-Host "Restarting backend deployment..." -ForegroundColor Yellow
kubectl rollout restart deployment/backend-deployment -n website

# Wait for deployment to be ready
Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
kubectl rollout status deployment/backend-deployment -n website --timeout=120s

Write-Host "Secrets updated successfully!" -ForegroundColor Green
Write-Host "Admin credentials:" -ForegroundColor Cyan
Write-Host "   Username: $adminUser" -ForegroundColor White
Write-Host "   Password: $adminPass" -ForegroundColor White
Write-Host "Access dashboard at: https://edwardstech.dev#/admin" -ForegroundColor Cyan