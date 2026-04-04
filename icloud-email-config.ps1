# iCloud Email Configuration for alex@1v1a.com
# Server-side rules, signatures, 2-5GB local storage limit

# Outlook IMAP Configuration
$EmailConfig = @{
    Email = "alex@1v1a.com"
    DisplayName = "Alexander Sferrazza"
    ImapServer = "imap.mail.me.com"
    ImapPort = 993
    SmtpServer = "smtp.mail.me.com"
    SmtpPort = 587
    UseSSL = $true
    # Storage limits
    SyncWindow = "3 months"  # Only sync last 3 months locally
    DownloadAttachments = $false  # Keep attachments server-side
    LocalCacheLimit = "4GB"  # Between 2-5GB buffer
}

# Server-side rules (run on iCloud servers)
$ServerRules = @(
    @{
        Name = "Vectarr Support"
        Condition = "From contains @vectarr.com"
        Action = "Move to folder 'Vectarr/Support'"
    },
    @{
        Name = "Newsletter Filter"
        Condition = "Subject contains 'unsubscribe' OR From contains 'noreply'"
        Action = "Move to folder 'Newsletters'"
    },
    @{
        Name = "Priority Flag"
        Condition = "Subject contains 'URGENT' OR Subject contains 'ACTION REQUIRED'"
        Action = "Flag and mark as important"
    }
)

# Signatures
$Signatures = @{
    Default = @{
        Name = "Alexander Sferrazza"
        Title = "Founder & CEO"
        Company = "1v1a"
        Phone = ""
        Email = "alex@1v1a.com"
    }
}

# Storage optimization settings
$StorageSettings = @{
    # Auto-archive after 1 year
    AutoArchive = $true
    ArchiveAge = "12 months"
    
    # Compact PST/OST when idle
    AutoCompact = $true
    
    # Empty deleted items on exit
    EmptyDeletedOnExit = $true
    
    # Download headers only for large folders
    LargeFolderThreshold = "1000 items"
    LargeFolderDownload = "Headers only"
}

Write-Host "iCloud Email Configuration Script Created"
Write-Host "Email: $($EmailConfig.Email)"
Write-Host "IMAP Server: $($EmailConfig.ImapServer)"
Write-Host "Local Cache: $($EmailConfig.LocalCacheLimit)"
Write-Host ""
Write-Host "To apply this configuration:"
Write-Host "1. Open Outlook"
Write-Host "2. File > Add Account"
Write-Host "3. Enter: alex@1v1a.com"
Write-Host "4. Use app-specific password from iCloud"
Write-Host "5. Configure sync settings for 3 months + 4GB limit"
