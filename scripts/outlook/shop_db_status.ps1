#Requires -Version 5.1
<#
.SYNOPSIS
    Check Machine Shop database status and statistics.
.DESCRIPTION
    Replaces: check_db_status.ps1, shop_status.ps1, get_shop_stats.ps1, check_status.ps1, check_new_shops.ps1
    Shows shop outreach statistics, contact status, and filtering by date.
.EXAMPLE
    .\shop_db_status.ps1 -Summary
    .\shop_db_status.ps1 -DateFilter "2026-04-01" -Detailed
#>
[CmdletBinding()]
param(
    [string]$CsvPath = "$env:USERPROFILE\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Data\Machine Shops.csv",
    [string]$DateFilter,          # Show shops contacted on specific date (YYYY-MM-DD)
    [switch]$Detailed,            # Show per-shop breakdown
    [switch]$Summary              # Show aggregate stats only
)

$comObjects = [System.Collections.Generic.List[object]]::new()

try {
    if (-not (Test-Path $CsvPath)) {
        Write-Error "CSV not found: $CsvPath"
        exit 1
    }

    $Shops = Import-Csv -Path $CsvPath
    
    $stats = @{
        Total = $Shops.Count
        NotContacted = ($Shops | Where-Object { $_.Status -eq 'Not Contacted' -or -not $_.Status }).Count
        Contacted = ($Shops | Where-Object { $_.Status -eq 'Contacted' }).Count
        Responded = ($Shops | Where-Object { $_.Status -eq 'Responded' }).Count
        Declined = ($Shops | Where-Object { $_.Status -eq 'Declined' }).Count
        NoEmail = ($Shops | Where-Object { -not $_.Email -or $_.Email -notmatch '@' }).Count
    }

    Write-Output "=== Machine Shop Database Status ==="
    Write-Output ""
    Write-Output "Total Shops:        $($stats.Total)"
    Write-Output "Not Contacted:      $($stats.NotContacted)"
    Write-Output "Contacted:          $($stats.Contacted)"
    Write-Output "Responded:          $($stats.Responded)"
    Write-Output "Declined:           $($stats.Declined)"
    Write-Output "No Valid Email:     $($stats.NoEmail)"
    Write-Output ""

    if ($DateFilter) {
        $dateShops = $Shops | Where-Object { $_.DateContacted -eq $DateFilter }
        Write-Output "Shops contacted on $DateFilter : $($dateShops.Count)"
        if ($Detailed -and $dateShops.Count -gt 0) {
            $dateShops | Select-Object Name, Location, Email, Status | Format-Table -AutoSize
        }
    }

    if ($Detailed -and -not $DateFilter) {
        Write-Output "=== Detailed Breakdown ==="
        $Shops | Group-Object Status | Select-Object Name, Count | Sort-Object Count -Descending | Format-Table -AutoSize
    }
}
catch {
    Write-Error "Failed: $_"
    exit 1
}
finally {
    for ($i = $comObjects.Count - 1; $i -ge 0; $i--) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($comObjects[$i]) | Out-Null } catch {}
    }
}
