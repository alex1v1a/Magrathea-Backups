$Outlook = New-Object -ComObject Outlook.Application
$Draft = $Outlook.CreateItem(0)

# Try to set From address using PropertyAccessor
$PR_SENT_REPRESENTING_EMAIL_ADDRESS = "http://schemas.microsoft.com/mapi/proptag/0x0065001F"
$PR_SENT_REPRESENTING_NAME = "http://schemas.microsoft.com/mapi/proptag/0x0042001F"

try {
    $Draft.PropertyAccessor.SetProperty($PR_SENT_REPRESENTING_EMAIL_ADDRESS, "sales@vectarr.com")
    $Draft.PropertyAccessor.SetProperty($PR_SENT_REPRESENTING_NAME, "Morgan Parker")
    Write-Host "Successfully set From properties"
    
    # Check if it worked
    $From = $Draft.PropertyAccessor.GetProperty($PR_SENT_REPRESENTING_EMAIL_ADDRESS)
    Write-Host "From address: $From"
} catch {
    Write-Host "Error setting From: $_"
}

$Draft.Recipients.Add("test@example.com")
$Draft.Subject = "Test From Alias"
$Draft.Body = "Testing send from alias"

# Don't save, just check
$Draft.Close(1)
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
