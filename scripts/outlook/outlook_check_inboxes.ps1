<#
.SYNOPSIS
    Check Outlook inboxes across multiple accounts for unread/recent emails.
.DESCRIPTION
    Replaces: check_all_inboxes.ps1, check_inbox.ps1, check_sales_inbox.ps1, debug_monitor.ps1
    Enumerates Outlook accounts and displays inbox items with flexible filtering.
.EXAMPLE
    .\outlook_check_inboxes.ps1
    .\outlook_check_inboxes.ps1 -Accounts "sales@vectarr.com","admin@vectarr.com" -DateFilter "today"
    .\outlook_check_inboxes.ps1 -UnreadOnly -Limit 5
#>
[CmdletBinding()]
param(
    [string[]]$Accounts,
    [switch]$UnreadOnly = $true,
    [int]$Limit = 20,
    [string]$DateFilter
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

    # Build date restriction string
    $dateRestriction = $null
    if ($DateFilter) {
        switch ($DateFilter.ToLower()) {
            "today"     { $afterDate = (Get-Date).Date }
            "yesterday" { $afterDate = (Get-Date).Date.AddDays(-1) }
            "7d"        { $afterDate = (Get-Date).Date.AddDays(-7) }
            default     {
                try { $afterDate = [DateTime]::Parse($DateFilter) }
                catch { Write-Error "Invalid DateFilter: $DateFilter. Use 'today', 'yesterday', '7d', or a date string."; return }
            }
        }
        $dateRestriction = "[ReceivedTime] >= '$($afterDate.ToString("MM/dd/yyyy HH:mm"))'"
    }

    # Discover accounts: all @vectarr.com + typewrite by default
    $allAccounts = @()
    foreach ($acct in $Namespace.Accounts) {
        $allAccounts += $acct
    }

    if ($Accounts -and $Accounts.Count -gt 0) {
        $filteredAccounts = $allAccounts | Where-Object {
            $smtp = $_.SmtpAddress
            $Accounts | Where-Object { $smtp -like "*$_*" }
        }
    } else {
        $filteredAccounts = $allAccounts | Where-Object {
            $_.SmtpAddress -like "*@vectarr.com" -or $_.SmtpAddress -like "*typewrite*"
        }
    }

    Write-Verbose "Checking $($filteredAccounts.Count) account(s)"

    foreach ($acct in $filteredAccounts) {
        $smtp = $acct.SmtpAddress
        Write-Verbose "Processing account: $smtp"

        try {
            $storeFolder = $Namespace.Folders.Item($smtp)
            Register-Com $storeFolder | Out-Null
            $inbox = $storeFolder.Folders.Item("Inbox")
            Register-Com $inbox | Out-Null

            # Build combined restriction
            $restrictions = @()
            if ($UnreadOnly) {
                $restrictions += "[UnRead] = true"
            }
            if ($dateRestriction) {
                $restrictions += $dateRestriction
            }

            if ($restrictions.Count -gt 0) {
                $filter = $restrictions -join " AND "
                $items = $inbox.Items.Restrict($filter)
            } else {
                $items = $inbox.Items
            }
            Register-Com $items | Out-Null

            $items.Sort("ReceivedTime", $true)

            $count = 0
            $results = @()
            foreach ($item in $items) {
                if ($count -ge $Limit) { break }
                $results += [PSCustomObject]@{
                    Account      = $smtp
                    Subject      = $item.Subject
                    From         = $item.SenderName
                    FromEmail    = $item.SenderEmailAddress
                    Received     = $item.ReceivedTime
                    Unread       = $item.UnRead
                }
                $count++
            }

            if ($results.Count -gt 0) {
                Write-Output "=== $smtp ($($results.Count) item(s)) ==="
                foreach ($r in $results) {
                    $flag = if ($r.Unread) { "[UNREAD]" } else { "[READ]" }
                    Write-Output "  $flag $($r.Received.ToString('yyyy-MM-dd HH:mm')) | $($r.From) | $($r.Subject)"
                }
                Write-Output ""
            } else {
                Write-Verbose "  $smtp - no matching items"
            }
        }
        catch {
            Write-Warning "Error checking ${smtp}: $_"
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
