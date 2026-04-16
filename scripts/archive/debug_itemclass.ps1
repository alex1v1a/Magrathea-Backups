$Outlook = New-Object -ComObject Outlook.Application

# Try creating with explicit integer
$Mail = $Outlook.CreateItem(0)  # olMailItem = 0
Write-Host "Created item class: $($Mail.Class)"
Write-Host "MessageClass: $($Mail.MessageClass)"
$Mail.Close(1)

# Try with 1
$Appt = $Outlook.CreateItem(1)  # This was creating appointments
Write-Host "`nCreated item class: $($Appt.Class)"
Write-Host "MessageClass: $($Appt.MessageClass)"
$Appt.Close(1)

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
