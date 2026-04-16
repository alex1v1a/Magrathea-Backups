$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)
$Mail.To = "sales@vectarr.com"
$Mail.Subject = "Quote Request: Aluminum Prototype Parts"

# Use main account for sending (simulating external customer)
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

$Mail.Body = @"
Hello,

I found your company online and I'm interested in getting a quote for some custom aluminum parts. I have a 3D model but I'm not very experienced with CAD.

I need about 10 pieces for a prototype run. The parts are roughly 4x3x2 inches.

Can you help me with the quoting process?

Thanks,
Test Customer
test@example.com
"@

$Mail.Send()
Write-Host "Test email sent to sales@vectarr.com"
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
