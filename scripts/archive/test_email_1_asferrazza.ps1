# Send test email from asferrazza@vectarr.com
param(
    [string]$To = "alex@1v1a.com",
    [string]$From = "asferrazza@vectarr.com",
    [string]$Subject = "Test 1/7 - asferrazza@vectarr.com Signature Test"
)

try {
    $SignaturePath = "$env:APPDATA\Microsoft\Signatures\Vectarr (asferrazza@vectarr.com).htm"
    $SignatureHTML = Get-Content -Path $SignaturePath -Raw
    
    $Body = "This is test email 1 of 7 from the Vectarr and TypeWrite Club accounts.<br><br>Testing signature for asferrazza@vectarr.com"
    
    $Outlook = New-Object -ComObject Outlook.Application
    $Mail = $Outlook.CreateItem(0)
    
    $FullHTMLBody = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body><div style='font-family: Segoe UI, Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;'>" + $Body + "</div>" + $SignatureHTML + "</body></html>"
    
    $Mail.To = $To
    $Mail.Subject = $Subject
    $Mail.HTMLBody = $FullHTMLBody
    
    $Accounts = $Outlook.Session.Accounts
    $SenderAccount = $null
    
    foreach ($Account in $Accounts) {
        if ($Account.SmtpAddress -eq $From) {
            $SenderAccount = $Account
            break
        }
    }
    
    if ($SenderAccount) {
        $Mail.SendUsingAccount = $SenderAccount
        Write-Host "Email 1/7 sent from $From"
    } else {
        Write-Warning "Account $From not found"
        exit 1
    }
    
    $Mail.Send()
    
} catch {
    Write-Error "Failed: $_"
    exit 1
} finally {
    if ($Mail) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Mail) | Out-Null }
    if ($Outlook) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null }
}
