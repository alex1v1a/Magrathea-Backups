# Machine Shop Outreach - Integrated Web Discovery
# Performs web searches directly to find new shops when database is exhausted
# Updated: 2026-04-05 - Expanded search regions and improved discovery

param(
    [int]$MaxShops = 10,
    [switch]$SearchAll,
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [string]$OutputPath = "$PSScriptRoot\..\email_data",
    [string]$DataPath = "$PSScriptRoot\..\data",
    [switch]$SkipWebSearch,
    [int]$MinShopsThreshold = 5  # Minimum shops needed before triggering web search
)

# Generic email prefixes to avoid using as names
$GenericPrefixes = @('hello', 'support', 'rfq', 'sales', 'info', 'contact', 'admin', 'help', 'service', 'inquiry', 'quote', 'quotes', 'office', 'team', 'mail', 'email')

# Expanded search regions - organized by priority and geography
$SearchRegions = @(
    # Texas (primary market)
    "Texas CNC machine shops",
    "Houston CNC machining",
    "Dallas Fort Worth machine shops",
    "Austin Texas precision machining",
    "San Antonio CNC machine shop",
    "El Paso manufacturing",
    # Southwest
    "Arizona CNC machine shops Phoenix",
    "New Mexico machine shops Albuquerque",
    "Colorado precision machining Denver",
    # West Coast
    "California CNC machine shops Los Angeles",
    "California machining San Diego",
    "California manufacturing Bay Area",
    "Oregon machine shops Portland",
    "Washington CNC machining Seattle",
    # Midwest
    "Illinois CNC machine shops Chicago",
    "Ohio machine shops Cleveland Columbus",
    "Michigan precision machining Detroit",
    "Indiana CNC machining Indianapolis",
    "Wisconsin machine shops Milwaukee",
    "Minnesota manufacturing Minneapolis",
    # Southeast
    "Florida CNC machine shops Miami Orlando",
    "Georgia machine shops Atlanta",
    "North Carolina machining Charlotte Raleigh",
    "Tennessee manufacturing Nashville",
    "Alabama machine shops Birmingham",
    # Northeast
    "Pennsylvania CNC machining Pittsburgh Philadelphia",
    "New York machine shops Buffalo Rochester",
    "Massachusetts manufacturing Boston",
    "Connecticut precision machining",
    # Other priority regions
    "Oklahoma CNC machine shops Tulsa Oklahoma City",
    "Kansas manufacturing Wichita",
    "Missouri machine shops Kansas City St Louis",
    "Louisiana CNC machining New Orleans Baton Rouge",
    "Nevada machine shops Las Vegas Reno",
    "Utah manufacturing Salt Lake City",
    "Idaho CNC machining Boise"
)

# Ensure directories exist
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\outreach"
$null = New-Item -ItemType Directory -Force -Path $DataPath

# Initialize Outlook
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get Admin@vectarr.com account and Drafts folder
try {
    $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "Admin@vectarr.com" }
    if (-not $AdminAccount) {
        $AdminAccount = $Namespace.Accounts | Where-Object { $_.SmtpAddress -eq "admin@vectarr.com" }
    }
    $AdminFolder = $Namespace.Folders("Admin@vectarr.com")
    $DraftsFolder = $AdminFolder.Folders("Drafts")
    Write-Host "Connected to Admin@vectarr.com Drafts folder"
} catch {
    Write-Error "Failed to access Admin@vectarr.com account or Drafts folder: $_"
    exit 1
}

# Load outreach template
try {
    $TemplateHtml = Get-Content $TemplatePath -Raw
    Write-Host "Loaded outreach template from $TemplatePath"
} catch {
    Write-Error "Failed to load template: $_"
    exit 1
}

# Function to check if a name looks like a generic prefix
function Test-GenericName {
    param([string]$Name)
    
    if ([string]::IsNullOrWhiteSpace($Name)) { return $true }
    
    $NameLower = $Name.ToLower().Trim()
    foreach ($Prefix in $GenericPrefixes) {
        if ($NameLower -eq $Prefix -or $NameLower.StartsWith($Prefix + '@')) {
            return $true
        }
    }
    return $false
}

# Function to extract first name from full name
function Get-FirstName {
    param([string]$FullName)
    
    if ([string]::IsNullOrWhiteSpace($FullName) -or $FullName -eq ' ') {
        return $null
    }
    
    # Handle "Last, First" format
    if ($FullName -match ',\s*') {
        $Parts = $FullName -split ',\s*'
        if ($Parts.Count -ge 2) {
            $FirstName = $Parts[1].Trim()
            $FirstNameParts = $FirstName -split '\s+'
            return $FirstNameParts[0].Trim()
        }
    }
    
    # Handle regular "First Last" format
    $Parts = $FullName -split '\s+'
    if ($Parts.Count -ge 1) {
        return $Parts[0].Trim()
    }
    
    return $FullName.Trim()
}

# Function to extract name from email local part
function Get-NameFromEmail {
    param([string]$Email)
    
    if ([string]::IsNullOrWhiteSpace($Email) -or $Email -eq "INVALID") {
        return $null
    }
    
    if ($Email -match '^([^@]+)@') {
        $LocalPart = $Matches[1].ToLower()
        
        if ($GenericPrefixes -contains $LocalPart) {
            return $null
        }
        
        $CleanName = $LocalPart -replace '[0-9]', '' -replace '[._-]', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
        
        if ($CleanName.Length -ge 2 -and $CleanName -match '^[a-zA-Z\s]+$') {
            $Words = $CleanName -split '\s+' | ForEach-Object { 
                if ($_.Length -gt 0) { 
                    $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() 
                } 
            }
            return ($Words -join ' ')
        }
    }
    
    return $null
}

# Function to get the best contact name
function Get-ContactName {
    param(
        [string]$FullName,
        [string]$FirstName,
        [string]$LastName,
        [string]$Email,
        [string]$ShopName
    )
    
    if (-not [string]::IsNullOrWhiteSpace($FullName) -and $FullName -ne ' ') {
        $ExtractedFirst = Get-FirstName -FullName $FullName
        if (-not (Test-GenericName -Name $ExtractedFirst)) {
            return $ExtractedFirst
        }
    }
    
    if (-not [string]::IsNullOrWhiteSpace($FirstName) -and $FirstName -ne ' ') {
        $CleanFirst = $FirstName.Trim() -replace ',$', ''
        if (-not (Test-GenericName -Name $CleanFirst)) {
            return $CleanFirst
        }
    }
    
    $EmailName = Get-NameFromEmail -Email $Email
    if (-not [string]::IsNullOrWhiteSpace($EmailName)) {
        return $EmailName
    }
    
    return "Hello"
}

# Function to load machine shops from CSV
function Get-MachineShops {
    param(
        [string]$Path, 
        [int]$Max,
        [switch]$SearchAll
    )
    
    try {
        $AllShops = Import-Csv -Path $Path
        $Shops = @()
        $Row = 2
        $TotalRows = $AllShops.Count
        Write-Host "Searching through $TotalRows shops in database..."
        
        foreach ($Shop in $AllShops) {
            $Status = if ($Shop.Status) { $Shop.Status } else { "" }
            $DateContacted = $Shop.'Date Contacted'
            $OutreachStatus = if ($Shop.'Outreach Status') { $Shop.'Outreach Status' } else { "" }
            
            if ($Status -eq "Contacted" -and -not [string]::IsNullOrWhiteSpace($DateContacted)) {
                Write-Host "Skipping row $Row - already contacted on $DateContacted"
                $Row++
                continue
            }
            
            if ($OutreachStatus -eq "1st Email Sent") {
                Write-Host "Skipping row $Row - 1st outreach email already sent"
                $Row++
                continue
            }
            
            if ([string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted" -or $Status -eq "Error") {
                if ([string]::IsNullOrWhiteSpace($Shop.email) -or $Shop.email -eq "INVALID" -or $Shop.email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
                    Write-Host "Skipping row $Row - no valid email address for $($Shop.name)"
                    $Row++
                    continue
                }
                
                $Location = if ($Shop.city -and $Shop.state) { "$($Shop.city), $($Shop.state)" } elseif ($Shop.city) { $Shop.city } elseif ($Shop.state) { $Shop.state } else { "" }
                
                $ContactName = Get-ContactName -FullName $Shop.full_name -FirstName $Shop.first_name -LastName $Shop.last_name -Email $Shop.email -ShopName $Shop.name
                
                $Capabilities = $Shop.subtypes
                if ($Capabilities -eq "Machine shop" -or $Capabilities -eq "Machine Shop") {
                    $Capabilities = "precision machining"
                }
                
                $ShopObj = @{
                    Row = $Row
                    ShopName = $Shop.name
                    Location = $Location
                    ContactName = $ContactName
                    Email = $Shop.email
                    Phone = $Shop.phone
                    Capabilities = $Capabilities
                    Website = $Shop.site
                    Notes = ""
                }
                $Shops += $ShopObj
                
                if ($Shops.Count -ge $Max -and -not $SearchAll) { break }
            }
            
            $Row++
            
            if ($Row -gt 10000) { 
                Write-Warning "Reached safety limit of 10,000 rows. Stopping search."
                break 
            }
        }
        
        return $Shops
    } catch {
        Write-Error "Failed to load machine shops from CSV: $_"
        return @()
    }
}

# Function to count uncontacted shops in database
function Get-UncontactedShopCount {
    param([string]$Path)
    
    try {
        $AllShops = Import-Csv -Path $Path
        $Count = 0
        
        foreach ($Shop in $AllShops) {
            $Status = if ($Shop.Status) { $Shop.Status } else { "" }
            $DateContacted = $Shop.'Date Contacted'
            $OutreachStatus = if ($Shop.'Outreach Status') { $Shop.'Outreach Status' } else { "" }
            
            # Count if not contacted and has valid email
            if (($Status -eq "" -or $Status -eq "Not Contacted" -or $Status -eq "Error") -and 
                $OutreachStatus -ne "1st Email Sent" -and
                -not [string]::IsNullOrWhiteSpace($Shop.email) -and 
                $Shop.email -ne "INVALID" -and 
                $Shop.email -match '@') {
                $Count++
            }
        }
        
        return $Count
    } catch {
        Write-Error "Failed to count uncontacted shops: $_"
        return 0
    }
}

# Function to perform web search using OpenClaw CLI
function Invoke-WebDiscovery {
    param(
        [int]$TargetCount = 10,
        [string]$OutputDir = "$PSScriptRoot\..\data"
    )
    
    Write-Host "`n=== Starting Web Search Discovery ==="
    Write-Host "Target: Find $TargetCount new machine shops with valid emails"
    
    $DateStr = Get-Date -Format "yyyyMMdd"
    $OutputFile = "$OutputDir\new_shops_${DateStr}.json"
    $LogFile = "$OutputDir\discovery_${DateStr}.log"
    
    # Shuffle regions for variety
    $ShuffledRegions = $SearchRegions | Sort-Object { Get-Random }
    
    $DiscoveredShops = @()
    $AttemptedRegions = @()
    $RegionIndex = 0
    
    # Try OpenClaw web search first
    foreach ($Region in $ShuffledRegions) {
        if ($DiscoveredShops.Count -ge $TargetCount * 2) { break }  # Get extra for filtering
        if ($RegionIndex -ge 10) { break }  # Limit to 10 regions per run
        
        Write-Host "Searching: $Region"
        $AttemptedRegions += $Region
        $RegionIndex++
        
        try {
            # Use OpenClaw CLI for web search
            $SearchResult = & openclaw web-search "CNC machine shops $Region contact email" --count 5 2>$null
            
            if ($SearchResult) {
                Write-Host "  -> Found results for $Region"
                # Parse and extract shop information
                # Results would need to be processed by a sub-agent for extraction
            }
            
        } catch {
            Write-Warning "Web search failed for $Region`: $_"
        }
        
        Start-Sleep -Milliseconds 500
    }
    
    # Create discovery request file for sub-agent processing
    $DiscoveryRequest = @{
        Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TargetCount = $TargetCount
        Regions = $AttemptedRegions
        Status = "Pending Sub-Agent Processing"
    }
    
    $RequestFile = "$OutputDir\discovery_request_${DateStr}.json"
    $DiscoveryRequest | ConvertTo-Json -Depth 3 | Out-File -FilePath $RequestFile -Encoding UTF8
    
    Write-Host "`n=== Discovery Request Created ==="
    Write-Host "Request file: $RequestFile"
    Write-Host "Regions queued: $($AttemptedRegions.Count)"
    Write-Host "`nSub-agent will process these regions and extract shop data."
    
    return @{
        RequestFile = $RequestFile
        QueuedRegions = $AttemptedRegions
        Status = "Pending"
    }
}

# Function to check for and process discovered shops
function Get-DiscoveredShops {
    param(
        [string]$DataDir = "$PSScriptRoot\..\data",
        [int]$MaxShops = 10
    )
    
    $DateStr = Get-Date -Format "yyyyMMdd"
    $YesterdayStr = (Get-Date).AddDays(-1).ToString("yyyyMMdd")
    
    $DiscoveredFiles = @()
    
    # Look for discovery files from today and yesterday
    foreach ($Date in @($DateStr, $YesterdayStr)) {
        $File = "$DataDir\new_shops_${Date}.json"
        if (Test-Path $File) {
            $DiscoveredFiles += $File
        }
    }
    
    $AllDiscovered = @()
    
    foreach ($File in $DiscoveredFiles) {
        try {
            $Content = Get-Content $File -Raw | ConvertFrom-Json
            if ($Content.Shops) {
                $AllDiscovered += $Content.Shops
            }
        } catch {
            Write-Warning "Failed to parse discovery file $File`: $_"
        }
    }
    
    return $AllDiscovered | Select-Object -First $MaxShops
}

# Function to add discovered shops to CSV
function Add-ShopsToCsv {
    param(
        [string]$CsvPath,
        [array]$NewShops
    )
    
    try {
        $ExistingShops = Import-Csv -Path $CsvPath
        $ExistingEmails = $ExistingShops | ForEach-Object { $_.email.ToLower() } | Where-Object { $_ }
        
        $AddedCount = 0
        
        foreach ($Shop in $NewShops) {
            if ($ExistingEmails -contains $Shop.Email.ToLower()) {
                Write-Host "Skipping duplicate: $($Shop.ShopName) ($($Shop.Email))"
                continue
            }
            
            $NewRow = [PSCustomObject]@{
                name = $Shop.ShopName
                full_name = $Shop.ContactName
                first_name = ""
                last_name = ""
                email = $Shop.Email
                phone = $Shop.Phone
                site = $Shop.Website
                city = $Shop.City
                state = $Shop.State
                subtypes = $Shop.Capabilities
                Status = "Not Contacted"
                "Date Contacted" = ""
                "Outreach Status" = ""
                "Last Outbound Date" = ""
                Notes = "Discovered via web search on $(Get-Date -Format 'yyyy-MM-dd')"
            }
            
            $ExistingShops += $NewRow
            $AddedCount++
            Write-Host "Added: $($Shop.ShopName) ($($Shop.Email))"
        }
        
        $ExistingShops | Export-Csv -Path $CsvPath -NoTypeInformation
        Write-Host "`nAdded $AddedCount new shops to database"
        return $AddedCount
        
    } catch {
        Write-Error "Failed to add shops to CSV: $_"
        return 0
    }
}

# Function to sanitize text
function Sanitize-Text {
    param([string]$Text)
    
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }
    
    $Text = $Text -replace [char]0x201C, '"'
    $Text = $Text -replace [char]0x201D, '"'
    $Text = $Text -replace [char]0x2018, "'"
    $Text = $Text -replace [char]0x2019, "'"
    $Text = $Text -replace [char]0x2013, '-'
    $Text = $Text -replace [char]0x2014, '-'
    $Text = $Text -replace [char]0x2026, '...'
    
    return $Text.Trim()
}

# Function to generate appropriate greeting
function Get-Greeting {
    param([string]$ContactName)
    
    $GenericGreetings = @('Hello', 'Hi there', 'Greetings', 'Good morning', 'Good afternoon')
    
    $IsGeneric = $false
    foreach ($Generic in $GenericGreetings) {
        if ($ContactName -eq $Generic) {
            $IsGeneric = $true
            break
        }
    }
    
    if ($IsGeneric -or [string]::IsNullOrWhiteSpace($ContactName)) {
        $GenericOptions = @(
            "Good morning,",
            "Hello,",
            "Greetings,",
            "I hope this message finds you well,",
            "I hope your week is going well,"
        )
        $DayOfWeek = (Get-Date).DayOfWeek.value__
        return $GenericOptions[$DayOfWeek % $GenericOptions.Count]
    } else {
        return "Hi $ContactName,"
    }
}

# Function to personalize email template
function Get-PersonalizedEmail {
    param(
        [string]$Template,
        [hashtable]$Shop
    )
    
    $SafeContactName = Sanitize-Text -Text $Shop.ContactName
    $SafeShopName = Sanitize-Text -Text $Shop.ShopName
    $SafeCapabilities = Sanitize-Text -Text $Shop.Capabilities
    $SafeLocation = Sanitize-Text -Text $Shop.Location
    
    $Greeting = Get-Greeting -ContactName $SafeContactName
    
    $Email = $Template
    $Email = $Email.Replace("{{GREETING}}", $Greeting)
    $Email = $Email.Replace("{{CONTACT_NAME}}", $SafeContactName)
    $Email = $Email.Replace("{{SHOP_NAME}}", $SafeShopName)
    $Email = $Email.Replace("{{CAPABILITY_OR_SPECIALTY}}", $SafeCapabilities)
    $Email = $Email.Replace("{{LOCATION_OR_REGION}}", $SafeLocation)
    $Email = $Email.Replace("{{SPECIFIC_CAPABILITY}}", $SafeCapabilities)
    
    return $Email
}

# Track pending CSV updates in memory (batch write once at end)
$Script:PendingUpdates = [System.Collections.Generic.List[hashtable]]::new()

# Function to queue CSV update (batched, written once at end)
function Queue-ShopStatusUpdate {
    param(
        [string]$ShopName,
        [string]$Email,
        [string]$Status,
        [string]$DateContacted,
        [string]$OutreachStatus = "",
        [string]$LastOutboundDate = ""
    )
    
    $Script:PendingUpdates.Add(@{
        ShopName = $ShopName
        Email = $Email
        Status = $Status
        DateContacted = $DateContacted
        OutreachStatus = $OutreachStatus
        LastOutboundDate = $LastOutboundDate
    })
    Write-Host "Queued update for $ShopName ($Email): $Status / $OutreachStatus"
}

# Function to apply all pending updates to CSV (called once at end)
function Apply-AllUpdates {
    param([string]$Path)
    
    if ($Script:PendingUpdates.Count -eq 0) {
        Write-Host "No updates to apply"
        return
    }
    
    try {
        $Shops = Import-Csv -Path $Path
        $UpdateCount = 0
        
        foreach ($Update in $Script:PendingUpdates) {
            foreach ($Shop in $Shops) {
                if ($Shop.name -eq $Update.ShopName -and $Shop.email -eq $Update.Email) {
                    $Shop.Status = $Update.Status
                    $Shop.'Date Contacted' = $Update.DateContacted
                    if ($Update.OutreachStatus) {
                        $Shop.'Outreach Status' = $Update.OutreachStatus
                    }
                    if ($Update.LastOutboundDate) {
                        $Shop.'Last Outbound Date' = $Update.LastOutboundDate
                    }
                    $UpdateCount++
                    break
                }
            }
        }
        
        # Single write for all updates
        $Shops | Export-Csv -Path $Path -NoTypeInformation
        Write-Host "Applied $UpdateCount updates to CSV in single write operation"
        
        # Clear pending updates
        $Script:PendingUpdates.Clear()
    } catch {
        Write-Warning "Failed to apply updates: $_"
    }
}

# Function to check if email was sent by looking in Sent folder
function Test-EmailSent {
    param(
        $Namespace,
        [string]$RecipientEmail,
        [string]$SubjectPattern = "Partnership Opportunity"
    )
    
    try {
        $SentFolder = $Namespace.Folders("Admin@vectarr.com").Folders("Sent Items")
        
        # Use Outlook Restrict filter instead of scanning all items (more efficient)
        $Filter = "[Subject] LIKE '%$SubjectPattern%' AND [To] = '$RecipientEmail'"
        $Items = $SentFolder.Items.Restrict($Filter)
        
        if ($Items.Count -gt 0) {
            return $Items[1].SentOn
        }
        return $null
    } catch {
        Write-Warning "Failed to check Sent folder: $_"
        return $null
    }
}

# ============ MAIN EXECUTION ============

Write-Host "=== Machine Shop Outreach with Integrated Web Discovery ==="
Write-Host "Target shops to contact: $MaxShops"
Write-Host "Minimum threshold before web search: $MinShopsThreshold"

# Check if CSV exists
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

# Count uncontacted shops first
$UncontactedCount = Get-UncontactedShopCount -Path $CsvPath
Write-Host "`nUncontacted shops in database: $UncontactedCount"

# If below threshold, trigger web discovery
if ($UncontactedCount -lt $MinShopsThreshold -and -not $SkipWebSearch) {
    Write-Host "`nDatabase below threshold ($UncontactedCount < $MinShopsThreshold)"
    Write-Host "Triggering automatic web search discovery..."
    
    $DiscoveryResult = Invoke-WebDiscovery -TargetCount ($MaxShops * 2) -OutputDir $DataPath
    
    Write-Host "`n=== Web Discovery Initiated ==="
    Write-Host "A sub-agent will need to process the discovery request."
    Write-Host "Request file: $($DiscoveryResult.RequestFile)"
}

# Check for previously discovered shops
$DiscoveredShops = Get-DiscoveredShops -DataDir $DataPath -MaxShops $MaxShops
if ($DiscoveredShops.Count -gt 0) {
    Write-Host "`nFound $($DiscoveredShops.Count) previously discovered shops"
    $Added = Add-ShopsToCsv -CsvPath $CsvPath -NewShops $DiscoveredShops
    Write-Host "Added $Added new shops to database"
}

# Load machine shops from database
$Shops = Get-MachineShops -Path $CsvPath -Max $MaxShops -SearchAll

if ($Shops.Count -eq 0) {
    Write-Host "`nNo uncontacted machine shops available."
    Write-Host "Web discovery has been queued. New shops will be available after sub-agent processing."
    
    # Create status file for reporting
    $StatusFile = "$DataPath\outreach_status_$(Get-Date -Format 'yyyyMMdd').json"
    @{
        Date = Get-Date -Format "yyyy-MM-dd"
        ShopsContacted = 0
        DatabaseExhausted = $true
        WebDiscoveryQueued = $true
        Message = "Database exhausted - web discovery queued"
    } | ConvertTo-Json | Out-File -FilePath $StatusFile
    
} else {
    Write-Host "`nFound $($Shops.Count) shops to contact"
    
    # Process each shop
    $ContactedCount = 0
    $Today = Get-Date -Format "yyyy-MM-dd"
    
    foreach ($Shop in $Shops) {
        Write-Host "`nProcessing: $($Shop.ShopName)"
        Write-Host "  Contact Name: $($Shop.ContactName)"
        
        if ([string]::IsNullOrWhiteSpace($Shop.Email) -or $Shop.Email -eq "INVALID" -or $Shop.Email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
            Write-Warning "Skipping $($Shop.ShopName) - no valid email address"
            continue
        }
        
        Write-Host "  Email: $($Shop.Email)"
        
        # Check if email was already sent BEFORE creating draft
        $SentDate = Test-EmailSent -Namespace $Namespace -RecipientEmail $Shop.Email
        if ($SentDate) {
            Write-Host "Email already sent to $($Shop.Email) on $SentDate - skipping draft creation"
            Queue-ShopStatusUpdate -ShopName $Shop.ShopName -Email $Shop.Email -Status "Contacted" -DateContacted $Today -OutreachStatus "1st Email Sent" -LastOutboundDate $SentDate.ToString("yyyy-MM-dd")
            continue
        }
        
        $Draft = $Outlook.CreateItem(0)
        
        $Draft.Recipients.Add($Shop.Email) | Out-Null
        $Draft.Recipients.ResolveAll() | Out-Null
        
        $Draft.Subject = "Partnership Opportunity - Vectarr Manufacturing Platform"
        
        $Draft.SendUsingAccount = $AdminAccount
        
        $EmailBody = Get-PersonalizedEmail -Template $TemplateHtml -Shop $Shop
        
        $EmailBody = $EmailBody.Replace("<!-- SIGNATURE START -->", "")
        $EmailBody = $EmailBody.Replace("<!-- SIGNATURE END -->", "")
        
        $Draft.HTMLBody = $EmailBody
        
        try {
            $Draft.Save()
            Write-Host "Draft created for: $($Shop.ShopName)"
            
            $Draft.Move($DraftsFolder) | Out-Null
            Write-Host "Draft moved to Admin@vectarr.com Drafts folder"
            
            Queue-ShopStatusUpdate -ShopName $Shop.ShopName -Email $Shop.Email -Status "Contacted" -DateContacted $Today -OutreachStatus "Draft Created" -LastOutboundDate $Today
            
            $Metadata = @{
                shopName = $Shop.ShopName
                contactName = $Shop.ContactName
                email = $Shop.Email
                dateContacted = $Today
                draftEntryId = $Draft.EntryID
                status = "Draft Created"
            }
            $SafeShopName = ($Shop.ShopName -replace '[^a-zA-Z0-9]', '_') + "_" + ($Shop.Email -replace '[^a-zA-Z0-9]', '_')
            $MetadataPath = "$OutputPath\outreach\${SafeShopName}_$Today.json"
            $Metadata | ConvertTo-Json | Out-File $MetadataPath
            
            $ContactedCount++
        } catch {
            Write-Error "Failed to save draft for $($Shop.ShopName): $_"
            Queue-ShopStatusUpdate -ShopName $Shop.ShopName -Email $Shop.Email -Status "Error" -DateContacted $Today -OutreachStatus "Need Manual Intervention"
        }
    }
    
    Write-Host "`n=== Outreach Complete ==="
    Write-Host "Drafts created: $ContactedCount"
    Write-Host "Location: Admin@vectarr.com Drafts folder"
    
    # Create status file
    $StatusFile = "$DataPath\outreach_status_$(Get-Date -Format 'yyyyMMdd').json"
    @{
        Date = Get-Date -Format "yyyy-MM-dd"
        ShopsContacted = $ContactedCount
        DatabaseExhausted = ($UncontactedCount - $ContactedCount) -lt $MinShopsThreshold
        WebDiscoveryQueued = ($UncontactedCount -lt $MinShopsThreshold)
        RemainingShops = $UncontactedCount - $ContactedCount
    } | ConvertTo-Json | Out-File -FilePath $StatusFile
    
    # Apply all pending CSV updates in a single write operation
    Apply-AllUpdates -Path $CsvPath
}

# Cleanup
try {
    if ($DraftsFolder) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($DraftsFolder) }
    if ($AdminFolder) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($AdminFolder) }
    if ($Namespace) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($Namespace) }
    if ($Outlook) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($Outlook) }
} catch {}
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "`nScript completed."
