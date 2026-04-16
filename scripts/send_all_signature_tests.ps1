# Test all Vectarr and TypeWrite signatures using available accounts
param([string]$To="alex@1v1a.com")

# Account 1: asferrazza@vectarr.com with different signatures
$Signatures1 = @(
    @{File="asferrazza_vectarr_signature.htm";Name="asferrazza@vectarr.com (Alexander Sferrazza)";Subject="Test 1/7 - asferrazza@vectarr.com"},
    @{File="sales_signature.htm";Name="sales@vectarr.com (via asferrazza)";Subject="Test 2/7 - sales@vectarr.com"},
    @{File="info_signature.htm";Name="info@vectarr.com (via asferrazza)";Subject="Test 3/7 - info@vectarr.com"},
    @{File="support_signature.htm";Name="support@vectarr.com (via asferrazza)";Subject="Test 4/7 - support@vectarr.com"},
    @{File="accounts_signature.htm";Name="accounts@vectarr.com (via asferrazza)";Subject="Test 5/7 - accounts@vectarr.com"},
    @{File="admin_vectarr_signature.htm";Name="admin@vectarr.com (via asferrazza)";Subject="Test 6/7 - admin@vectarr.com"}
)

# Account 2: admin@typewrite.club
$Signatures2 = @(
    @{File="admin_typewrite_signature.htm";Name="admin@typewrite.club (Alexander Sferrazza)";Subject="Test 7/7 - admin@typewrite.club"}
)

$AllSignatures = $Signatures1 + $Signatures2
$Total = $AllSignatures.Count
$Counter = 1

foreach ($Sig in $AllSignatures) {
    try {
        $SigPath = "$env:USERPROFILE\.openclaw\workspace\signatures\$($Sig.File)"
        $SigHTML = Get-Content -Path $SigPath -Raw
        
        # Determine which account to use
        if ($Sig.File -eq "admin_typewrite_signature.htm") {
            $From = "admin@typewrite.club"
        } else {
            $From = "asferrazza@vectarr.com"
        }
        
        $o = New-Object -ComObject Outlook.Application
        $m = $o.CreateItem(0)
        $m.To = $To
        $m.Subject = $Sig.Subject
        $m.HTMLBody = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body><div style='font-family:Segoe UI,Arial,sans-serif;font-size:14px'>Test email $Counter of $Total from Vectarr/TypeWrite Club signatures.<br><br>Testing: $($Sig.Name)</div>$SigHTML</body></html>"
        
        $a = $o.Session.Accounts | Where-Object {$_.SmtpAddress -eq $From}
        if ($a) {
            $m.SendUsingAccount = $a
        } else {
            Write-Warning "Account $From not found, skipping"
            continue
        }
        
        $m.Send()
        Write-Host "[$Counter/$Total] Sent: $($Sig.Name)"
        
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($m) | Out-Null
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($o) | Out-Null
        
        # Wait 60 seconds between emails (except after the last one)
        if ($Counter -lt $Total) {
            Write-Host "Waiting 60 seconds before next email..."
            Start-Sleep -Seconds 60
        }
        
    } catch {
        Write-Error "Failed to send email $Counter ($($Sig.Name)): $_"
    }
    
    $Counter++
}

Write-Host "All test emails sent!"
