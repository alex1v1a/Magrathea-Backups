# Machine Shop Web Discovery - Sub-Agent Version
# Spawns a sub-agent to perform web searches for CNC machine shops
# Much more effective than CLI web-search
# Updated: 2026-04-06

param(
    [int]$TargetCount = 20,
    [string]$OutputDir = "$PSScriptRoot\..\data",
    [string]$CsvPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.csv",
    [int]$MaxRegions = 15
)

# Ensure output directory exists
$null = New-Item -ItemType Directory -Force -Path $OutputDir

$DateStr = Get-Date -Format "yyyy-MM-dd"
$OutputFile = "$OutputDir\new_shops_${DateStr}.json"
$RequestFile = "$OutputDir\discovery_request_${DateStr}.json"

# Expanded search regions organized by geography
$AllRegions = @(
    # Texas (Primary)
    "Texas CNC machine shops",
    "Houston Texas machining",
    "Dallas Fort Worth CNC machine shop",
    "Austin Texas precision machining",
    "San Antonio machine shop",
    "El Paso manufacturing CNC",
    # Southwest
    "Arizona CNC machine shops Phoenix Tucson",
    "New Mexico machine shops Albuquerque",
    "Colorado precision machining Denver",
    # West Coast
    "California CNC machine shops Los Angeles",
    "California machining San Diego Bay Area",
    "Oregon machine shops Portland Eugene",
    "Washington CNC machining Seattle Spokane",
    # Midwest
    "Illinois CNC machine shops Chicago",
    "Ohio machine shops Cleveland Cincinnati",
    "Michigan precision machining Detroit Grand Rapids",
    "Indiana CNC machining Indianapolis Fort Wayne",
    "Wisconsin machine shops Milwaukee Madison",
    "Minnesota manufacturing Minneapolis St Paul",
    "Missouri machine shops Kansas City St Louis",
    # Southeast
    "Florida CNC machine shops Miami Orlando Tampa",
    "Georgia machine shops Atlanta Savannah",
    "North Carolina machining Charlotte Raleigh",
    "Tennessee manufacturing Nashville Memphis",
    "Alabama machine shops Birmingham Huntsville",
    # Northeast
    "Pennsylvania CNC machining Pittsburgh Philadelphia",
    "New York machine shops Buffalo Rochester",
    "Massachusetts manufacturing Boston",
    # Other regions
    "Oklahoma CNC machine shops Tulsa",
    "Louisiana CNC machining New Orleans",
    "Nevada machine shops Las Vegas Reno",
    "Utah manufacturing Salt Lake City"
)

Write-Host "=== Machine Shop Web Discovery (Sub-Agent Version) ==="
Write-Host "Target: Find $TargetCount new shops"
Write-Host "Max regions to search: $MaxRegions"
Write-Host ""

# Load existing shops to avoid duplicates
try {
    $ExistingShops = Import-Csv -Path $CsvPath
    $ExistingEmails = $ExistingShops | ForEach-Object { $_.email.ToLower().Trim() } | Where-Object { $_ }
    Write-Host "Loaded existing database: $($ExistingShops.Count) shops"
    Write-Host "Existing emails: $($ExistingEmails.Count)"
} catch {
    Write-Warning "Could not load existing CSV: $_"
    $ExistingEmails = @()
}

# Shuffle and select regions
$ShuffledRegions = $AllRegions | Sort-Object { Get-Random }
$SelectedRegions = $ShuffledRegions | Select-Object -First $MaxRegions

Write-Host "Selected regions for search:"
$SelectedRegions | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

# Create discovery request for sub-agent
$DiscoveryRequest = @{
    Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    TargetCount = $TargetCount
    Regions = $SelectedRegions
    ExistingEmails = $ExistingEmails
    Status = "Pending Sub-Agent Processing"
}

$DiscoveryRequest | ConvertTo-Json -Depth 3 | Out-File -FilePath $RequestFile -Encoding UTF8

Write-Host "=== Discovery Request Created ==="
Write-Host "Request file: $RequestFile"
Write-Host "Regions queued: $($SelectedRegions.Count)"
Write-Host ""
Write-Host "To complete discovery, a sub-agent must be spawned with this task:"
Write-Host ""
Write-Host "Task: Search for CNC machine shops in the following regions:"
$SelectedRegions | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
Write-Host "For each shop found, extract:"
Write-Host "  - Shop name"
Write-Host "  - Location (city, state)"
Write-Host "  - Email address (required)"
Write-Host "  - Website URL"
Write-Host "  - Contact person name if available"
Write-Host ""
Write-Host "Skip any shops with these existing emails:"
$ExistingEmails | Select-Object -First 20 | ForEach-Object { Write-Host "  - $_" }
if ($ExistingEmails.Count -gt 20) {
    Write-Host "  ... and $($ExistingEmails.Count - 20) more"
}
Write-Host ""
Write-Host "Save results to: $OutputFile"
Write-Host "Target: At least $TargetCount shops with valid emails"

# Save a placeholder result file indicating pending status
$PendingResult = @{
    Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    TargetCount = $TargetCount
    FoundCount = 0
    Status = "Pending"
    Message = "Sub-agent processing required. See request file: $RequestFile"
    Regions = $SelectedRegions
    Shops = @()
}

$PendingResult | ConvertTo-Json -Depth 3 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "Pending result saved to: $OutputFile"
Write-Host ""
Write-Host "Note: This script now creates a request file for sub-agent processing."
Write-Host "The actual web search is performed by spawning a sub-agent via sessions_spawn."

# Return 0 to indicate pending (actual results come from sub-agent)
return 0
