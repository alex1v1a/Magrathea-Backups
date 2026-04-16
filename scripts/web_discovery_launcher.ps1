# Machine Shop Web Discovery - Sub-Agent Launcher
# Spawns a sub-agent to perform web searches for CNC machine shops
# This is the actual discovery script that should be scheduled
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

Write-Host "=== Machine Shop Web Discovery (Sub-Agent Launcher) ==="
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

# Build the task description for the sub-agent
$RegionsList = ($SelectedRegions | ForEach-Object { "- $_" }) -join "`n"
$ExistingList = ($ExistingEmails | Select-Object -First 30 | ForEach-Object { "- $_" }) -join "`n"

$TaskDescription = @"
Search for CNC machine shops in the United States with email addresses on their websites.

Search these regions:
$RegionsList

For each shop found, extract:
- Shop name
- Location (city, state)  
- Email address (required - must be visible on website)
- Website URL
- Contact person name if available

SKIP any shops with these existing emails (already in database):
$ExistingList

Requirements:
- Only include shops with VALID email addresses found on their websites
- Do not include shops with only contact forms
- Verify emails look legitimate (not noreply, info@generic, etc.)
- Prioritize shops with specific contact names when available

Save results to: $OutputFile

Format as JSON with this structure:
{
  "Date": "timestamp",
  "FoundCount": number,
  "Shops": [
    {
      "ShopName": "...",
      "Email": "...",
      "Website": "...",
      "City": "...",
      "State": "...",
      "ContactName": "..."
    }
  ]
}

Target: At least $TargetCount shops with valid emails.
"@

Write-Host "=== Launching Sub-Agent ==="
Write-Host "This will spawn a sub-agent to perform the web search."
Write-Host "Task length: $($TaskDescription.Length) characters"
Write-Host ""

# Create a batch file to spawn the sub-agent via openclaw CLI
$BatchFile = "$OutputDir\spawn_discovery_${DateStr}.bat"
$OpenClawPath = "openclaw"

# Try to find openclaw in common locations
$PossiblePaths = @(
    "openclaw",
    "C:\Program Files\OpenClaw\openclaw.exe",
    "C:\Program Files (x86)\OpenClaw\openclaw.exe",
    "$env:LOCALAPPDATA\openclaw\openclaw.exe",
    "$env:APPDATA\npm\openclaw.cmd"
)

foreach ($Path in $PossiblePaths) {
    if (Get-Command $Path -ErrorAction SilentlyContinue) {
        $OpenClawPath = $Path
        break
    }
}

# Save the task to a file for reference
$TaskFile = "$OutputDir\discovery_task_${DateStr}.txt"
$TaskDescription | Out-File -FilePath $TaskFile -Encoding UTF8

Write-Host "Task saved to: $TaskFile"
Write-Host ""
Write-Host "To complete discovery, run this command:"
Write-Host ""
Write-Host "  openclaw sessions spawn --task `"$TaskFile`" --runtime subagent --mode run"
Write-Host ""
Write-Host "Or manually spawn a sub-agent with the task description."

# Save a placeholder result file indicating pending status
$PendingResult = @{
    Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    TargetCount = $TargetCount
    FoundCount = 0
    Status = "Pending"
    Message = "Sub-agent spawn required. Task file: $TaskFile"
    Regions = $SelectedRegions
    Shops = @()
}

$PendingResult | ConvertTo-Json -Depth 3 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "Pending result saved to: $OutputFile"
Write-Host ""
Write-Host "=== Instructions ==="
Write-Host "1. The task file has been created with the search parameters"
Write-Host "2. Spawn a sub-agent using: openclaw sessions spawn --task `"$TaskFile`" --runtime subagent --mode run"
Write-Host "3. The sub-agent will perform web searches and save results to $OutputFile"
Write-Host "4. Results will be available after the sub-agent completes"

# Return 0 to indicate pending
return 0
