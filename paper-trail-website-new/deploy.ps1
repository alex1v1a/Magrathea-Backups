# Paper Trail Website Deployment Script
# Run this script to deploy the website to Azure Static Web Apps

Write-Host "📝 Paper Trail Website Deployment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: Please run this script from the paper-trail-website directory" -ForegroundColor Red
    exit 1
}

# Azure deployment token
$token = "b504b07db5e59e1bfb3a463ebcd5d14280bedb6d344b63fcd09dba30db676c2a06-bf41dacc-405e-4542-9a18-818c148af49701019170d0893d10"

Write-Host "📦 Checking for Azure SWA CLI..." -ForegroundColor Yellow

# Check if SWA CLI is installed
$swa = Get-Command swa -ErrorAction SilentlyContinue
if (-not $swa) {
    Write-Host "🔧 Installing Azure Static Web Apps CLI..." -ForegroundColor Yellow
    npm install -g @azure/static-web-apps-cli
}

Write-Host "🚀 Deploying to Azure Static Web Apps..." -ForegroundColor Green
Write-Host "Environment: Production" -ForegroundColor Gray
Write-Host ""

# Deploy
swa deploy --deployment-token $token --env production

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your website should be live at:" -ForegroundColor Cyan
Write-Host "  https://polite-mushroom-02002cf1e.azurestaticapps.net" -ForegroundColor White
Write-Host ""
Write-Host "Note: It may take a few minutes for changes to propagate." -ForegroundColor Gray
