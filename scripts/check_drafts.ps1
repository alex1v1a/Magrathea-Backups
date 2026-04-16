$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')
$drafts = $ns.Folders.Item('asferrazza@vectarr.com').Folders.Item('Drafts')
$items = $drafts.Items
Write-Host "Drafts in asferrazza@vectarr.com:" -ForegroundColor Green
for ($i = 1; $i -le $items.Count; $i++) {
    $item = $items.Item($i)
    Write-Host "  - [$($item.Subject)]" -ForegroundColor Cyan
}
