# Configure Docker Desktop to allow insecure registry access
# This script helps configure the insecure registry setting for your local Docker registry

Write-Host "=" * 80
Write-Host "Docker Insecure Registry Configuration Helper" -ForegroundColor Cyan
Write-Host "=" * 80
Write-Host ""

$registryUrl = "192.168.0.40:5000"

Write-Host "You need to configure Docker Desktop to allow insecure registry access to: $registryUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Follow these steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open Docker Desktop" -ForegroundColor White
Write-Host "2. Click the Settings (gear icon) in the top right" -ForegroundColor White
Write-Host "3. Go to 'Docker Engine' in the left sidebar" -ForegroundColor White
Write-Host "4. In the JSON configuration, find or add the 'insecure-registries' section:" -ForegroundColor White
Write-Host ""
Write-Host '   {' -ForegroundColor Gray
Write-Host '     "builder": {' -ForegroundColor Gray
Write-Host '       "gc": {' -ForegroundColor Gray
Write-Host '         "defaultKeepStorage": "20GB",' -ForegroundColor Gray
Write-Host '         "enabled": true' -ForegroundColor Gray
Write-Host '       }' -ForegroundColor Gray
Write-Host '     },' -ForegroundColor Gray
Write-Host '     "experimental": false,' -ForegroundColor Gray
Write-Host '     "insecure-registries": [' -ForegroundColor Yellow
Write-Host "       `"$registryUrl`"" -ForegroundColor Yellow
Write-Host '     ]' -ForegroundColor Yellow
Write-Host '   }' -ForegroundColor Gray
Write-Host ""
Write-Host "5. Click 'Apply & restart' button" -ForegroundColor White
Write-Host "6. Wait for Docker to restart (this may take 1-2 minutes)" -ForegroundColor White
Write-Host ""
Write-Host "After Docker restarts, run the build-and-deploy.ps1 script again." -ForegroundColor Green
Write-Host ""

# Test if registry is accessible
Write-Host "Testing registry connectivity..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://$registryUrl/v2/_catalog" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Registry is accessible!" -ForegroundColor Green
    Write-Host "  Available repositories:" -ForegroundColor White
    $catalog = $response.Content | ConvertFrom-Json
    if ($catalog.repositories) {
        $catalog.repositories | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
    } else {
        Write-Host "    (none yet)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Cannot reach registry at http://$registryUrl" -ForegroundColor Red
    Write-Host "  Make sure your Docker registry is running on the Pi" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 80
Write-Host ""
