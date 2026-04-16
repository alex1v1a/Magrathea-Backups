$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')

foreach ($acct in @('asferrazza@vectarr.com','Admin@vectarr.com')) {
    Write-Host "Account: $acct" -ForegroundColor Green
    try {
        $folder = $ns.Folders.Item($acct).Folders.Item('Inbox')
        $items = $folder.Items.Restrict('[UnRead] = True')
        Write-Host "  Unread count: $($items.Count)" -ForegroundColor Yellow
        foreach ($item in $items) {
            Write-Host "  - [$($item.Subject)] from [$($item.SenderName)]" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}
