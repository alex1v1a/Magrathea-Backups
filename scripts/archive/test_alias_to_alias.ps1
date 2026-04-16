$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)

# Send from support@vectarr.com to sales@vectarr.com
$Mail.To = "sales@vectarr.com"
$Mail.Subject = "Internal: Customer Question About Rush Order"

# Use main account but set From to support@vectarr.com
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

# Set From to appear as support@vectarr.com (Casey Thompson)
try {
    $Mail.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x0065001F", "support@vectarr.com")
    $Mail.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x0042001F", "Casey Thompson")
} catch {
    Write-Host "Warning: Could not set From address: $_"
}

$Mail.Body = @"
Hi Sales Team,

I have a customer asking about rush order options for a prototype they need in 3 days. They mentioned they submitted a quote request yesterday but haven't heard back.

Can you check on this and let me know the fastest turnaround you can offer for 5 aluminum parts?

Thanks,
Casey
Technical Support
"@

$Mail.Send()
Write-Host "Test email sent from support@vectarr.com to sales@vectarr.com"
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
