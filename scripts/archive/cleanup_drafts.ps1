$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

# Check all stores for drafts created today
$today = (Get-Date).ToString("yyyy-MM-dd")
$duplicateEmails = @(
    "Sales@HalseyMFG.com",
    "sales@ohiolaser.com",
    "sales@hubbellmachine.com",
    "info@dallasprecisionmachining.com",
    "office@illinoisvalleymachine.com",
    "sales@crimachining.com"
)

foreach ($store in $namespace.Stores) {
    Write-Host "=== Store: $($store.DisplayName) ==="
    try {
        $root = $store.GetRootFolder()
        foreach ($folder in $root.Folders) {
            if ($folder.Name -eq "Drafts") {
                Write-Host "  Drafts count: $($folder.Items.Count)"
                for ($i = $folder.Items.Count; $i -ge 1; $i--) {
                    $item = $folder.Items.Item($i)
                    $created = $item.CreationTime.ToString("yyyy-MM-dd")
                    Write-Host "    [$created] $($item.Subject) | To: $($item.To)"
                    if ($created -eq $today) {
                        $isDuplicate = $false
                        foreach ($email in $duplicateEmails) {
                            if ($item.To -like "*$email*" -or $item.Body -like "*$email*") {
                                $isDuplicate = $true
                                break
                            }
                        }
                        if ($isDuplicate) {
                            $item.Delete()
                            Write-Host "      -> DELETED (duplicate - already emailed)"
                        }
                    }
                }
            }
        }
    } catch {
        Write-Host "  Error: $_"
    }
}
