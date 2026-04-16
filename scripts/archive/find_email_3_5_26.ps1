# Search for email from 3/5/2026 4:48pm
$o = New-Object -ComObject Outlook.Application
$ns = $o.GetNamespace("MAPI")
$inbox = $ns.GetDefaultFolder(6)  # 6 = olFolderInbox

Write-Host "Searching for emails around 3/5/2026 4:48pm..."

# Get items from inbox
$items = $inbox.Items
$items.Sort("[ReceivedTime]", $true)

$count = 0
foreach ($item in $items) {
    if ($item.ReceivedTime -ge [datetime]"2026-03-05 16:00" -and $item.ReceivedTime -le [datetime]"2026-03-05 17:30") {
        Write-Host "`n--- Email Found ---"
        Write-Host "From: $($item.SenderEmailAddress)"
        Write-Host "Subject: $($item.Subject)"
        Write-Host "Received: $($item.ReceivedTime)"
        Write-Host "`nHTML Body (first 2000 chars):"
        Write-Host $item.HTMLBody.Substring(0, [Math]::Min(2000, $item.HTMLBody.Length))
        $count++
        if ($count -ge 5) { break }
    }
}

if ($count -eq 0) {
    Write-Host "No emails found around that time. Showing last 10 emails instead:"
    for ($i = 1; $i -le 10; $i++) {
        $item = $items.Item($i)
        Write-Host "`n[$i] From: $($item.SenderEmailAddress) | Subject: $($item.Subject) | Time: $($item.ReceivedTime)"
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($items) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($inbox) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ns) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($o) | Out-Null
