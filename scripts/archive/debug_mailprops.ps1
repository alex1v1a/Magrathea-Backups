$Outlook = New-Object -ComObject Outlook.Application
$Draft = $Outlook.CreateItem(0)  # Mail item

Write-Host "Mail item properties:"
$Draft | Get-Member -MemberType Property | Where-Object { $_.Name -like "*Reply*" -or $_.Name -like "*To*" } | Select-Object Name | Format-Table

$Draft.Close(1)
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
