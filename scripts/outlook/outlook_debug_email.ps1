#Requires -Version 5.1
<#
.SYNOPSIS
    Debug Outlook email properties and MAPI details.
.DESCRIPTION
    Replaces: all 9 debug_*.ps1 scripts
    Shows detailed properties of emails for troubleshooting.
.EXAMPLE
    .\outlook_debug_email.ps1 -Account "admin@vectarr.com" -ShowAllProperties
    .\outlook_debug_email.ps1 -Folder "Sent Items" -ShowSenderDetails -Limit 3
#>
[CmdletBinding()]
param(
    [string]$Account = "asferrazza@vectarr.com",
    [string]$Folder = "Inbox",
    [switch]$ShowMAPIProps,
    [switch]$ShowSenderDetails,
    [switch]$ShowReplyTo,
    [switch]$ShowAllProperties,
    [int]$Limit = 5
)

$comObjects = [System.Collections.Generic.List[object]]::new()

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
        Write-Output "Available accounts:"
        foreach ($acct in $Namespace.Accounts) {
            Write-Output "  - $($acct.SmtpAddress)"
        }
        return
    }

    $AccountName = $TargetAccount.DisplayName
    try {
        $TargetFolder = $Namespace.Folders($AccountName).Folders($Folder)
        $comObjects.Add($TargetFolder)
    } catch {
        Write-Error "Folder '$Folder' not found in $Account. Available folders:"
        $Namespace.Folders($AccountName).Folders | ForEach-Object { Write-Output "  - $($_.Name)" }
        return
    }

    Write-Output "=== Debugging $Folder for $Account ==="
    Write-Output "Item count: $($TargetFolder.Items.Count)"
    Write-Output ""

    $count = 0
    foreach ($item in $TargetFolder.Items | Sort-Object ReceivedTime -Descending) {
        if ($count -ge $Limit) { break }
        $count++

        Write-Output "--- Item $count ---"
        Write-Output "Subject:      $($item.Subject)"
        Write-Output "EntryID:      $($item.EntryID.Substring(0,20))..."
        Write-Output "MessageClass: $($item.MessageClass)"
        Write-Output "Received:     $($item.ReceivedTime)"
        Write-Output "Unread:       $($item.UnRead)"

        if ($ShowSenderDetails -or $ShowAllProperties) {
            Write-Output "SenderName:   $($item.SenderName)"
            Write-Output "SenderEmail:  $($item.SenderEmailAddress)"
            Write-Output "SentBy:       $($item.SentOnBehalfOfName)"
        }

        if ($ShowReplyTo -or $ShowAllProperties) {
            Write-Output "ReplyTo:      $($item.ReplyRecipientNames)"
        }

        if ($ShowMAPIProps -or $ShowAllProperties) {
            Write-Output "MAPI Properties:"
            try {
                # Common MAPI properties
                $props = @(
                    @{Name="SenderSMTP"; ID=0x0C1F},
                    @{Name="SentRepSMTP"; ID=0x5D02},
                    @{Name="DisplayTo"; ID=0x0E04},
                    @{Name="DisplayCC"; ID=0x0E03}
                )
                foreach ($prop in $props) {
                    try {
                        $val = $item.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x$('{0:X8}' -f $prop.ID)")
                        Write-Output "  $($prop.Name): $val"
                    } catch {
                        Write-Output "  $($prop.Name): <unavailable>"
                    }
                }
            } catch {
                Write-Output "  Error reading MAPI props: $_"
            }
        }

        Write-Output ""
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
