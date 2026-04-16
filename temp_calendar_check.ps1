Add-Type -AssemblyName Microsoft.Office.Interop.Outlook
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$calendar = $ns.GetDefaultFolder([Microsoft.Office.Interop.Outlook.OlDefaultFolders]::olFolderCalendar)
$today = Get-Date
$next24h = $today.AddHours(24)
$items = $calendar.Items
$items.IncludeRecurrences = $true
$items.Sort('[Start]')
$filter = "[Start] >= '" + $today.ToString('g') + "' AND [Start] <= '" + $next24h.ToString('g') + "'"
$appts = $items.Restrict($filter)
$count = 0
foreach ($a in $appts) {
    if ($count -ge 10) { break }
    Write-Host ("- " + $a.Subject + " at " + $a.Start.ToString('g'))
    $count++
}
if ($count -eq 0) {
    Write-Host "No appointments found in the next 24 hours."
} elseif ($count -eq 10) {
    Write-Host "(Showing first 10 appointments only)"
}
