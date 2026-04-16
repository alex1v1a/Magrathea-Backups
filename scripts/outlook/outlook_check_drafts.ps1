<#
.SYNOPSIS
    Check Outlook drafts across accounts with flexible filtering.
.DESCRIPTION
    Replaces: check_drafts.ps1, check_draft_full.ps1, check_latest_draft.ps1,
    list_all_drafts.ps1, view_draft.ps1, view_sales_draft.ps1, full_draft_check.ps1, find_drafts.ps1
.EXAMPLE
    .\outlook_check_drafts.ps1
    .\outlook_check_drafts.ps1 -Account "admin@vectarr.com" -ShowBody -Limit 5
    .\outlook_check_drafts.ps1 -DateFilter "today"
#>
[CmdletBinding()]
param(
    [string]$Account,
    [string]$DateFilter,
    [switch]$ShowBody,
    [int]$Limit = 50
)

$comObjects = [System.Collections.Generic.List[object]]::new()

function Register-Com($obj) {
    if ($obj) { $comObjects.Add($obj) }
    return $obj
}

try {
    $Outlook = New-Object -ComObject Outlook.Application
    $comObjects.Add($Outlook)
    $Namespace = $Outlook.GetNamespace("MAPI")
    $comObjects.Add($Namespace)

    # Build date filter for Restrict
    $dateRestriction = $null
    if ($DateFilter) {
        switch ($DateFilter.ToLower()) {
            "today"     { $afterDate = (Get-Date).Date; $beforeDate = (Get-Date).Date.AddDays(1) }
            "yesterday" { $afterDate = (Get-Date).Date.AddDays(-1); $beforeDate = (Get-Date).Date }
            "7d"        { $afterDate = (Get-Date).Date.AddDays(-7); $beforeDate = $null }
            default     {
                try {
                    $afterDate = [DateTime]::Parse($DateFilter).Date
                    $beforeDate = $afterDate.AddDays(1)
                }
                catch { Write-Error "Invalid DateFilter: $DateFilter"; return }
            }
        }
        if ($beforeDate) {
            $dateRestriction = "[CreationTime] >= '$($afterDate.ToString("MM/dd/yyyy"))' AND [CreationTime] < '$($beforeDate.ToString("MM/dd/yyyy"))'"
        } else {
            $dateRestriction = "[CreationTime] >= '$($afterDate.ToString("MM/dd/yyyy"))'"
        }
    }

    # Collect stores to check
    $storesToCheck = @()
    foreach ($store in $Namespace.Stores) {
        if ($Account) {
            if ($store.DisplayName -like "*$Account*") {
                $storesToCheck += $store
            }
        } else {
            # Default: all vectarr + typewrite stores
            if ($store.DisplayName -like "*@vectarr.com" -or $store.DisplayName -like "*typewrite*") {
                $storesToCheck += $store
            }
        }
    }

    if ($storesToCheck.Count -eq 0) {
        Write-Warning "No matching stores found. Available stores:"
        foreach ($store in $Namespace.Stores) {
            Write-Warning "  - $($store.DisplayName)"
        }
        return
    }

    foreach ($store in $storesToCheck) {
        Register-Com $store | Out-Null
        Write-Verbose "Checking store: $($store.DisplayName)"

        try {
            $root = $store.GetRootFolder()
            Register-Com $root | Out-Null

            $draftsFolder = $null
            foreach ($folder in $root.Folders) {
                if ($folder.Name -eq "Drafts") {
                    $draftsFolder = $folder
                    break
                }
            }

            if (-not $draftsFolder) {
                Write-Verbose "  No Drafts folder in $($store.DisplayName)"
                continue
            }
            Register-Com $draftsFolder | Out-Null

            if ($dateRestriction) {
                $items = $draftsFolder.Items.Restrict($dateRestriction)
            } else {
                $items = $draftsFolder.Items
            }
            Register-Com $items | Out-Null

            $items.Sort("CreationTime", $true)

            $count = 0
            $draftList = @()

            foreach ($item in $items) {
                if ($count -ge $Limit) { break }
                $draftList += [PSCustomObject]@{
                    Account     = $store.DisplayName
                    Subject     = $item.Subject
                    To          = $item.To
                    Created     = $item.CreationTime
                    BodyPreview = if ($ShowBody) { $item.HTMLBody } else { $null }
                }
                $count++
            }

            Write-Output "=== $($store.DisplayName) Drafts ($($draftList.Count) shown) ==="
            if ($draftList.Count -eq 0) {
                Write-Output "  (none)"
            }
            foreach ($d in $draftList) {
                Write-Output "  [$($d.Created.ToString('yyyy-MM-dd HH:mm'))] $($d.Subject) | To: $($d.To)"
                if ($ShowBody -and $d.BodyPreview) {
                    Write-Output "  --- HTML Body ---"
                    Write-Output $d.BodyPreview
                    Write-Output "  --- End Body ---"
                }
            }
            Write-Output ""
        }
        catch {
            Write-Warning "Error checking $($store.DisplayName): $_"
        }
    }
}
finally {
    for ($i = $comObjects.Count - 1; $i -ge 0; $i--) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($comObjects[$i]) | Out-Null } catch {}
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
