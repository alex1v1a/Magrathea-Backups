#Requires -Version 5.1
<#
.SYNOPSIS
    Email monitoring script for Vectarr accounts with proper alias handling
.DESCRIPTION
    Checks Outlook inbox for new emails, drafts responses with correct signatures,
    and ensures replies are sent from the appropriate alias account
#>

param(
    [string]$Action = "check",
    [string]$OutputPath = "$PSScriptRoot\..\email_data"
)

# Ensure output directories exist
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\drafts"
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\summaries"
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\tracking"
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\archive"

# Marketing/Spam detection keywords (strong indicators)
$MarketingKeywords = @('unsubscribe', 'promotional', 'marketing email', 'newsletter', 'view in browser', 'click here to', 'limited time offer', 'special offer', 'act now', 'exclusive deal')
$MarketingDomains = @('e.geico.com', 'mailchimp.com', 'constantcontact.com', 'sendgrid.net', 'mailgun.org', 'hubspot.com', 'marketo.com', 'salesforce.com', 'mailjet.com', 'campaignmonitor.com', 'email.', 'newsletter.')

# Job hunting/Recruiting detection
$JobHuntingKeywords = @('job alert', 'career opportunity', 'now hiring', 'job opening', 'position available', 'join our team', 'we are hiring', 'employment opportunity', 'recruiting', 'talent acquisition')
$JobHuntingDomains = @('linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com', 'careerbuilder.com', 'ziprecruiter.com', 'dice.com', 'simplyhired.com')

# Undeliverable/Bounce detection
$UndeliverableKeywords = @('undeliverable', 'delivery failed', 'delivery has failed', "couldn't be delivered", 'could not be delivered', 'was not delivered', 'wasn.t found', "wasn't found", 'bounce', 'returned mail', 'message not delivered', 'delivery status notification', 'failure notice')

# Function to check if email is marketing/spam
function Test-MarketingEmail {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$SenderEmail
    )
    
    $SubjectLower = $Subject.ToLower()
    $BodyLower = $Body.ToLower()
    $SenderLower = $SenderEmail.ToLower()
    
    # Check for marketing keywords in subject or body
    foreach ($Keyword in $MarketingKeywords) {
        if ($SubjectLower -match $Keyword -or $BodyLower -match $Keyword) {
            return $true
        }
    }
    
    # Check for known marketing domains
    foreach ($Domain in $MarketingDomains) {
        if ($SenderLower -match $Domain) {
            return $true
        }
    }
    
    return $false
}

# Function to check if email is job hunting/recruiting
function Test-JobHuntingEmail {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$SenderEmail
    )
    
    $SubjectLower = $Subject.ToLower()
    $BodyLower = $Body.ToLower()
    $SenderLower = $SenderEmail.ToLower()
    
    # Check for job hunting keywords
    foreach ($Keyword in $JobHuntingKeywords) {
        if ($SubjectLower -match $Keyword -or $BodyLower -match $Keyword) {
            return $true
        }
    }
    
    # Check for known job site domains
    foreach ($Domain in $JobHuntingDomains) {
        if ($SenderLower -match $Domain) {
            return $true
        }
    }
    
    return $false
}

# Function to check if email is undeliverable/bounce
function Test-UndeliverableEmail {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$SenderEmail
    )
    
    $SubjectLower = $Subject.ToLower()
    $BodyLower = $Body.ToLower()
    
    # Check for undeliverable keywords
    foreach ($Keyword in $UndeliverableKeywords) {
        if ($SubjectLower -match $Keyword -or $BodyLower -match $Keyword) {
            return $true
        }
    }
    
    # Check for empty sender (common with bounce-backs)
    if ([string]::IsNullOrWhiteSpace($SenderEmail)) {
        return $true
    }
    
    return $false
}

$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get the main Vectarr account for sending (Admin@vectarr.com for draft creation)
$MainAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "Admin@vectarr.com" }
if (-not $MainAccount) {
    $MainAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
}

# Track processed emails
$TrackingFile = "$OutputPath\tracking\processed_emails.json"
$ProcessedEmails = @{}
if (Test-Path $TrackingFile) {
    $JsonContent = Get-Content $TrackingFile | ConvertFrom-Json
    # Convert PSObject to Hashtable for compatibility with older PowerShell
    $ProcessedEmails = @{}
    $JsonContent.PSObject.Properties | ForEach-Object {
        $ProcessedEmails[$_.Name] = $_.Value
    }
    
    # Prune entries older than 30 days
    $PruneCutoff = (Get-Date).AddDays(-30)
    $KeysToRemove = @()
    foreach ($Key in $ProcessedEmails.Keys) {
        $Entry = $ProcessedEmails[$Key]
        if ($Entry.processed) {
            try {
                $EntryDate = [datetime]::Parse($Entry.processed)
                if ($EntryDate -lt $PruneCutoff) {
                    $KeysToRemove += $Key
                }
            } catch { }
        }
    }
    foreach ($Key in $KeysToRemove) {
        $ProcessedEmails.Remove($Key)
    }
    if ($KeysToRemove.Count -gt 0) {
        Write-Host "Pruned $($KeysToRemove.Count) processed email entries older than 30 days"
    }
}

# Function to generate contextual response based on email content
function Get-ContextualResponse {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$SenderName,
        [hashtable]$AliasConfig
    )
    
    # Keywords for different types of inquiries
    $QuoteKeywords = @('quote', 'pricing', 'price', 'cost', 'estimate', 'bid', 'how much', 'prototype', 'production', 'machining', 'cnc', 'manufacturing')
    $TechnicalKeywords = @('technical', 'spec', 'specification', 'tolerance', 'material', 'finish', 'cad', 'drawing', 'file', 'step', 'stl', 'iges')
    $UrgentKeywords = @('urgent', 'asap', 'rush', 'deadline', 'immediately', 'emergency')
    $OrderKeywords = @('order', 'purchase', 'payment', 'invoice', 'shipping', 'delivery', 'status')
    
    $SubjectLower = $Subject.ToLower()
    $BodyLower = $Body.ToLower()
    $CombinedText = "$SubjectLower $BodyLower"
    
    # Detect inquiry type
    $IsQuote = $QuoteKeywords | Where-Object { $CombinedText -match $_ }
    $IsTechnical = $TechnicalKeywords | Where-Object { $CombinedText -match $_ }
    $IsUrgent = $UrgentKeywords | Where-Object { $CombinedText -match $_ }
    $IsOrder = $OrderKeywords | Where-Object { $CombinedText -match $_ }
    
    # Build response based on type
    $Response = ""
    
    # Opening acknowledgment
    if ($IsUrgent) {
        $Response += "<p>Thank you for reaching out. I understand this is time-sensitive and I will prioritize your request.</p>`n`n"
    } else {
        $Response += "<p>Thank you for contacting Vectarr. I appreciate you taking the time to reach out to us.</p>`n`n"
    }
    
    # Context-specific response
    if ($IsQuote) {
        $Response += @"
<p>I'd be happy to help you with a quote for your project. Vectarr specializes in instant quoting for machined parts, and we can work with your 3D models directly - no need for detailed 2D drawings if you're still developing your design.</p>

<p><strong>To provide you with an accurate quote, I'll need:</strong></p>
<ul>
<li>Quantity needed (prototype quantity vs. production volume)</li>
<li>Material preference (if known) - aluminum, steel, titanium, etc.</li>
<li>Any critical tolerances or surface finish requirements</li>
<li>Your 3D model file (STEP, STL, IGES, or native CAD format)</li>
</ul>

<p>Once I have these details, I can get you pricing and lead time information quickly. For prototype runs like the one you mentioned, we typically turn quotes around within 24 hours.</p>
"@
    }
    elseif ($IsTechnical) {
        $Response += @"
<p>I'd be glad to assist with your technical questions. Our engineering team has extensive experience with CNC machining processes and can help ensure your design is optimized for manufacturability.</p>

<p><strong>Please share:</strong></p>
<ul>
<li>Your CAD files or technical drawings</li>
<li>Specific tolerance requirements</li>
<li>Material specifications</li>
<li>Intended application or end-use (helps us recommend the best approach)</li>
</ul>

<p>We can review your design and provide feedback on any adjustments that might improve manufacturability or reduce costs.</p>
"@
    }
    elseif ($IsOrder) {
        $Response += @"
<p>Thank you for your order inquiry. I'll be happy to check on the status and provide you with an update.</p>

<p><strong>To assist you efficiently, please provide:</strong></p>
<ul>
<li>Your order or PO number</li>
<li>The email address used when placing the order</li>
<li>Any specific questions about shipping or delivery</li>
</ul>

<p>I aim to respond to all order status requests within a few hours during business hours.</p>
"@
    }
    else {
        $SafeSubject = [System.Net.WebUtility]::HtmlEncode($Subject)
        $Response += @"
<p>I've received your message regarding: <strong>$SafeSubject</strong></p>

<p>I'd like to make sure I understand your needs fully so I can provide the most helpful response. Could you share a bit more detail about:</p>
<ul>
<li>What you're looking to accomplish</li>
<li>Any timeline considerations</li>
<li>The best way for us to move forward together</li>
</ul>
"@
    }
    
    # Closing
    $Response += "`n<p>Please don't hesitate to reach out if you have any immediate questions. I'm here to help.</p>"
    
    return $Response
}

# Define alias configurations with signatures
$AliasConfigs = @{
    "sales@vectarr.com" = @{
        Name = "Morgan Parker"
        Title = "Sales Representative"
        SignatureFile = "sales_signature.htm"
        Phone = "+1 (650) 427-9450"
    }
    "info@vectarr.com" = @{
        Name = "Taylor Brooks"
        Title = "Information Services"
        SignatureFile = "info_signature.htm"
        Phone = "+1 (650) 427-9450"
    }
    "support@vectarr.com" = @{
        Name = "Casey Thompson"
        Title = "Technical Support"
        SignatureFile = "support_signature.htm"
        Phone = "+1 (650) 427-9450"
    }
    "accounts@vectarr.com" = @{
        Name = "Jordan Mitchell"
        Title = "Accounts Department"
        SignatureFile = "accounts_signature.htm"
        Phone = "+1 (650) 427-9450"
    }
    "admin@vectarr.com" = @{
        Name = "Sam Taylor"
        Title = "Administrator"
        SignatureFile = "admin_vectarr_signature.htm"
        Phone = "+1 (650) 427-9450"
    }
    "kwilliamkatul@vectarr.com" = @{
        Name = "Kamal William Katul"
        Title = "Accounts Manager"
        SignatureFile = "kwilliamkatul_vectarr_signature.htm"
        Phone = "+1 (909) 757-3353"
    }
    "asferrazza@vectarr.com" = @{
        Name = "Alexander Sferrazza"
        Title = "Accounts Manager"
        SignatureFile = "asferrazza_vectarr_signature.htm"
        Phone = "(808) 381-8835"
    }
}

# Function to load signature HTML
function Get-SignatureHtml {
    param([string]$SignatureFile)
    
    $SignaturePaths = @(
        (Join-Path $env:APPDATA "Microsoft\Signatures\$SignatureFile"),
        (Join-Path $PSScriptRoot "..\signatures\$SignatureFile"),
        (Join-Path $env:USERPROFILE ".openclaw\workspace\signatures\$SignatureFile")
    )
    
    foreach ($Path in $SignaturePaths) {
        if (Test-Path $Path) {
            return Get-Content $Path -Raw
        }
    }
    
    # Return default signature if file not found
    return $null
}

# Function to set the From address for an email
function Set-EmailFromAddress {
    param(
        $MailItem,
        [string]$FromAddress,
        [string]$FromName
    )
    
    try {
        # PR_SENT_REPRESENTING_EMAIL_ADDRESS
        $MailItem.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x0065001F", $FromAddress)
        # PR_SENT_REPRESENTING_NAME
        $MailItem.PropertyAccessor.SetProperty("http://schemas.microsoft.com/mapi/proptag/0x0042001F", $FromName)
        return $true
    } catch {
        Write-Warning "Could not set From address to $FromAddress : $_"
        return $false
    }
}

# Function to extract sender's name from email body/signature
function Get-SenderDisplayName {
    param(
        [string]$SenderName,
        [string]$SenderEmail,
        [string]$Body
    )
    
    # First, try to use the SenderName if it looks like a real name (not an email)
    if ($SenderName -and $SenderName -notmatch '@' -and $SenderName -notmatch '^\s*$') {
        # Check if it's not just the email local part
        $LocalPart = ($SenderEmail -split '@')[0]
        if ($SenderName -ne $LocalPart) {
            return $SenderName
        }
    }
    
    # Try to extract name from signature patterns in the body
    # Common patterns: "Best regards,\nJohn Doe" or "Thanks,\nJane Smith" or just a name at the end
    $SignaturePatterns = @(
        '(?i)(?:Best regards|Regards|Sincerely|Thanks|Thank you|Cheers),?\s*\r?\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        '(?i)(?:^|\n)\s*(--|—|-)\s*\r?\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        '(?i)(?:^|\n)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\r?\n\s*(?:[\w\.-]+@[\w\.-]+|www\.|http)',
        '(?i)From:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
    )
    
    foreach ($Pattern in $SignaturePatterns) {
        if ($Body -match $Pattern) {
            $MatchedName = $Matches[1]
            # Validate it looks like a name (at least 2 words, mostly letters)
            if ($MatchedName -match '^[A-Za-z\s\-\'']+$' -and $MatchedName.Split(' ').Count -ge 1) {
                return $MatchedName.Trim()
            }
        }
    }
    
    # Fallback: use local part of email (before @)
    if ($SenderEmail -match '^([^@]+)@') {
        $LocalPart = $Matches[1]
        # Clean up common separators
        $CleanName = $LocalPart -replace '[._0-9]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        # Capitalize each word
        $Words = $CleanName -split ' ' | ForEach-Object { 
            if ($_.Length -gt 0) { 
                $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() 
            } 
        }
        return ($Words -join ' ')
    }
    
    # Last resort: return sender name or "there"
    if ($SenderName -and $SenderName -notmatch '^\s*$') {
        return $SenderName
    }
    return "there"
}

# Function to format original message as quoted text
function Get-QuotedOriginalMessage {
    param(
        [string]$SenderName,
        [string]$SenderEmail,
        [string]$Date,
        [string]$Subject,
        [string]$Body
    )
    
    # Clean up the body for quoting (limit length, clean HTML if present)
    $CleanBody = $Body -replace '<[^>]+>', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
    
    # Limit to reasonable length for quoting
    $MaxQuoteLength = 1000
    if ($CleanBody.Length -gt $MaxQuoteLength) {
        $CleanBody = $CleanBody.Substring(0, $MaxQuoteLength) + "..."
    }
    
    $SafeSenderName = [System.Net.WebUtility]::HtmlEncode($SenderName)
    $SafeSenderEmail = [System.Net.WebUtility]::HtmlEncode($SenderEmail)
    $SafeDate = [System.Net.WebUtility]::HtmlEncode($Date)
    $SafeCleanBody = [System.Net.WebUtility]::HtmlEncode($CleanBody)

    $Quote = @"

<div style="border-left: 2px solid #ccc; margin-left: 10px; padding-left: 10px; color: #666;">
<p><strong>On $SafeDate, $SafeSenderName &lt;$SafeSenderEmail&gt; wrote:</strong></p>
<p style="white-space: pre-wrap;">$SafeCleanBody</p>
</div>
"@
    
    return $Quote
}

# Get all Vectarr accounts (including Admin@vectarr.com explicitly)
$Accounts = $Namespace.Accounts | Where-Object { $_.SmtpAddress -like "*@vectarr.com" }

# Ensure Admin@vectarr.com is included in processing (try both casings)
$AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "Admin@vectarr.com" }
if (-not $AdminAccount) {
    $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
}
if ($AdminAccount -and $Accounts -notcontains $AdminAccount) {
    $Accounts += $AdminAccount
}

# Map alias folders to their corresponding email addresses
$AliasFolderMap = @{
    "Sales" = "sales@vectarr.com"
    "Support" = "support@vectarr.com"
    "Accounts" = "accounts@vectarr.com"
    "info" = "info@vectarr.com"
}

$NewEmails = @()

# Archive folder cleanup - move all undeliverable emails (read and unread) to archive
foreach ($Account in $Accounts) {
    try {
        Write-Host "Cleaning up undeliverable emails for: $($Account.SmtpAddress)"
        $Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
        $ArchiveFolder = $Namespace.Folders($Account.SmtpAddress).Folders("Archive")
        
        # If Archive folder doesn't exist, try to find/create it
        if (-not $ArchiveFolder) {
            try {
                $ArchiveFolder = $Namespace.Folders($Account.SmtpAddress).Folders("Archives")
            } catch {
                # No archive folder, just mark as read
                $ArchiveFolder = $null
            }
        }
        
        # Check all items (not just unread) for undeliverable emails
        $AllItems = $Inbox.Items
        $UndeliverableCount = 0
        
        # First pass: collect items to move (avoid modifying collection during iteration)
        $ItemsToArchive = @()
        foreach ($Item in $AllItems) {
            if (-not $Item) { continue }
            
            if (Test-UndeliverableEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress) {
                $ItemsToArchive += $Item
            }
        }
        
        # Second pass: move collected items
        foreach ($Item in $ItemsToArchive) {
            $UndeliverableCount++
            Write-Host "  Archiving undeliverable: $($Item.Subject)"
            
            $Item.UnRead = $false
            $Item.Save()
            
            if ($ArchiveFolder) {
                try {
                    $Item.Move($ArchiveFolder) | Out-Null
                } catch {
                    Write-Warning "Could not move to archive: $_"
                }
            }
        }
        
        if ($UndeliverableCount -gt 0) {
            Write-Host "  Archived $UndeliverableCount undeliverable emails" -ForegroundColor Green
        }
    }
    catch {
        Write-Warning "Error cleaning up undeliverables for $($Account.SmtpAddress): $_"
    }
}

# Archive folder cleanup - move all job hunting emails (read and unread) to archive
foreach ($Account in $Accounts) {
    try {
        Write-Host "Cleaning up job hunting emails for: $($Account.SmtpAddress)"
        $Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
        $ArchiveFolder = $Namespace.Folders($Account.SmtpAddress).Folders("Archive")
        
        # If Archive folder doesn't exist, try to find/create it
        if (-not $ArchiveFolder) {
            try {
                $ArchiveFolder = $Namespace.Folders($Account.SmtpAddress).Folders("Archives")
            } catch {
                $ArchiveFolder = $null
            }
        }
        
        # Check all items for job hunting emails
        $AllItems = $Inbox.Items
        $JobHuntingCount = 0
        
        # First pass: collect items to move (avoid modifying collection during iteration)
        $ItemsToArchive = @()
        foreach ($Item in $AllItems) {
            if (-not $Item) { continue }
            
            if (Test-JobHuntingEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress) {
                $ItemsToArchive += $Item
            }
        }
        
        # Second pass: move collected items
        foreach ($Item in $ItemsToArchive) {
            $JobHuntingCount++
            Write-Host "  Archiving job hunting email: $($Item.Subject)"
            
            $Item.UnRead = $false
            $Item.Save()
            
            if ($ArchiveFolder) {
                try {
                    $Item.Move($ArchiveFolder) | Out-Null
                } catch {
                    Write-Warning "Could not move to archive: $_"
                }
            }
        }
        
        if ($JobHuntingCount -gt 0) {
            Write-Host "  Archived $JobHuntingCount job hunting emails" -ForegroundColor Green
        }
    }
    catch {
        Write-Warning "Error cleaning up job hunting emails for $($Account.SmtpAddress): $_"
    }
}

# Process main accounts
foreach ($Account in $Accounts) {
    try {
        Write-Host "Processing account: $($Account.SmtpAddress)"
        $Inbox = $Namespace.Folders($Account.SmtpAddress).Folders("Inbox")
        $UnreadItems = $Inbox.Items.Restrict("[Unread] = true")
        Write-Host "  Found $($UnreadItems.Count) unread items"
        
        foreach ($Item in $UnreadItems) {
            # Skip if item is null
            if (-not $Item) { continue }
            
            # Skip items with no sender (e.g., undeliverable bounce-backs)
            if ([string]::IsNullOrWhiteSpace($Item.SenderEmailAddress)) {
                Write-Host "  Skipping item with no sender: $($Item.Subject)"
                $Item.UnRead = $false
                $Item.Save()
                continue
            }
            
            $EmailId = "$($Account.SmtpAddress)_$($Item.EntryID)"
            
            if (-not $ProcessedEmails.ContainsKey($EmailId)) {
                # Check email types
                $IsMarketing = Test-MarketingEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress
                $IsJobHunting = Test-JobHuntingEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress
                $IsUndeliverable = Test-UndeliverableEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress
                
                $EmailData = @{
                    id = $EmailId
                    account = $Account.SmtpAddress
                    received = $Item.ReceivedTime.ToString("o")
                    sender = $Item.SenderEmailAddress
                    senderName = $Item.SenderName
                    subject = $Item.Subject
                    body = $Item.Body
                    preview = if ($Item.Body) { $Item.Body.Substring(0, [Math]::Min(200, $Item.Body.Length)) } else { "" }
                    importance = $Item.Importance
                    categories = @($Item.Categories)
                    isMarketing = $IsMarketing
                    isJobHunting = $IsJobHunting
                    isUndeliverable = $IsUndeliverable
                }
                
                $NewEmails += $EmailData
                $ProcessedEmails[$EmailId] = @{
                    processed = (Get-Date).ToString("o")
                    subject = $Item.Subject
                    isMarketing = $IsMarketing
                    isJobHunting = $IsJobHunting
                    isUndeliverable = $IsUndeliverable
                }
                
                # Handle undeliverable emails - mark as read and skip
                if ($IsUndeliverable) {
                    Write-Host "Undeliverable email detected: $($Item.Subject) - Archiving"
                    $Item.UnRead = $false
                    $Item.Save()
                    continue
                }
                
                # Handle job hunting emails - mark as read and skip
                if ($IsJobHunting) {
                    Write-Host "Job hunting email detected: $($Item.Subject) from $($Item.SenderName) - Archiving"
                    $Item.UnRead = $false
                    $Item.Save()
                    continue
                }
                
                # Handle marketing emails - mark as read and skip draft creation
                if ($IsMarketing) {
                    Write-Host "Marketing email detected: $($Item.Subject) from $($Item.SenderName) - Archiving"
                    $Item.UnRead = $false
                    $Item.Save()
                    continue
                }
                
                # Get alias configuration
                $AliasConfig = $AliasConfigs[$Account.SmtpAddress]
                if (-not $AliasConfig) {
                    $AliasConfig = $AliasConfigs["admin@vectarr.com"]
                }
                
                # Load signature HTML
                $SignatureHtml = Get-SignatureHtml -SignatureFile $AliasConfig.SignatureFile
                
                # Build signature text fallback
                $SignatureText = "Best regards,`n`n$($AliasConfig.Name)`n$($AliasConfig.Title)`nVectarr`n$($AliasConfig.Phone)`n5900 Balcones Drive, Suite 100, Austin, TX 78731"
                
                # Create draft response
                $Draft = $Outlook.CreateItem(0)  # 0 = olMailItem
                
                # Set recipient - handle both SMTP and Exchange X.500 addresses
                $RecipientAddress = $Item.SenderEmailAddress
                # If it's an internal Exchange address, try to get the SMTP address from the sender
                if ($RecipientAddress -match "^/O=|EX:|IM:") {
                    try {
                        $RecipientAddress = $Item.Sender.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x39FE001E")
                    } catch {
                        # Fallback to ReplyTo if available
                        if ($Item.ReplyTo.Count -gt 0) {
                            $RecipientAddress = $Item.ReplyTo.Item(1).Address
                        }
                    }
                }
                $Draft.Recipients.Add($RecipientAddress) | Out-Null
                $Draft.Recipients.ResolveAll() | Out-Null
                
                $Draft.Subject = "RE: $($Item.Subject)"
                
                # Set the sending account (main account for all aliases)
                $Draft.SendUsingAccount = $MainAccount
                
                # Set the From address to appear as the alias (not asferrazza)
                if ($Account.SmtpAddress -ne "asferrazza@vectarr.com") {
                    Set-EmailFromAddress -MailItem $Draft -FromAddress $Account.SmtpAddress -FromName $AliasConfig.Name | Out-Null
                }
                
                # Set Reply-To to the alias address so replies come to the correct inbox
                $Draft.ReplyRecipients.Add($Account.SmtpAddress) | Out-Null
                
                # Extract sender's display name (from signature or email)
                $DisplayName = Get-SenderDisplayName -SenderName $Item.SenderName -SenderEmail $Item.SenderEmailAddress -Body $Item.Body
                
                # Generate contextual response based on email content
                $ResponseBody = Get-ContextualResponse -Subject $Item.Subject -Body $Item.Body -SenderName $DisplayName -AliasConfig $AliasConfig
                
                # Get quoted original message
                $QuotedMessage = Get-QuotedOriginalMessage -SenderName $Item.SenderName -SenderEmail $Item.SenderEmailAddress -Date $Item.ReceivedTime.ToString("g") -Subject $Item.Subject -Body $Item.Body
                
                # Build email body WITH signature included
                $SafeDisplayName = [System.Net.WebUtility]::HtmlEncode($DisplayName)
                if ($SignatureHtml) {
                    $Draft.HTMLBody = @"
<html>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt;">
<p>Dear $SafeDisplayName,</p>

$ResponseBody

$QuotedMessage

<!-- SIGNATURE START -->
$SignatureHtml
<!-- SIGNATURE END -->
</body>
</html>
"@
                } else {
                    # Fallback to text signature if HTML signature not found
                    $Draft.Body = @"
Dear $DisplayName,

$ResponseBody

Best regards,

$($AliasConfig.Name)
$($AliasConfig.Title)
Vectarr
$($AliasConfig.Phone)
5900 Balcones Drive, Suite 100, Austin, TX 78731

--- Original Message ---
From: $($Item.SenderName) <$($Item.SenderEmailAddress)>
Date: $($Item.ReceivedTime.ToString("g"))
Subject: $($Item.Subject)

$($Item.Body)
"@
                }
                
                # Save the draft and move to admin@vectarr.com Drafts folder
                $Draft.Save()
                Write-Host "Draft created with EntryID: $($Draft.EntryID)"
                
                # Move to Admin@vectarr.com Drafts folder (note the capital A)
                try {
                    $AdminFolder = $Namespace.Folders("Admin@vectarr.com")
                    $DraftsFolder = $AdminFolder.Folders("Drafts")
                    $Draft.Move($DraftsFolder) | Out-Null
                    Write-Host "Draft moved to Admin@vectarr.com Drafts folder"
                } catch {
                    Write-Warning "Could not move draft to Admin@vectarr.com Drafts folder: $_"
                }
                
                # Save draft metadata
                $DraftFile = "$OutputPath\drafts\$($EmailId)_draft.json"
                @{
                    originalEmail = $EmailData
                    draftItemId = $Draft.EntryID
                    draftSubject = $Draft.Subject
                    aliasConfig = $AliasConfig
                    replyTo = $Account.SmtpAddress
                    signatureLoaded = ($SignatureHtml -ne $null)
                } | ConvertTo-Json -Depth 10 | Out-File $DraftFile
                
                Write-Host "Created draft for: $($Item.Subject) from $($Account.SmtpAddress) as $($AliasConfig.Name)"
            }
        }
    }
    catch {
        Write-Error "Error processing account $($Account.SmtpAddress): $_"
    }
}

# Process alias folders (Sales, Support, Accounts, info)
foreach ($FolderName in $AliasFolderMap.Keys) {
    try {
        $AliasEmail = $AliasFolderMap[$FolderName]
        Write-Host "Checking alias folder: $FolderName ($AliasEmail)"
        
        $Inbox = $Namespace.Folders($FolderName).Folders("Inbox")
        $UnreadItems = $Inbox.Items.Restrict("[Unread] = true")
        
        foreach ($Item in $UnreadItems) {
            $EmailId = "$($AliasEmail)_$($Item.EntryID)"
            
            if (-not $ProcessedEmails.ContainsKey($EmailId)) {
                # Check if this is a marketing email
                $IsMarketing = Test-MarketingEmail -Subject $Item.Subject -Body $Item.Body -SenderEmail $Item.SenderEmailAddress
                
                $EmailData = @{
                    id = $EmailId
                    account = $AliasEmail
                    received = $Item.ReceivedTime.ToString("o")
                    sender = $Item.SenderEmailAddress
                    senderName = $Item.SenderName
                    subject = $Item.Subject
                    body = $Item.Body
                    preview = if ($Item.Body) { $Item.Body.Substring(0, [Math]::Min(200, $Item.Body.Length)) } else { "" }
                    importance = $Item.Importance
                    categories = @($Item.Categories)
                    isMarketing = $IsMarketing
                }
                
                $NewEmails += $EmailData
                $ProcessedEmails[$EmailId] = @{
                    processed = (Get-Date).ToString("o")
                    subject = $Item.Subject
                    isMarketing = $IsMarketing
                }
                
                # Handle marketing emails - mark as read and skip draft creation
                if ($IsMarketing) {
                    Write-Host "Marketing email detected: $($Item.Subject) from $($Item.SenderName) - Archiving"
                    $Item.UnRead = $false
                    $Item.Save()
                    continue
                }
                
                # Get alias configuration for this specific alias
                $AliasConfig = $AliasConfigs[$AliasEmail]
                if (-not $AliasConfig) {
                    $AliasConfig = $AliasConfigs["admin@vectarr.com"]
                }
                
                # Load signature HTML
                $SignatureHtml = Get-SignatureHtml -SignatureFile $AliasConfig.SignatureFile
                
                # Build signature text fallback
                $SignatureText = "Best regards,`n`n$($AliasConfig.Name)`n$($AliasConfig.Title)`nVectarr`n$($AliasConfig.Phone)`n5900 Balcones Drive, Suite 100, Austin, TX 78731"
                
                # Extract sender's display name (from signature or email)
                $DisplayName = Get-SenderDisplayName -SenderName $Item.SenderName -SenderEmail $Item.SenderEmailAddress -Body $Item.Body
                
                # Generate contextual response
                $ResponseBody = Get-ContextualResponse -Subject $Item.Subject -Body $Item.Body -SenderName $DisplayName -AliasConfig $AliasConfig
                
                # Get quoted original message
                $QuotedMessage = Get-QuotedOriginalMessage -SenderName $Item.SenderName -SenderEmail $Item.SenderEmailAddress -Date $Item.ReceivedTime.ToString("g") -Subject $Item.Subject -Body $Item.Body
                
                # Create draft response
                $Draft = $Outlook.CreateItem(0)  # 0 = olMailItem
                
                # Set recipient - handle both SMTP and Exchange X.500 addresses
                $RecipientAddress = $Item.SenderEmailAddress
                if ($RecipientAddress -match "^/O=|EX:|IM:") {
                    try {
                        $RecipientAddress = $Item.Sender.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x39FE001E")
                    } catch {
                        if ($Item.ReplyTo.Count -gt 0) {
                            $RecipientAddress = $Item.ReplyTo.Item(1).Address
                        }
                    }
                }
                $Draft.Recipients.Add($RecipientAddress) | Out-Null
                $Draft.Recipients.ResolveAll() | Out-Null
                
                $Draft.Subject = "RE: $($Item.Subject)"
                
                # Set the sending account (main account for all aliases)
                $Draft.SendUsingAccount = $MainAccount
                
                # Set the From address to appear as the alias (not asferrazza)
                Set-EmailFromAddress -MailItem $Draft -FromAddress $AliasEmail -FromName $AliasConfig.Name | Out-Null
                
                # Set Reply-To to the alias address so replies come to the correct inbox
                $Draft.ReplyRecipients.Add($AliasEmail) | Out-Null
                
                # Build email body WITHOUT signature (Outlook will add it automatically)
                $SafeDisplayName = [System.Net.WebUtility]::HtmlEncode($DisplayName)
                if ($SignatureHtml) {
                    $Draft.HTMLBody = @"
<html>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt;">
<p>Dear $SafeDisplayName,</p>

$ResponseBody

$QuotedMessage
</body>
</html>
"@
                } else {
                    $Draft.Body = @"
Dear $DisplayName,

$ResponseBody

--- Original Message ---
From: $($Item.SenderName) <$($Item.SenderEmailAddress)>
Date: $($Item.ReceivedTime.ToString("g"))
Subject: $($Item.Subject)

$($Item.Body)
"@
                }
                
                # Save the draft and move to admin@vectarr.com Drafts folder
                $Draft.Save()
                Write-Host "Draft created with EntryID: $($Draft.EntryID)"
                
                # Move to Admin@vectarr.com Drafts folder (note the capital A)
                try {
                    $AdminFolder = $Namespace.Folders("Admin@vectarr.com")
                    $DraftsFolder = $AdminFolder.Folders("Drafts")
                    $Draft.Move($DraftsFolder) | Out-Null
                    Write-Host "Draft moved to Admin@vectarr.com Drafts folder"
                } catch {
                    Write-Warning "Could not move draft to Admin@vectarr.com Drafts folder: $_"
                }
                
                # Save draft metadata
                $DraftFile = "$OutputPath\drafts\$($EmailId)_draft.json"
                @{
                    originalEmail = $EmailData
                    draftItemId = $Draft.EntryID
                    draftSubject = $Draft.Subject
                    aliasConfig = $AliasConfig
                    replyTo = $AliasEmail
                    signatureLoaded = ($SignatureHtml -ne $null)
                } | ConvertTo-Json -Depth 10 | Out-File $DraftFile
                
                Write-Host "Created draft for: $($Item.Subject) from $AliasEmail as $($AliasConfig.Name)"
            }
        }
    }
    catch {
        Write-Error "Error processing alias folder $FolderName : $_"
    }
}

# Save tracking data
$ProcessedEmails | ConvertTo-Json | Out-File $TrackingFile

# Output results
if ($Action -eq "check") {
    Write-Output @{newEmails = $NewEmails.Count; emails = $NewEmails} | ConvertTo-Json -Depth 10
}
elseif ($Action -eq "summary") {
    # Generate daily summary
    $SummaryDate = Get-Date -Format "yyyy-MM-dd"
    $SummaryFile = "$OutputPath\summaries\$SummaryDate.md"
    
    # Separate email types
    $RegularEmails = $NewEmails | Where-Object { -not $_.isMarketing -and -not $_.isJobHunting -and -not $_.isUndeliverable }
    $MarketingEmails = $NewEmails | Where-Object { $_.isMarketing }
    $JobHuntingEmails = $NewEmails | Where-Object { $_.isJobHunting }
    $UndeliverableEmails = $NewEmails | Where-Object { $_.isUndeliverable }
    $TotalArchived = $MarketingEmails.Count + $JobHuntingEmails.Count + $UndeliverableEmails.Count
    
    $Summary = @"
# Email Summary - $SummaryDate

## New Emails Received: $($NewEmails.Count) ($($RegularEmails.Count) actionable, $TotalArchived archived)

"@
    
    if ($RegularEmails.Count -gt 0) {
        $Summary += "## Actionable Emails`n"
        foreach ($Email in $RegularEmails) {
            $AliasConfig = $AliasConfigs[$Email.account]
            $AssignedPersona = if ($AliasConfig) { "$($AliasConfig.Name) ($($AliasConfig.Title))" } else { "Alexander Sferrazza" }
            
            $Summary += @"

### From: $($Email.senderName) <$($Email.sender)>
- **Received In:** $($Email.account)
- **Assigned Persona:** $AssignedPersona
- **Subject:** $($Email.subject)
- **Received:** $($Email.received)
- **Preview:** $($Email.preview)

"@
        }
    }
    
    if ($UndeliverableEmails.Count -gt 0) {
        $Summary += "`n## Archived Undeliverable Emails`n"
        foreach ($Email in $UndeliverableEmails) {
            $Summary += "- **$($Email.subject)**`n"
        }
    }
    
    if ($JobHuntingEmails.Count -gt 0) {
        $Summary += "`n## Archived Job Hunting/Recruiting Emails`n"
        foreach ($Email in $JobHuntingEmails) {
            $Summary += "- **$($Email.senderName)**: $($Email.subject)`n"
        }
    }
    
    if ($MarketingEmails.Count -gt 0) {
        $Summary += "`n## Archived Marketing Emails`n"
        foreach ($Email in $MarketingEmails) {
            $Summary += "- **$($Email.senderName)**: $($Email.subject)`n"
        }
    }
    
    $Summary += @"

## Draft Responses Created
Draft responses have been saved in Outlook Drafts folder with:
- Correct alias signatures loaded from signature files
- Reply-To set to the appropriate alias address
- Proper persona attribution for each account

## Draft Location
Outlook > Drafts folder - Review and send from there

## Action Items
- [ ] Review draft responses in Outlook
- [ ] Edit AI placeholder text with appropriate responses
- [ ] Send approved responses (will appear from correct alias)
- [ ] Follow up on urgent items

---
*Generated by Deep Thought Email Monitor*
"@
    
    $Summary | Out-File $SummaryFile
    Write-Output "Summary saved to: $SummaryFile"
}

# Cleanup COM objects
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()