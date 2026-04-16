# Mission Control Health Monitor
# Checks dashboard status and reports issues

param(
    [string]$DashboardUrl = "http://10.0.1.90:3000",
    [string]$ApiUrl = "http://10.0.1.90:8080",
    [switch]$ReportToDiscord
)

$Results = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Status = "Unknown"
    ApiHealth = $false
    FrontendHealth = $false
    BoardsAccessible = $false
    Issues = @()
}

# Check API health
try {
    $ApiResponse = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET -TimeoutSec 10
    if ($ApiResponse -eq "ok") {
        $Results.ApiHealth = $true
        Write-Host "✓ API Health: OK" -ForegroundColor Green
    } else {
        $Results.Issues += "API returned unexpected response: $ApiResponse"
        Write-Host "✗ API Health: Unexpected response" -ForegroundColor Red
    }
} catch {
    $Results.Issues += "API health check failed: $_"
    Write-Host "✗ API Health: Failed - $_" -ForegroundColor Red
}

# Check frontend
try {
    $FrontendResponse = Invoke-WebRequest -Uri $DashboardUrl -Method HEAD -TimeoutSec 10
    if ($FrontendResponse.StatusCode -eq 200) {
        $Results.FrontendHealth = $true
        Write-Host "✓ Frontend: Accessible" -ForegroundColor Green
    } else {
        $Results.Issues += "Frontend returned status code: $($FrontendResponse.StatusCode)"
        Write-Host "✗ Frontend: Status $($FrontendResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    $Results.Issues += "Frontend check failed: $_"
    Write-Host "✗ Frontend: Failed - $_" -ForegroundColor Red
}

# Determine overall status
if ($Results.ApiHealth -and $Results.FrontendHealth) {
    $Results.Status = "Healthy"
} elseif ($Results.ApiHealth -or $Results.FrontendHealth) {
    $Results.Status = "Degraded"
} else {
    $Results.Status = "Down"
}

# Output summary
Write-Host ""
Write-Host "Mission Control Status: $($Results.Status)" -ForegroundColor $(
    if ($Results.Status -eq "Healthy") { "Green" }
    elseif ($Results.Status -eq "Degraded") { "Yellow" }
    else { "Red" }
)

if ($Results.Issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Issues Detected:" -ForegroundColor Red
    $Results.Issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

# Save results
$OutputDir = "$PSScriptRoot\..\mission-control-health"
$null = New-Item -ItemType Directory -Force -Path $OutputDir
$OutputFile = "$OutputDir\health_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$Results | ConvertTo-Json | Out-File -FilePath $OutputFile
Write-Host ""
Write-Host "Results saved to: $OutputFile"

# Return exit code for automation
if ($Results.Status -eq "Healthy") {
    exit 0
} elseif ($Results.Status -eq "Degraded") {
    exit 1
} else {
    exit 2
}
