# Paper Trail Website - GitHub Push Script
# Run this script to push the website to GitHub

Write-Host "📝 Paper Trail Website - GitHub Push" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: Please run this script from the paper-trail-website directory" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Configuring Git..." -ForegroundColor Yellow

# Configure git (if not already done)
git config user.email "admin@typewrite.club" 2>$null
git config user.name "Paper Trail Dev" 2>$null

# Check if remote exists
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/PaperTrail9/Website.git
}

Write-Host "📦 Adding files..." -ForegroundColor Yellow
git add .

Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Update website - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>$null

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Green
git push -u origin main --force

Write-Host ""
Write-Host "✅ Push complete!" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub repository:" -ForegroundColor Cyan
Write-Host "  https://github.com/PaperTrail9/Website" -ForegroundColor White
Write-Host ""
Write-Host "GitHub Actions will automatically deploy to Azure when you push to main." -ForegroundColor Gray
