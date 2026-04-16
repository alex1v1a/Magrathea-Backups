$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

# Delete April 5th drafts from Admin@vectarr.com (duplicates - already sent on April 4)
$store = $null
foreach ($s in $namespace.Stores) {
    if ($s.DisplayName -eq "Admin@vectarr.com") {
        $store = $s
        break
    }
}

$deleted = 0
if ($store) {
    $root = $store.GetRootFolder()
    foreach ($folder in $root.Folders) {
        if ($folder.Name -eq "Drafts") {
            Write-Host "=== Cleaning Admin@vectarr.com Drafts ==="
            for ($i = $folder.Items.Count; $i -ge 1; $i--) {
                $item = $folder.Items.Item($i)
                $created = $item.CreationTime.ToString("yyyy-MM-dd")
                if ($created -eq "2026-04-05") {
                    Write-Host "Deleting: $($item.Subject) | To: $($item.To)"
                    $item.Delete()
                    $deleted++
                }
            }
        }
    }
}

Write-Host "Deleted $deleted drafts from Admin@vectarr.com"

# Check April 3rd drafts in asferrazza@vectarr.com
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
            Write-Host ""
            Write-Host "=== Checking asferrazza@vectarr.com Drafts (April 3) ==="
            foreach ($item in $folder.Items) {
                $created = $item.CreationTime.ToString("yyyy-MM-dd")
                Write-Host "[$created] $($item.Subject) | To: $($item.To)"
            }
            
            # Check if these were sent
            Write-Host ""
            Write-Host "Checking Sent Items for these emails..."
            $sentFolder = $null
            foreach ($f in $root.Folders) {
                if ($f.Name -eq "Sent Items") {
                    $sentFolder = $f
                    break
                }
            }
            
            if ($sentFolder) {
                $draftEmails = @(
                    "rick.flores@ftcindustries.com",
                    "contactus@njcmachine.com",
                    "sales@marathonprecision.com",
                    "info@wagner-machine.com",
                    "sales@cci-companies.com",
                    "contact@centennialmachining.com"
                )
                
                foreach ($item in $sentFolder.Items) {
                    $sentDate = $item.SentOn.ToString("yyyy-MM-dd")
                    if ($sentDate -ge "2026-04-03") {
                        foreach ($recipient in $item.Recipients) {
                            if ($draftEmails -contains $recipient.Address) {
                                Write-Host "  SENT [$sentDate]: $($recipient.Address)"
                            }
                        }
                    }
                }
            }
        }
    }
}
