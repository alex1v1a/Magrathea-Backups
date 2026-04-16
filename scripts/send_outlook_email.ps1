# Outlook Email Test Script
# Sends a test email using the Outlook COM object

param(
    [string]$To = "alex@1v1a.com",
    [string]$From = "admin@typewrite.club",
    [string]$Subject = "Test Email from TypeWrite Club Admin",
    [string]$Body = "This is a test email to verify the signature and email configuration."
)

try {
    # Create Outlook application object
    $Outlook = New-Object -ComObject Outlook.Application
    
    # Create a new mail item
    $Mail = $Outlook.CreateItem(0)  # 0 = olMailItem
    
    # Set email properties
    $Mail.To = $To
    $Mail.Subject = $Subject
    $Mail.HTMLBody = $Body
    
    # Set the sender account
    # Note: This requires the account to be configured in Outlook
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
    
} catch {
    Write-Error "Failed to send email: $_"
    exit 1
} finally {
    # Cleanup
    if ($Mail) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Mail) | Out-Null }
    if ($Outlook) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null }
}
