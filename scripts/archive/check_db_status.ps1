$csvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv"
$csv = Import-Csv $csvPath
$total = $csv.Count
$contacted = ($csv | Where-Object { $_."Date First Contacted" -ne "" -and $_."Date First Contacted" -ne $null }).Count
$withEmail = ($csv | Where-Object { $_."Email" -ne "" -and $_."Email" -ne $null }).Count
$uncontactedWithEmail = ($csv | Where-Object { ($_."Date First Contacted" -eq "" -or $_."Date First Contacted" -eq $null) -and ($_."Email" -ne "" -and $_."Email" -ne $null) }).Count
Write-Host "Database Status:"
Write-Host "  Total shops: $total"
Write-Host "  With email: $withEmail"
Write-Host "  Contacted: $contacted"
Write-Host "  Uncontacted with email: $uncontactedWithEmail"

# Show the 6 that were just processed
Write-Host ""
Write-Host "Shops marked as contacted today (2026-04-06):"
$csv | Where-Object { $_."Date First Contacted" -like "*2026-04-06*" -or $_."Date First Contacted" -like "*4/6/2026*" } | ForEach-Object {
    Write-Host "  $($_.'Shop Name') - $($_.'Email') - $($_.'Date First Contacted') - Outreach: $($_.'Outreach Status')"
}

# Show shops contacted on 2026-04-04 and 2026-04-05
Write-Host ""
Write-Host "Shops contacted April 4-5:"
$csv | Where-Object { $_."Date First Contacted" -ne "" -and $_."Date First Contacted" -ne $null } | ForEach-Object {
    try {
        $date = [DateTime]::Parse($_."Date First Contacted")
        if ($date -ge [DateTime]"2026-04-04" -and $date -le [DateTime]"2026-04-05") {
            Write-Host "  $($_.'Shop Name') - $($_.'Email') - $($date.ToString('yyyy-MM-dd'))"
        }
    } catch {}
}
