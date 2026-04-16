# Outlook Email Test Script for admin@typewrite.club with updated logo
param(
    [string]$To = "alex@1v1a.com",
    [string]$From = "admin@typewrite.club",
    [string]$Subject = "Test Email - TypeWrite Club Admin (Updated Logo)"
)

try {
    $WorkspacePath = "$env:USERPROFILE\.openclaw\workspace"
    $SignaturePath = "$WorkspacePath\signatures\admin_typewrite_signature.htm"
    $SignatureHTML = Get-Content -Path $SignaturePath -Raw
    
    $Body = "This is a test email from admin@typewrite.club with the updated logo.<br><br>The logo should now display correctly from Imgur."
    
    $Outlook = New-Object -ComObject Outlook.Application
    $Mail = $Outlook.CreateItem(0)
    
    $FullHTMLBody = @"
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
    <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">$Body</div>
    $SignatureHTML
</body>
</html>
"@
    
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
        Write-Host "Using account: $($SenderAccount.SmtpAddress)"
    } else {
        Write-Warning "Account $From not found. Available accounts:"
        foreach ($Account in $Accounts) { Write-Host "  - $($Account.SmtpAddress)" }
        exit 1
    }
    
    $Mail.Send()
    Write-Host "Email sent successfully from $From to $To"
    
} catch {
    Write-Error "Failed to send email: $_"
    exit 1
} finally {
    if ($Mail) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Mail) | Out-Null }
    if ($Outlook) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null }
}
