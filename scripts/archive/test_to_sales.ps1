$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)

# Send to sales@vectarr.com
$Mail.To = "sales@vectarr.com"
$Mail.Subject = "Internal: Customer Question About Rush Order"

# Use main account
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

$Mail.Body = @"
Hi Sales Team,

I have a customer asking about rush order options for a prototype they need in 3 days. They mentioned they submitted a quote request yesterday but haven't heard back.

Can you check on this and let me know the fastest turnaround you can offer for 5 aluminum parts?

Thanks,
Casey
Technical Support
"@

$Mail.Send()
Write-Host "Test email sent to sales@vectarr.com"
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
