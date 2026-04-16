# Search Sent Items for email from 3/5/2026 4:48pm
$o = New-Object -ComObject Outlook.Application
$ns = $o.GetNamespace("MAPI")
$sent = $ns.GetDefaultFolder(5)  # 5 = olFolderSentMail

Write-Host "Searching Sent Items for emails around 3/5/2026 4:48pm..."

$items = $sent.Items
$items.Sort("[SentOn]", $true)

$count = 0
foreach ($item in $items) {
    if ($item.SentOn -ge [datetime]"2026-03-05 16:00" -and $item.SentOn -le [datetime]"2026-03-05 17:30") {
        Write-Host "`n=== Email Found ==="
        Write-Host "To: $($item.To)"
        Write-Host "Subject: $($item.Subject)"
        Write-Host "Sent: $($item.SentOn)"
        Write-Host "`n=== HTML Body (first 3000 chars) ==="
        $body = $item.HTMLBody
        Write-Host $body.Substring(0, [Math]::Min(3000, $body.Length))
        Write-Host "`n... (truncated)"
        $count++
        break
    }
}

if ($count -eq 0) {
    Write-Host "`nNo emails found from that time. Showing recent sent emails:"
    for ($i = 1; $i -le 20; $i++) {
        try {
            $item = $items.Item($i)
            Write-Host "[$i] To: $($item.To) | Subject: $($item.Subject) | Sent: $($item.SentOn)"
        } catch { break }
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($items) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($sent) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ns) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($o) | Out-Null
