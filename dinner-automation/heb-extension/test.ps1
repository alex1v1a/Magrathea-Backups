# Quick Test Script for HEB Auto-Cart Extension
# This validates the extension structure

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "HEB Auto-Cart Extension Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$extensionDir = "C:\Users\Admin\.openclaw\workspace\dinner-automation\heb-extension"
$requiredFiles = @(
    "manifest.json",
    "popup.html",
    "popup.js",
    "content.js",
    "background.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png"
)

Write-Host ""
Write-Host "Checking required files..." -ForegroundColor Yellow

$allFound = $true
foreach ($file in $requiredFiles) {
    $path = Join-Path $extensionDir $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "  [OK] $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $allFound = $false
    }
}

Write-Host ""
Write-Host "Checking manifest..." -ForegroundColor Yellow
$manifestPath = Join-Path $extensionDir "manifest.json"
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath | ConvertFrom-Json
        Write-Host "  [OK] Manifest version: $($manifest.version)" -ForegroundColor Green
        Write-Host "  [OK] Extension name: $($manifest.name)" -ForegroundColor Green
        Write-Host "  [OK] Permissions: $($manifest.permissions -join ', ')" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Manifest JSON is invalid!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Checking weekly plan..." -ForegroundColor Yellow
$planPath = "C:\Users\Admin\.openclaw\workspace\dinner-automation\data\weekly-plan.json"
if (Test-Path $planPath) {
    try {
        $plan = Get-Content $planPath | ConvertFrom-Json
        $mealCount = $plan.meals.Count
        $ingredientCount = 0
        foreach ($meal in $plan.meals) {
            $ingredientCount += $meal.ingredients.Count
        }
        Write-Host "  [OK] Week of: $($plan.weekOf)" -ForegroundColor Green
        Write-Host "  [OK] Meals: $mealCount" -ForegroundColor Green
        Write-Host "  [OK] Total ingredients: $ingredientCount" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Weekly plan JSON is invalid!" -ForegroundColor Red
    }
} else {
    Write-Host "  [MISSING] Weekly plan not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($allFound) {
    Write-Host "SUCCESS: All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open chrome://extensions/" -ForegroundColor White
    Write-Host "  2. Enable Developer Mode" -ForegroundColor White
    Write-Host "  3. Click 'Load unpacked'" -ForegroundColor White
    Write-Host "  4. Select: $extensionDir" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERROR: Some files are missing!" -ForegroundColor Red
}
Write-Host "======================================" -ForegroundColor Cyan
