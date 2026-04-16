$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

# Delete April 3rd drafts from asferrazza@vectarr.com
$store = $null
foreach ($s in $namespace.Stores) {
    if ($s.DisplayName -eq "asferrazza@vectarr.com") {
        $store = $s
        break
    }
}

$deleted = 0
if ($store) {
    $root = $store.GetRootFolder()
    foreach ($folder in $root.Folders) {
        if ($folder.Name -eq "Drafts") {
            Write-Host "=== Cleaning asferrazza@vectarr.com Drafts ==="
            for ($i = $folder.Items.Count; $i -ge 1; $i--) {
                $item = $folder.Items.Item($i)
                $created = $item.CreationTime.ToString("yyyy-MM-dd")
                if ($created -eq "2026-04-03") {
                    Write-Host "Deleting: $($item.Subject) | To: $($item.To)"
                    $item.Delete()
                    $deleted++
                }
            }
        }
    }
}

Write-Host ""
Write-Host "Deleted $deleted stale drafts from asferrazza@vectarr.com"

# Verify cleanup
Write-Host ""
Write-Host "=== Remaining Drafts ==="
foreach ($s in $namespace.Stores) {
    if ($s.DisplayName -eq "asferrazza@vectarr.com" -or $s.DisplayName -eq "Admin@vectarr.com") {
        $root = $s.GetRootFolder()
        foreach ($folder in $root.Folders) {
            if ($folder.Name -eq "Drafts") {
                Write-Host "$($s.DisplayName): $($folder.Items.Count) drafts"
            }
        }
    }
}
