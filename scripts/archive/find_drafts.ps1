# Check all Drafts folders
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Check default Drafts
$DefaultDrafts = $Namespace.GetDefaultFolder(16)  # 16 = olFolderDrafts
Write-Host "Default Drafts folder:"
Write-Host "  Path: $($DefaultDrafts.FolderPath)"
Write-Host "  Items: $($DefaultDrafts.Items.Count)"
for ($i = 1; $i -le [Math]::Min(5, $DefaultDrafts.Items.Count); $i++) {
    $Item = $DefaultDrafts.Items.Item($i)
    Write-Host ("    - " + $Item.Subject + " (" + $Item.CreationTime + ")")
}

Write-Host ""

# Try to find admin@vectarr.com drafts
foreach ($Folder in $Namespace.Folders) {
    if ($Folder.Name -match "admin") {
        Write-Host "Found folder: $($Folder.Name)"
        foreach ($SubFolder in $Folder.Folders) {
            if ($SubFolder.Name -eq "Drafts") {
                Write-Host "  Drafts folder: $($SubFolder.FolderPath)"
                Write-Host "  Items: $($SubFolder.Items.Count)"
            }
        }
    }
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
