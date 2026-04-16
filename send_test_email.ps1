$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)
$Mail.To = "kwilliamkatul@vectarr.com"
$Mail.Subject = "General Test"

# Use main account for sending
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

# Load support signature (Casey Thompson)
$SignaturePath = Join-Path $env:APPDATA "Microsoft\Signatures\support_signature.htm"
if (Test-Path $SignaturePath) {
    $Signature = Get-Content $SignaturePath -Raw
} else {
    $Signature = "<br><br>--<br>Casey Thompson<br>Technical Support<br>Vectarr<br>+1 (650) 427-9450"
}

$Mail.HTMLBody = "<html><body>General test email.<br><br>$Signature</body></html>"
$Mail.Send()

Write-Host "Email sent successfully to kwilliamkatul@vectarr.com"