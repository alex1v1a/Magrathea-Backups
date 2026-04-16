$Outlook = New-Object -ComObject Outlook.Application
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}

# Define all Vectarr aliases with their signature files
$Aliases = @(
    @{Name="Morgan Parker"; Title="Sales Representative"; Email="sales@vectarr.com"; Signature="sales_signature.htm"},
    @{Name="Taylor Brooks"; Title="Information Services"; Email="info@vectarr.com"; Signature="info_signature.htm"},
    @{Name="Casey Thompson"; Title="Technical Support"; Email="support@vectarr.com"; Signature="support_signature.htm"},
    @{Name="Jordan Mitchell"; Title="Accounts Department"; Email="accounts@vectarr.com"; Signature="accounts_signature.htm"},
    @{Name="Sam Taylor"; Title="Administrator"; Email="admin@vectarr.com"; Signature="admin_vectarr_signature.htm"}
)

foreach ($Alias in $Aliases) {
    $Mail = $Outlook.CreateItem(0)
    $Mail.To = "kwilliamkatul@vectarr.com"
    $Mail.Subject = "Test from $($Alias.Name) - $($Alias.Title)"
    $Mail.SendUsingAccount = $SenderAccount
    
    $SignaturePath = Join-Path $env:APPDATA "Microsoft\Signatures\$($Alias.Signature)"
    if (Test-Path $SignaturePath) {
        $Signature = Get-Content $SignaturePath -Raw
    } else {
        $Signature = "<br><br>--<br>$($Alias.Name)<br>$($Alias.Title)<br>Vectarr<br>+1 (650) 427-9450"
    }
    
    $Mail.HTMLBody = "<html><body>Test email from $($Alias.Name), $($Alias.Title).<br><br>$Signature</body></html>"
    $Mail.Send()
    
    Write-Host "Sent: $($Alias.Email) ($($Alias.Name), $($Alias.Title))"
    Start-Sleep -Milliseconds 500
}

Write-Host "All test emails sent successfully to kwilliamkatul@vectarr.com"