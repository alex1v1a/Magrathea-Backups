$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get the sales draft
$Drafts = $Namespace.GetDefaultFolder(16)
$SalesDraft = $Drafts.Items | Where-Object { $_.Subject -like "*Quote Request*" } | Sort-Object CreationTime -Descending | Select-Object -First 1

if ($SalesDraft) {
    Write-Host "Subject: $($SalesDraft.Subject)"
    Write-Host "`n=== Checking From Address ==="
    
    try {
        $FromEmail = $SalesDraft.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x0065001F")
        $FromName = $SalesDraft.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x0042001F")
        Write-Host "From Email: $FromEmail"
        Write-Host "From Name: $FromName"
    } catch {
        Write-Host "Could not read From properties: $_"
    }
    
    Write-Host "`n=== SendUsingAccount ==="
    if ($SalesDraft.SendUsingAccount) {
        Write-Host "SendUsingAccount: $($SalesDraft.SendUsingAccount.SmtpAddress)"
    } else {
        Write-Host "SendUsingAccount: Not set"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
