# Machine Shop Discovery and Outreach - Production Version
# Finds new machine shops via web search discovery and creates email drafts
# Targets North America (USA, Canada, Mexico)

param(
    [int]$DailyNewShops = 5,
    [int]$MaxDraftsPerRun = 5,
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [string]$OutputPath = "$PSScriptRoot\..\email_data",
    [switch]$SkipDiscovery
)

# North American regions to target for discovery
$TargetRegions = @(
    "Texas", "California", "Arizona", "Nevada", "Colorado", "Utah", "New Mexico",
    "Oklahoma", "Kansas", "Nebraska", "Iowa", "Missouri", "Arkansas", "Louisiana",
    "Illinois", "Indiana", "Ohio", "Michigan", "Wisconsin", "Minnesota",
    "Florida", "Georgia", "Alabama", "Tennessee", "Kentucky", "North Carolina",
    "South Carolina", "Virginia", "West Virginia", "Pennsylvania", "New York",
    "New Jersey", "Maryland", "Delaware", "Connecticut", "Rhode Island",
    "Massachusetts", "Vermont", "New Hampshire", "Maine",
    "Washington", "Oregon", "Idaho", "Montana", "Wyoming", "North Dakota", "South Dakota",
    "Alaska", "Hawaii",
    "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan",
    "Nova Scotia", "New Brunswick", "Newfoundland", "Prince Edward Island",
    "Baja California", "Chihuahua", "Coahuila", "Nuevo Leon", "Tamaulipas", "Sonora"
)

# Generic email prefixes to avoid
$GenericPrefixes = @('hello', 'support', 'rfq', 'sales', 'info', 'contact', 'admin', 'help', 'service', 'inquiry', 'quote', 'quotes', 'office', 'team', 'mail', 'email')

Write-Host "=== Machine Shop Daily Outreach - North America ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "Daily new shops target: $DailyNewShops"
Write-Host "Max drafts per run: $MaxDraftsPerRun"
Write-Host "CSV Path: $CsvPath"
Write-Host ""

# Ensure output directory exists
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\outreach"
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\data"

# STEP 1: Check for discovered shops from web search
$NewShopsFound = @()
$Today = Get-Date -Format 'yyyyMMdd'
$ManualShopsFile = "$PSScriptRoot\..\data\new_shops_$Today.json"

Write-Host "=== STEP 1: Loading Discovered Shops ===" -ForegroundColor Green

if (Test-Path $ManualShopsFile) {
    Write-Host "Loading shops from discovery file: $ManualShopsFile"
    try {
        $NewShopsFound = Get-Content $ManualShopsFile | ConvertFrom-Json
        Write-Host "Found $($NewShopsFound.Count) shops in discovery file" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to parse discovery file: $_"
        $NewShopsFound = @()
    }
} else {
    Write-Host "No discovery file found at: $ManualShopsFile" -ForegroundColor Yellow
    Write-Host "The sub-agent should create this file via web search discovery." -ForegroundColor Gray
}

# STEP 2: Add new shops to CSV
$AddedCount = 0
$DuplicateCount = 0
$OriginalCount = 0

if ($NewShopsFound.Count -gt 0) {
    Write-Host "`n=== STEP 2: Adding New Shops to CSV ===" -ForegroundColor Green
    
    try {
        $ExistingShops = Import-Csv $CsvPath
        $OriginalCount = $ExistingShops.Count
        
        # Get all column names from existing CSV
        $ColumnNames = $ExistingShops[0].PSObject.Properties.Name
        
        foreach ($NewShop in $NewShopsFound | Select-Object -First $DailyNewShops) {
            # Validate shop has required fields
            if ([string]::IsNullOrWhiteSpace($NewShop.name)) {
                Write-Warning "Skipping shop with no name"
                continue
            }
            
            # Check for duplicates (by name or email)
            $Duplicate = $ExistingShops | Where-Object { 
                $_.name -eq $NewShop.name -or 
                ($_.email -and $NewShop.email -and $_.email -eq $NewShop.email) 
            }
            
            if (-not $Duplicate) {
                # Create new row with all columns
                $NewRow = @{}
                foreach ($Column in $ColumnNames) {
                    # Map incoming data to CSV columns
                    $Value = switch ($Column) {
                        "name" { $NewShop.name }
                        "city" { $NewShop.city }
                        "state" { $NewShop.state }
                        "email" { $NewShop.email }
                        "phone" { $NewShop.phone }
                        "subtypes" { $NewShop.subtypes }
                        "site" { $NewShop.site }
                        "full_name" { $NewShop.full_name }
                        "first_name" { $NewShop.first_name }
                        "last_name" { $NewShop.last_name }
                        "Status" { "Not Contacted" }
                        "Date Contacted" { "" }
                        "Outreach Status" { "" }
                        "Last Outbound Date" { "" }
                        default { "" }
                    }
                    $NewRow[$Column] = $Value
                }
                
                $ExistingShops += [PSCustomObject]$NewRow
                $AddedCount++
                Write-Host "  + Added: $($NewShop.name)" -ForegroundColor Green
            } else {
                $DuplicateCount++
                Write-Host "  - Duplicate: $($NewShop.name)" -ForegroundColor Yellow
            }
        }
        
        # Save updated CSV
        $ExistingShops | Export-Csv -Path $CsvPath -NoTypeInformation
        Write-Host "`nCSV updated: $OriginalCount → $($ExistingShops.Count) shops" -ForegroundColor Green
        Write-Host "Added: $AddedCount | Duplicates skipped: $DuplicateCount"
    } catch {
        Write-Error "Failed to update CSV: $_"
    }
} else {
    Write-Host "No new shops to add." -ForegroundColor Yellow
}

# STEP 3: Create email drafts
Write-Host "`n=== STEP 3: Creating Email Drafts ===" -ForegroundColor Green

$OutreachScript = "$PSScriptRoot\machine_shop_outreach_fixed.ps1"
$DraftsCreated = 0
$ShopsSkipped = 0

if (Test-Path $OutreachScript) {
    try {
        # Use -SearchAll to ensure we scan entire CSV for shops with emails
        $Results = & $OutreachScript -MaxShops $MaxDraftsPerRun -SearchAll 2>&1
        $Results | ForEach-Object { Write-Host $_ }
        
        $DraftsCreated = ($Results | Select-String "Draft created for:").Count
        $ShopsSkipped = ($Results | Select-String "WARNING: Skipping").Count
    } catch {
        Write-Error "Outreach script failed: $_"
    }
} else {
    Write-Error "Outreach script not found: $OutreachScript"
}

# Summary
Write-Host "`n=== Daily Outreach Summary ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd')"
Write-Host "New shops discovered: $($NewShopsFound.Count)"
Write-Host "New shops added to CSV: $AddedCount"
Write-Host "Drafts created: $DraftsCreated"
Write-Host "Shops skipped (no email): $ShopsSkipped"
Write-Host "Next run: Tomorrow at 5:00 AM"
Write-Host ""

# Export summary for notification
$Summary = @{
    date = Get-Date -Format 'yyyy-MM-dd'
    discovered = $NewShopsFound.Count
    added = $AddedCount
    duplicates = $DuplicateCount
    draftsCreated = $DraftsCreated
    shopsSkipped = $ShopsSkipped
    csvTotal = $OriginalCount + $AddedCount
} | ConvertTo-Json

$SummaryPath = "$OutputPath\outreach\summary_$Today.json"
$Summary | Out-File $SummaryPath

Write-Host "Summary saved to: $SummaryPath"

# Return summary for parent process
return $Summary
