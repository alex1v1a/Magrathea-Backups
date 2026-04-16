$outlook = New-Object -ComObject Outlook.Application
$namespace = $outlook.GetNamespace("MAPI")

# Check Admin@vectarr.com Sent Items for the 6 shops
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
        if ($folder.Name -eq "Sent Items") {
            Write-Host "=== Checking Sent Items for April 4-5 emails ==="
            $emailsToCheck = @(
                "Sales@HalseyMFG.com",
                "sales@ohiolaser.com",
                "sales@hubbellmachine.com",
                "info@dallasprecisionmachining.com",
                "office@illinoisvalleymachine.com",
                "sales@crimachining.com"
            )
            
            foreach ($item in $folder.Items) {
                $sentDate = $item.SentOn.ToString("yyyy-MM-dd")
                if ($sentDate -eq "2026-04-04" -or $sentDate -eq "2026-04-05") {
                    foreach ($recipient in $item.Recipients) {
                        if ($emailsToCheck -contains $recipient.Address) {
                            Write-Host "[$sentDate] Sent to: $($recipient.Address) | Subject: $($item.Subject)"
                        }
                    }
                }
            }
        }
    }
}
