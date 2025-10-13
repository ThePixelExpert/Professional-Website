# Production Deployment Script
# WARNING: Only use after completing SECURITY_CHECKLIST.md

param(
    [string]$Environment = "production",
    [switch]$DryRun = $false,
    [switch]$SecurityCheck = $false
)

Write-Host "🚀 Edwards Engineering Production Deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Security Pre-check
if ($SecurityCheck) {
    Write-Host "`n🔒 Running Security Pre-check..." -ForegroundColor Red
    
    # Check for hardcoded secrets
    $suspiciousFiles = @()
    
    # Check for localhost URLs in source
    $localhostMatches = Select-String -Path "src\**\*.js" -Pattern "localhost:300[0-9]" -ErrorAction SilentlyContinue
    if ($localhostMatches) {
        $suspiciousFiles += "❌ Found localhost URLs in source files"
        $localhostMatches | ForEach-Object { Write-Host "   $($_.Filename):$($_.LineNumber)" -ForegroundColor Red }
    }
    
    # Check for test Stripe keys
    $stripeMatches = Select-String -Path "**\*" -Pattern "pk_test_|sk_test_" -ErrorAction SilentlyContinue
    if ($stripeMatches) {
        $suspiciousFiles += "❌ Found test Stripe keys"
        $stripeMatches | ForEach-Object { Write-Host "   $($_.Filename):$($_.LineNumber)" -ForegroundColor Red }
    }
    
    # Check for .env files
    $envFiles = Get-ChildItem -Path "." -Name ".env*" -Recurse -ErrorAction SilentlyContinue
    if ($envFiles) {
        $suspiciousFiles += "❌ Found .env files (should not be committed)"
        $envFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
    
    # Check for hardcoded passwords
    $passwordMatches = Select-String -Path "**\*" -Pattern "password.*=.*[\"'].*[\"']" -ErrorAction SilentlyContinue
    if ($passwordMatches) {
        $suspiciousFiles += "❌ Found potential hardcoded passwords"
        $passwordMatches | ForEach-Object { Write-Host "   $($_.Filename):$($_.LineNumber)" -ForegroundColor Red }
    }
    
    if ($suspiciousFiles.Count -gt 0) {
        Write-Host "`n❌ SECURITY ISSUES FOUND! Cannot deploy safely." -ForegroundColor Red
        Write-Host "Please fix these issues before deployment:" -ForegroundColor Red
        $suspiciousFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        exit 1
    } else {
        Write-Host "✅ Security pre-check passed!" -ForegroundColor Green
    }
}

if ($DryRun) {
    Write-Host "`n🧪 DRY RUN MODE - No actual deployment" -ForegroundColor Yellow
}

# Check environment variables are set
$requiredEnvVars = @(
    "STRIPE_SECRET_KEY",
    "JWT_SECRET", 
    "ADMIN_PASS",
    "DB_PASSWORD",
    "EMAIL_APP_PASSWORD"
)

Write-Host "`n🔍 Checking environment configuration..." -ForegroundColor Blue
foreach ($envVar in $requiredEnvVars) {
    if ([string]::IsNullOrEmpty((Get-Item "env:$envVar" -ErrorAction SilentlyContinue).Value)) {
        Write-Host "❌ Missing environment variable: $envVar" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ $envVar is configured" -ForegroundColor Green
    }
}

# Build Docker images
Write-Host "`n🔨 Building Docker images..." -ForegroundColor Blue
if (!$DryRun) {
    docker build -f Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:latest .
    docker build -f Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:latest .
    
    # Push to registry
    Write-Host "📤 Pushing images to registry..." -ForegroundColor Blue
    docker push 192.168.0.40:5000/edwards-frontend:latest
    docker push 192.168.0.40:5000/edwards-backend:latest
}

# Update Kubernetes secrets
Write-Host "`n🔐 Updating Kubernetes secrets..." -ForegroundColor Blue
if (!$DryRun) {
    # Create/update backend secrets
    kubectl create secret generic backend-secrets `
        --from-literal=jwt-secret="$env:JWT_SECRET" `
        --from-literal=admin-user="$env:ADMIN_USER" `
        --from-literal=admin-password="$env:ADMIN_PASS" `
        --from-literal=stripe-secret-key="$env:STRIPE_SECRET_KEY" `
        --from-literal=email-user="$env:EMAIL_USER" `
        --from-literal=email-password="$env:EMAIL_APP_PASSWORD" `
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Update database secret
    $dbPasswordBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:DB_PASSWORD))
    (Get-Content k8s\database\postgres-deployment.yaml) -replace '<REPLACE_WITH_SECURE_BASE64_PASSWORD>', $dbPasswordBase64 | Set-Content k8s\database\postgres-deployment-temp.yaml
    kubectl apply -f k8s\database\postgres-deployment-temp.yaml
    Remove-Item k8s\database\postgres-deployment-temp.yaml
}

# Deploy to Kubernetes
Write-Host "`n🚀 Deploying to Kubernetes..." -ForegroundColor Blue
if (!$DryRun) {
    kubectl apply -f k8s/
    
    # Wait for rollout
    kubectl rollout status deployment/edwards-frontend-deployment -n website
    kubectl rollout status deployment/edwards-backend-deployment -n website
    kubectl rollout status statefulset/postgres -n website
}

Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Access your application at: https://edwards-engineering.dev" -ForegroundColor Cyan

# Show pod status
Write-Host "`n📋 Current pod status:" -ForegroundColor Blue
kubectl get pods -n website