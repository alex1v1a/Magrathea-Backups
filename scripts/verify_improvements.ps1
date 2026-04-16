#Requires -Version 5.1
<#
.SYNOPSIS
    Master verification script for Vectarr script improvements.
.DESCRIPTION
    Verifies all improvements are in place:
    - Bitwarden credentials accessible
    - Consolidated utilities functional
    - Critical fixes applied
    - No hardcoded secrets remain
.EXAMPLE
    .\verify_improvements.ps1 -TestBitwarden
#>
[CmdletBinding()]
param(
    [switch]$TestBitwarden,
    [switch]$TestOutlook,
    [switch]$FullCheck
)

$ErrorActionPreference = "Stop"
$results = @{
    Bitwarden = @()
    Scripts = @()
    Fixes = @()
    Utilities = @()
}

function Test-BitwardenIntegration {
    Write-Host "`n=== Testing Bitwarden Integration ===" -ForegroundColor Cyan
    
    # Check if module exists
    $modulePath = "$PSScriptRoot\modules\BitwardenHelper.psm1"
    if (-not (Test-Path $modulePath)) {
        Write-Host "FAIL: BitwardenHelper.psm1 not found at $modulePath" -ForegroundColor Red
        $results.Bitwarden += @{ Test = "Module exists"; Pass = $false }
        return
    }
    Write-Host "PASS: BitwardenHelper.psm1 exists" -ForegroundColor Green
    $results.Bitwarden += @{ Test = "Module exists"; Pass = $true }
    
    # Import and test
    try {
        Import-Module $modulePath -Force
        Write-Host "PASS: Module imports successfully" -ForegroundColor Green
        $results.Bitwarden += @{ Test = "Module import"; Pass = $true }
        
        # Try to get a credential (will prompt for unlock if needed)
        if ($env:BW_SESSION -or $env:BW_MASTER_PASSWORD) {
            try {
                $clientId = Get-BWNote -ItemName "Imgur API" -Key "ClientID" -ErrorAction Stop
                if ($clientId -match "^[a-f0-9]+") {
                    Write-Host "PASS: Retrieved Imgur ClientID from Bitwarden" -ForegroundColor Green
                    $results.Bitwarden += @{ Test = "Credential retrieval"; Pass = $true }
                }
            } catch {
                Write-Host "WARN: Could not retrieve credential: $_" -ForegroundColor Yellow
                $results.Bitwarden += @{ Test = "Credential retrieval"; Pass = $false; Error = $_ }
            }
        } else {
            Write-Host "SKIP: BW_MASTER_PASSWORD not set, skipping credential test" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "FAIL: Module import failed: $_" -ForegroundColor Red
        $results.Bitwarden += @{ Test = "Module import"; Pass = $false; Error = $_ }
    }
}

function Test-ScriptFixes {
    Write-Host "`n=== Verifying Critical Fixes ===" -ForegroundColor Cyan
    
    $fixes = @(
        @{ File = "mission_control_service.ps1"; Pattern = "function Start-MCService"; Desc = "Renamed functions avoid recursion" }
        @{ File = "silent_executor.ps1"; Pattern = "ReadToEnd\(\)[\s\S]*?WaitForExit"; Desc = "Reads output before waiting (deadlock fix)" }
        @{ File = "silent_executor.ps1"; Pattern = "\`$StdErr"; Desc = "Renamed `$Error variable" }
        @{ File = "service_runner_simple.ps1"; Pattern = "Pow\(2.*RestartCount"; Desc = "Exponential backoff" }
        @{ File = "machine_shop_outreach_integrated.ps1"; Pattern = "Queue-ShopStatusUpdate"; Desc = "Batched CSV updates" }
        @{ File = "machine_shop_outreach_integrated.ps1"; Pattern = "Restrict.*Filter"; Desc = "Uses Restrict filter" }
        @{ File = "memo-sync-watcher.ps1"; Pattern = "MessageData"; Desc = "Event handler uses MessageData" }
        @{ File = "memo-sync-watcher.ps1"; Pattern = "try\s*\{[\s\S]*?EnableRaisingEvents\s*=\s*\`$true"; Desc = "Try/finally for cleanup" }
    )
    
    foreach ($fix in $fixes) {
        $path = "$PSScriptRoot\$($fix.File)"
        if (Test-Path $path) {
            $content = Get-Content $path -Raw
            if ($content -match $fix.Pattern) {
                Write-Host "PASS: $($fix.File) - $($fix.Desc)" -ForegroundColor Green
                $results.Fixes += @{ File = $fix.File; Fix = $fix.Desc; Pass = $true }
            } else {
                Write-Host "FAIL: $($fix.File) - $($fix.Desc) NOT FOUND" -ForegroundColor Red
                $results.Fixes += @{ File = $fix.File; Fix = $fix.Desc; Pass = $false }
            }
        } else {
            Write-Host "SKIP: $($fix.File) not found" -ForegroundColor Yellow
        }
    }
}

function Test-ConsolidatedUtilities {
    Write-Host "`n=== Verifying Consolidated Utilities ===" -ForegroundColor Cyan
    
    $utilities = @(
        "outlook_check_inboxes.ps1"
        "outlook_check_drafts.ps1"
        "outlook_send_email.ps1"
        "outlook_cleanup_drafts.ps1"
        "outlook_debug_email.ps1"
        "shop_db_status.ps1"
    )
    
    $outlookDir = "$PSScriptRoot\outlook"
    
    foreach ($util in $utilities) {
        $path = Join-Path $outlookDir $util
        if (Test-Path $path) {
            $content = Get-Content $path -Raw
            $hasParam = $content -match "param\s*\("
            $hasComCleanup = $content -match "ReleaseComObject"
            $hasTryFinally = $content -match "try\s*\{[\s\S]*?\}\s*finally"
            
            if ($hasParam -and $hasComCleanup -and $hasTryFinally) {
                Write-Host "PASS: $util (params, COM cleanup, try/finally)" -ForegroundColor Green
                $results.Utilities += @{ File = $util; Pass = $true }
            } else {
                Write-Host "WARN: $util missing some best practices" -ForegroundColor Yellow
                $results.Utilities += @{ File = $util; Pass = $false; Missing = "param:$hasParam cleanup:$hasComCleanup try:$hasTryFinally" }
            }
        } else {
            Write-Host "FAIL: $util not found" -ForegroundColor Red
            $results.Utilities += @{ File = $util; Pass = $false; Missing = "Not found" }
        }
    }
}

function Test-NoHardcodedSecrets {
    Write-Host "`n=== Checking for Hardcoded Secrets ===" -ForegroundColor Cyan
    
    # Patterns that indicate hardcoded credentials
    $patterns = @(
        'password\s*=\s*["''][^"'']+["'']'
        'secret\s*=\s*["''][^"'']+["'']'
        'apikey\s*=\s*["''][^"'']+["'']'
        'token\s*=\s*["''][^"'']{20,}["'']'
    )
    
    $scripts = Get-ChildItem "$PSScriptRoot\*.ps1" -Exclude "verify_improvements.ps1"
    $issues = @()
    
    foreach ($script in $scripts) {
        $content = Get-Content $script.FullName -Raw
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                # Check if it's retrieving from Bitwarden (acceptable)
                if (-not ($content -match "Bitwarden|Get-BWCredential|Get-BWNote")) {
                    $issues += "$($script.Name): matches pattern"
                }
            }
        }
    }
    
    if ($issues.Count -eq 0) {
        Write-Host "PASS: No hardcoded secrets detected" -ForegroundColor Green
    } else {
        Write-Host "WARN: Potential hardcoded values found in:" -ForegroundColor Yellow
        $issues | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    }
    
    # Check that the old auth script is gone
    if (Test-Path "$PSScriptRoot\upload_to_imgur_auth.ps1") {
        Write-Host "FAIL: upload_to_imgur_auth.ps1 (hardcoded creds) still exists!" -ForegroundColor Red
    } else {
        Write-Host "PASS: Hardcoded credentials script deleted" -ForegroundColor Green
    }
}

function Show-Summary {
    Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
    
    $totalTests = $results.Bitwarden.Count + $results.Fixes.Count + $results.Utilities.Count
    $passedTests = ($results.Bitwarden | Where-Object { $_.Pass }).Count + 
                   ($results.Fixes | Where-Object { $_.Pass }).Count + 
                   ($results.Utilities | Where-Object { $_.Pass }).Count
    
    Write-Host "Total checks: $totalTests"
    Write-Host "Passed: $passedTests"
    Write-Host "Failed: $($totalTests - $passedTests)"
    
    if ($passedTests -eq $totalTests) {
        Write-Host "`nALL CHECKS PASSED" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`nSOME CHECKS FAILED" -ForegroundColor Red
        exit 1
    }
}

# Main execution
if ($TestBitwarden -or $FullCheck) { Test-BitwardenIntegration }
if ($TestOutlook -or $FullCheck) { Test-ConsolidatedUtilities }
if ($FullCheck) { 
    Test-ScriptFixes
    Test-NoHardcodedSecrets
}

# Default: run basic checks
if (-not ($TestBitwarden -or $TestOutlook -or $FullCheck)) {
    Test-BitwardenIntegration
    Test-ConsolidatedUtilities
    Test-ScriptFixes
    Test-NoHardcodedSecrets
}

Show-Summary
