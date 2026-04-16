$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

# Check asferrazza@vectarr.com drafts
$store = $null
foreach ($s in $namespace.Stores) {
    if ($s.DisplayName -eq "asferrazza@vectarr.com") {
        $store = $s
        break
    }
}

if ($store) {
    $root = $store.GetRootFolder()
    foreach ($folder in $root.Folders) {
        if ($folder.Name -eq "Drafts") {
            Write-Host "=== asferrazza@vectarr.com Drafts ==="
            Write-Host "Count: $($folder.Items.Count)"
            foreach ($item in $folder.Items) {
                $created = $item.CreationTime.ToString("yyyy-MM-dd")
                Write-Host "  [$created] $($item.Subject) | To: $($item.To)"
            }
        }
    }
}

# Check Admin@vectarr.com drafts
$store = $null
foreach ($s in $namespace.Stores) {
    if ($s.DisplayName -eq "Admin@vectarr.com") {
        $store = $s
        break
    }
}

if ($store) {
    $root = $store.GetRootFolder()
    foreach ($folder in $root.Folders) {
        if ($folder.Name -eq "Drafts") {
            Write-Host ""
            Write-Host "=== Admin@vectarr.com Drafts ==="
            Write-Host "Count: $($folder.Items.Count)"
            foreach ($item in $folder.Items) {
                $created = $item.CreationTime.ToString("yyyy-MM-dd")
                Write-Host "  [$created] $($item.Subject) | To: $($item.To)"
            }
        }
    }
}
