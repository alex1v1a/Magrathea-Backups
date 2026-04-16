$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)
$Mail.To = "asferrazza@vectarr.com"
$Mail.Subject = "Test: Customer Inquiry About CNC Machining Services"

# Use main account for sending (simulating alias)
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

# Load sales signature (Morgan Parker) to simulate customer-facing alias
$SignaturePath = Join-Path $env:APPDATA "Microsoft\Signatures\sales_signature.htm"
if (Test-Path $SignaturePath) {
    $Signature = Get-Content $SignaturePath -Raw
} else {
    $Signature = "<br><br>--<br>Morgan Parker<br>Sales Representative<br>Vectarr<br>+1 (650) 427-9450"
}

$Mail.HTMLBody = @"
<html>
<body style="font-family: Arial, Helvetica, sans-serif;">
<p>Hello,</p>

<p>I'm interested in getting a quote for some custom aluminum parts. I have a 3D model but I'm not very experienced with CAD. Can you help me with the quoting process?</p>

<p>I need about 10 pieces for a prototype run. The parts are roughly 4x3x2 inches.</p>

<p>Please let me know what information you need from me.</p>

<p>Thanks,<br>
Test Customer<br>
test@example.com</p>

<br>
$Signature
</body>
</html>
"@

$Mail.Send()

Write-Host "Test customer email sent to asferrazza@vectarr.com"
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
