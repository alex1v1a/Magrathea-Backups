# Outlook Email Test Script with HTML Signature
# Sends a test email using the Outlook COM object with HTML signature

param(
    [string]$To = "alex@1v1a.com",
    [string]$From = "admin@typewrite.club",
    [string]$Subject = "Test Email with Signature - TypeWrite Club Admin",
    [string]$Body = "This is a test email to verify the signature and email configuration.<br><br>Please review the signature below and let me know if any changes are needed.",
    [string]$SignatureFile = "signatures/admin_typewrite_signature.htm"
)

try {
    # Read the HTML signature
    $SignaturePath = Join-Path $PSScriptRoot ".." $SignatureFile
    $SignaturePath = Resolve-Path $SignaturePath -ErrorAction Stop
    $SignatureHTML = Get-Content -Path $SignaturePath -Raw
    
    # Create Outlook application object
    $Outlook = New-Object -ComObject Outlook.Application
    
    # Create a new mail item
    $Mail = $Outlook.CreateItem(0)  # 0 = olMailItem
    
    # Combine body and signature
    $FullHTMLBody = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">
        $Body
    </div>
    $SignatureHTML
</body>
</html>
"@
    
    # Set email properties
    $Mail.To = $To
    $Mail.Subject = $Subject
    $Mail.HTMLBody = $FullHTMLBody
    
    # Set the sender account
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
        Write-Warning "Account $From not found in Outlook. Available accounts:"
        foreach ($Account in $Accounts) {
            Write-Host "  - $($Account.SmtpAddress)"
        }
        exit 1
    }
    
    # Send the email
    $Mail.Send()
    Write-Host "Email sent successfully from $From to $To"
    Write-Host "Signature file used: $SignaturePath"
    
} catch {
    Write-Error "Failed to send email: $_"
    exit 1
} finally {
    # Cleanup
    if ($Mail) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Mail) | Out-Null }
    if ($Outlook) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null }
}
