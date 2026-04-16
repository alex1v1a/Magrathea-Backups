<#
.SYNOPSIS
    Send or draft an email via Outlook COM with auto-detected HTML signature.
.DESCRIPTION
    Replaces: send_outlook_email.ps1, send_outlook_email_with_sig.ps1, and all send_*/test_* one-offs.
    Supports HTML body, attachments, Reply-To, and draft-only mode.
    Signature auto-detection maps alias emails to .htm files.
.EXAMPLE
    .\outlook_send_email.ps1 -To "client@example.com" -From "sales@vectarr.com" -Subject "Quote" -Body "Hello"
    .\outlook_send_email.ps1 -To "client@example.com" -From "admin@typewrite.club" -Subject "Test" -BodyHtml "<b>Hello</b>" -DraftOnly
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$To,
    [Parameter(Mandatory)][string]$From,
    [Parameter(Mandatory)][string]$Subject,
    [string]$Body,
    [string]$BodyHtml,
    [string]$SignatureFile,
    [string[]]$Attachments,
    [switch]$DraftOnly,
    [string]$ReplyTo
)

# Signature auto-detection map: alias -> signature filename (without path)
$SignatureMap = @{
    "sales@vectarr.com"             = "sales_signature.htm"
    "support@vectarr.com"           = "support_signature.htm"
    "accounts@vectarr.com"          = "accounts_signature.htm"
    "admin@vectarr.com"             = "admin_vectarr_signature.htm"
    "info@vectarr.com"              = "info_signature.htm"
    "asferrazza@vectarr.com"        = "asferrazza_vectarr_signature.htm"
    "kwilliamkatul@vectarr.com"     = "kwilliamkatul_vectarr_signature.htm"
    "admin@typewrite.club"          = "admin_typewrite_signature.htm"
}

function Resolve-Signature {
    param([string]$Alias, [string]$ExplicitPath)

    if ($ExplicitPath) {
        # If relative, resolve from workspace signatures dir
        if (-not [System.IO.Path]::IsPathRooted($ExplicitPath)) {
            $candidate = Join-Path "$env:USERPROFILE\.openclaw\workspace\signatures" $ExplicitPath
            if (Test-Path $candidate) { return $candidate }
            $candidate = Join-Path "$env:APPDATA\Microsoft\Signatures" $ExplicitPath
            if (Test-Path $candidate) { return $candidate }
        }
        if (Test-Path $ExplicitPath) { return $ExplicitPath }
        Write-Warning "Signature file not found: $ExplicitPath"
        return $null
    }

    # Auto-detect from alias
    $filename = $SignatureMap[$Alias.ToLower()]
    if (-not $filename) {
        Write-Verbose "No signature mapping for $Alias"
        return $null
    }

    # Check workspace signatures first, then system signatures dir
    $paths = @(
        (Join-Path "$env:USERPROFILE\.openclaw\workspace\signatures" $filename),
        (Join-Path "$env:APPDATA\Microsoft\Signatures" $filename)
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            Write-Verbose "Using signature: $p"
            return $p
        }
    }
    Write-Warning "Signature file '$filename' not found for $Alias"
    return $null
}

$comObjects = [System.Collections.Generic.List[object]]::new()

try {
    $Outlook = New-Object -ComObject Outlook.Application
    $comObjects.Add($Outlook)

    # Find sender account
    $SenderAccount = $null
    foreach ($acct in $Outlook.Session.Accounts) {
        if ($acct.SmtpAddress -eq $From) {
            $SenderAccount = $acct
            break
        }
    }

    if (-not $SenderAccount) {
        Write-Error "Account '$From' not found in Outlook. Available accounts:"
        foreach ($acct in $Outlook.Session.Accounts) {
            Write-Error "  - $($acct.SmtpAddress)"
        }
        return
    }

    # Create mail item
    $Mail = $Outlook.CreateItem(0)  # 0 = olMailItem
    $comObjects.Add($Mail)

    $Mail.To = $To
    $Mail.Subject = $Subject
    $Mail.SendUsingAccount = $SenderAccount

    # Build HTML body
    $sigPath = Resolve-Signature -Alias $From -ExplicitPath $SignatureFile
    $sigHtml = ""
    if ($sigPath) {
        $sigHtml = Get-Content -Path $sigPath -Raw -ErrorAction SilentlyContinue
    }

    if ($BodyHtml) {
        $htmlContent = $BodyHtml
    } elseif ($Body) {
        # Wrap plain text in basic HTML
        $htmlContent = "<div style=`"font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;`">$Body</div>"
    } else {
        $htmlContent = ""
    }

    $Mail.HTMLBody = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
$htmlContent
$sigHtml
</body>
</html>
"@

    # Set Reply-To if specified
    if ($ReplyTo) {
        $recipient = $Mail.ReplyRecipients.Add($ReplyTo)
        $recipient.Resolve() | Out-Null
    }

    # Add attachments
    foreach ($att in $Attachments) {
        if (Test-Path $att) {
            $Mail.Attachments.Add((Resolve-Path $att).Path) | Out-Null
            Write-Verbose "Attached: $att"
        } else {
            Write-Warning "Attachment not found: $att"
        }
    }

    if ($DraftOnly) {
        $Mail.Save()
        Write-Output "Draft saved: From=$From To=$To Subject='$Subject'"
    } else {
        $Mail.Send()
        Write-Output "Email sent: From=$From To=$To Subject='$Subject'"
    }
}
catch {
    Write-Error "Failed to send email: $_"
}
finally {
    for ($i = $comObjects.Count - 1; $i -ge 0; $i--) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($comObjects[$i]) | Out-Null } catch {}
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
