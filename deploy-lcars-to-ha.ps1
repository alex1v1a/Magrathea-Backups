# LCARS Theme Deployment Script for Home Assistant
# Save to: C:\Users\Admin\.openclaw\workspace\deploy-lcars-to-ha.ps1
# Run as Administrator in PowerShell

Write-Host "=== LCARS THEME DEPLOYMENT FOR HOME ASSISTANT ===" -ForegroundColor Red
Write-Host ""

# Configuration
$sourceDir = "C:\Users\Admin\.openclaw\workspace\home-assistant-lcars"
$targetDir = "C:\opt\homeassistant\config"

# Check if running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "⚠️  Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    exit 1
}

# Check source directory
Write-Host "📂 Checking source directory..." -ForegroundColor Cyan
if (-not (Test-Path $sourceDir)) {
    Write-Host "❌ Source not found: $sourceDir" -ForegroundColor Red
    Write-Host "   Please ensure LCARS theme files are downloaded" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✅ Source found: $sourceDir" -ForegroundColor Green

# Check target directory
Write-Host ""
Write-Host "📂 Checking target directory..." -ForegroundColor Cyan
if (-not (Test-Path $targetDir)) {
    Write-Host "⚠️  Target not found: $targetDir" -ForegroundColor Yellow
    Write-Host "   Creating directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}
Write-Host "  ✅ Target: $targetDir" -ForegroundColor Green

# Create directory structure
Write-Host ""
Write-Host "🔧 Creating directory structure..." -ForegroundColor Cyan
$directories = @(
    "$targetDir\themes",
    "$targetDir\www\lcars\css",
    "$targetDir\www\lcars\fonts",
    "$targetDir\www\lcars\backgrounds",
    "$targetDir\www\lcars\sounds",
    "$targetDir\lovelace\dashboards",
    "$targetDir\packages\lcars_theme"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Exists: $dir" -ForegroundColor Gray
    }
}

# Copy themes
Write-Host ""
Write-Host "🎨 Copying themes..." -ForegroundColor Cyan
$themeSource = "$sourceDir\themes"
if (Test-Path $themeSource) {
    Copy-Item -Path "$themeSource\*" -Destination "$targetDir\themes" -Recurse -Force
    $themeCount = (Get-ChildItem "$targetDir\themes" -File).Count
    Write-Host "  ✅ Copied $themeCount theme files" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No themes directory found at source" -ForegroundColor Yellow
}

# Copy www assets
Write-Host ""
Write-Host "🌐 Copying www assets..." -ForegroundColor Cyan
$wwwSource = "$sourceDir\www"
if (Test-Path $wwwSource) {
    # Copy to www/lcars subdirectory
    Copy-Item -Path "$wwwSource\*" -Destination "$targetDir\www\lcars" -Recurse -Force
    Write-Host "  ✅ Copied www assets to www/lcars/" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No www directory found at source" -ForegroundColor Yellow
}

# Copy packages
Write-Host ""
Write-Host "📦 Copying packages..." -ForegroundColor Cyan
$packageSource = "$sourceDir\packages"
if (Test-Path $packageSource) {
    Copy-Item -Path "$packageSource\*" -Destination "$targetDir\packages\lcars_theme" -Recurse -Force
    Write-Host "  ✅ Copied packages to packages/lcars_theme/" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No packages directory found at source" -ForegroundColor Yellow
}

# Copy dashboards
Write-Host ""
Write-Host "📊 Copying dashboards..." -ForegroundColor Cyan
$lovelaceSource = "$sourceDir\lovelace"
if (Test-Path $lovelaceSource) {
    Copy-Item -Path "$lovelaceSource\*" -Destination "$targetDir\lovelace\dashboards" -Recurse -Force
    Write-Host "  ✅ Copied dashboards to lovelace/dashboards/" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No lovelace directory found at source" -ForegroundColor Yellow
}

# Check and update configuration.yaml
Write-Host ""
Write-Host "⚙️  Checking configuration.yaml..." -ForegroundColor Cyan
$configFile = "$targetDir\configuration.yaml"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    
    # Check for themes inclusion
    if ($configContent -notmatch "themes:\s*!include_dir_merge_named") {
        Write-Host "  ⚠️  Adding themes configuration..." -ForegroundColor Yellow
        Add-Content $configFile "`nfrontend:`n  themes: !include_dir_merge_named themes"
        Write-Host "  ✅ Added themes configuration" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Themes already configured" -ForegroundColor Green
    }
    
    # Check for packages inclusion
    if ($configContent -notmatch "packages:\s*!include_dir_named") {
        Write-Host "  ⚠️  Adding packages configuration..." -ForegroundColor Yellow
        Add-Content $configFile "`nhomeassistant:`n  packages: !include_dir_named packages"
        Write-Host "  ✅ Added packages configuration" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Packages already configured" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  configuration.yaml not found" -ForegroundColor Yellow
}

# Restart HA to apply changes
Write-Host ""
Write-Host "🔄 Restarting Home Assistant..." -ForegroundColor Yellow
try {
    wsl bash -c "sudo docker restart homeassistant" 2>&1 | Out-Null
    Write-Host "  ✅ HA restart initiated" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Could not restart HA automatically" -ForegroundColor Yellow
    Write-Host "     Please restart manually: wsl bash -c 'sudo docker restart homeassistant'" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LCARS DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor White
Write-Host "  ✅ Themes deployed to: $targetDir\themes\" -ForegroundColor Gray
Write-Host "  ✅ Assets deployed to: $targetDir\www\lcars\" -ForegroundColor Gray
Write-Host "  ✅ Packages deployed to: $targetDir\packages\lcars_theme\" -ForegroundColor Gray
Write-Host "  ✅ Dashboards deployed to: $targetDir\lovelace\dashboards\" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Access Home Assistant:" -ForegroundColor Yellow
Write-Host "   http://10.0.1.90:8123" -ForegroundColor White
Write-Host ""
Write-Host "🎨 To activate LCARS theme:" -ForegroundColor Yellow
Write-Host "   1. Go to your profile (click your username)" -ForegroundColor White
Write-Host "   2. Select 'LCARS' or 'Star Trek LCARS' from theme dropdown" -ForegroundColor White
Write-Host "   3. Enjoy your LCARS interface!" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Wait 30-60 seconds for HA to fully restart" -ForegroundColor Yellow
Write-Host ""
