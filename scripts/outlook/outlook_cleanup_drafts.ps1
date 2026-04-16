#Requires -Version 5.1
<#
.SYNOPSIS
    Clean up Outlook drafts based on date filters.
.DESCRIPTION
    Replaces: cleanup_drafts.ps1, cleanup_and_check.ps1, delete_april3_drafts.ps1
    Deletes drafts matching criteria with -WhatIf support.
.EXAMPLE
    .\outlook_cleanup_drafts.ps1 -OlderThan "2026-04-01" -WhatIf
    .\outlook_cleanup_drafts.ps1 -CreatedOn "2026-03-24" -SubjectMatch "Partnership"
#>
[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [string]$Account = "admin@vectarr.com",
    [string]$OlderThan,           # Delete drafts older than this date (YYYY-MM-DD)
    [string]$CreatedOn,           # Delete drafts from this specific date
    [string]$SubjectMatch,        # Filter by subject pattern (wildcard supported)
    [switch]$WhatIf               # Preview without deleting
)

$comObjects = [System.Collections.Generic.List[object]]::new()
$itemsToDelete = [System.Collections.Generic.List[object]]::new()

try {
    $Outlook = New-Object -ComObject Outlook.Application
    $comObjects.Add($Outlook)

    $Namespace = $Outlook.GetNamespace("MAPI")
    $comObjects.Add($Namespace)

    # Find account
    $TargetAccount = $null
    foreach ($acct in $Namespace.Accounts) {
        if ($acct.SmtpAddress -ieq $Account) {
            $TargetAccount = $acct
            break
        }
    }

    if (-not $TargetAccount) {
        Write-Error "Account not found: $Account"
        return
    }

    $AccountName = $TargetAccount.DisplayName
    $DraftsFolder = $Namespace.Folders($AccountName).Folders("Drafts")
    $comObjects.Add($DraftsFolder)

    # Build restriction filter if dates specified
    $filter = ""
    if ($OlderThan) {
        $cutoff = [datetime]::Parse($OlderThan)
        $filter = "[CreationTime] < '$($cutoff.ToString('g'))'"
    }
    
    $items = if ($filter) { $DraftsFolder.Items.Restrict($filter) } else { $DraftsFolder.Items }

    foreach ($item in $items) {
        if ($CreatedOn) {
            $createDate = $item.CreationTime.ToString("yyyy-MM-dd")
            if ($createDate -ne $CreatedOn) { continue }
        }
        if ($SubjectMatch -and $item.Subject -notlike $SubjectMatch) { continue }
        
        $itemsToDelete.Add($item)
    }

    Write-Output "Found $($itemsToDelete.Count) drafts matching criteria"

    foreach ($item in $itemsToDelete) {
        $info = "From=$($item.SentOnBehalfOfName) Subject='$($item.Subject)' Created=$($item.CreationTime)"
        if ($PSCmdlet.ShouldProcess($info, "DELETE")) {
            try {
                $item.Delete()
                Write-Output "DELETED: $info"
            } catch {
                Write-Warning "Failed to delete: $_"
            }
        } else {
            Write-Output "Would delete: $info"
        }
    }
}
catch {
    Write-Error "Failed: $_"
}
finally {
    for ($i = $comObjects.Count - 1; $i -ge 0; $i--) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($comObjects[$i]) | Out-Null } catch {}
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
