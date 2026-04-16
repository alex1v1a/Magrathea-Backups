$Outlook = New-Object -ComObject Outlook.Application

# Check OlItemType enumeration values
Write-Host "OlMailItem = $([Microsoft.Office.Interop.Outlook.OlItemType]::olMailItem)"
Write-Host "OlAppointmentItem = $([Microsoft.Office.Interop.Outlook.OlItemType]::olAppointmentItem)"
