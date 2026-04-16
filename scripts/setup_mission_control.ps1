# Mission Control Board Setup - Local Configuration Script
# Run this on the machine hosting Mission Control at 10.0.1.90:3000
# This script creates the board structure via API calls

$MissionControlUrl = "http://10.0.1.90:3000"
$BoardName = "Vectarr Operations"

# Board Configuration
$Boards = @{
    "Machine Shop Outreach Pipeline" = @{
        Columns = @(
            @{ Name = "Prospects"; Order = 1; Description = "Machine shops from spreadsheet not yet contacted" },
            @{ Name = "Contacted"; Order = 2; Description = "Initial outreach email sent" },
            @{ Name = "Responded"; Order = 3; Description = "Shop has replied, awaiting follow-up" },
            @{ Name = "In Discussion"; Order = 4; Description = "Active conversation, qualification ongoing" },
            @{ Name = "Onboarding"; Order = 5; Description = "Agreement signed, integration in progress" },
            @{ Name = "Active"; Order = 6; Description = "Shop live on platform, receiving quotes" },
            @{ Name = "Paused"; Order = 7; Description = "Temporarily inactive" },
            @{ Name = "Declined"; Order = 8; Description = "Opted not to join" }
        )
        Fields = @(
            @{ Name = "Shop Name"; Type = "text"; Required = $true },
            @{ Name = "Location"; Type = "text"; Required = $false },
            @{ Name = "Contact Person"; Type = "text"; Required = $true },
            @{ Name = "Email"; Type = "email"; Required = $true },
            @{ Name = "Phone"; Type = "text"; Required = $false },
            @{ Name = "Capabilities"; Type = "multiselect"; Options = @("CNC Milling", "CNC Turning", "3D Printing", "Sheet Metal", "Welding", "Grinding", "EDM", "Prototype", "Production"); Required = $false },
            @{ Name = "Website"; Type = "url"; Required = $false },
            @{ Name = "Date First Contacted"; Type = "date"; Required = $false },
            @{ Name = "Last Activity Date"; Type = "date"; Required = $false },
            @{ Name = "Status"; Type = "dropdown"; Options = @("Not Contacted", "Contacted", "Responded", "In Discussion", "Onboarding", "Active", "Paused", "Declined"); Required = $true },
            @{ Name = "Notes"; Type = "textarea"; Required = $false },
            @{ Name = "Next Action"; Type = "text"; Required = $false }
        )
    }
    
    "Customer Project Tracking" = @{
        Columns = @(
            @{ Name = "New Inquiries"; Order = 1; Description = "Fresh quote requests" },
            @{ Name = "Quoted"; Order = 2; Description = "Quotes submitted, awaiting decision" },
            @{ Name = "In Production"; Order = 3; Description = "Orders awarded and in manufacturing" },
            @{ Name = "Completed"; Order = 4; Description = "Delivered and paid" },
            @{ Name = "Review Pending"; Order = 5; Description = "Awaiting customer feedback/review" },
            @{ Name = "Issues"; Order = 6; Description = "Disputes or problems requiring attention" }
        )
        Fields = @(
            @{ Name = "Company Name"; Type = "text"; Required = $true },
            @{ Name = "Contact Person"; Type = "text"; Required = $true },
            @{ Name = "Project Description"; Type = "textarea"; Required = $true },
            @{ Name = "CAD File Type"; Type = "text"; Required = $false },
            @{ Name = "Material Requirements"; Type = "text"; Required = $false },
            @{ Name = "Quantity"; Type = "number"; Required = $false },
            @{ Name = "Quote Amount"; Type = "currency"; Required = $false },
            @{ Name = "Awarded Shop"; Type = "text"; Required = $false },
            @{ Name = "Timeline"; Type = "text"; Required = $false },
            @{ Name = "Status"; Type = "dropdown"; Options = @("New", "Quoted", "In Production", "Completed", "Review Pending", "Issue"); Required = $true }
        )
    }
    
    "Content Calendar" = @{
        Columns = @(
            @{ Name = "Ideas"; Order = 1; Description = "DFM blog post concepts" },
            @{ Name = "In Progress"; Order = 2; Description = "Drafting content" },
            @{ Name = "Review"; Order = 3; Description = "Pending approval" },
            @{ Name = "Scheduled"; Order = 4; Description = "Ready to publish" },
            @{ Name = "Published"; Order = 5; Description = "Live content" },
            @{ Name = "Promoted"; Order = 6; Description = "Shared on social channels" }
        )
        Fields = @(
            @{ Name = "Title"; Type = "text"; Required = $true },
            @{ Name = "Content Type"; Type = "dropdown"; Options = @("Blog Post", "Video", "Social Media", "Email Newsletter", "Case Study", "Whitepaper"); Required = $true },
            @{ Name = "Author"; Type = "text"; Required = $false },
            @{ Name = "Due Date"; Type = "date"; Required = $false },
            @{ Name = "Publish Date"; Type = "date"; Required = $false },
            @{ Name = "Keywords"; Type = "text"; Required = $false },
            @{ Name = "Status"; Type = "dropdown"; Options = @("Ideas", "In Progress", "Review", "Scheduled", "Published", "Promoted"); Required = $true },
            @{ Name = "Notes"; Type = "textarea"; Required = $false }
        )
    }
}

Write-Host "Mission Control Board Setup Script"
Write-Host "=================================="
Write-Host ""
Write-Host "This script will create the following boards at $MissionControlUrl :"
Write-Host ""

foreach ($BoardName in $Boards.Keys) {
    $Board = $Boards[$BoardName]
    Write-Host "Board: $BoardName"
    Write-Host "  Columns: $($Board.Columns.Count)"
    Write-Host "  Fields: $($Board.Fields.Count)"
    Write-Host ""
}

Write-Host ""
Write-Host "To complete setup:"
Write-Host "1. Ensure Mission Control is running at $MissionControlUrl"
Write-Host "2. Run this script on the server hosting Mission Control"
Write-Host "3. Or manually create boards using the configuration above"
Write-Host ""

# Export configuration to JSON for manual import
$ConfigPath = "C:\Users\admin\.openclaw\workspace\mission_control_config.json"
$Boards | ConvertTo-Json -Depth 10 | Out-File $ConfigPath
Write-Host "Configuration exported to: $ConfigPath"

# Display manual setup instructions
Write-Host ""
Write-Host "MANUAL SETUP INSTRUCTIONS:"
Write-Host "=========================="
Write-Host ""

foreach ($BoardName in $Boards.Keys) {
    $Board = $Boards[$BoardName]
    Write-Host "Board: $BoardName"
    Write-Host "---"
    Write-Host "Columns (create in this order):"
    foreach ($Column in $Board.Columns | Sort-Object Order) {
        Write-Host "  $($Column.Order). $($Column.Name) - $($Column.Description)"
    }
    Write-Host ""
    Write-Host "Card Fields:"
    foreach ($Field in $Board.Fields) {
        $RequiredText = if ($Field.Required) { " (Required)" } else { "" }
        Write-Host "  - $($Field.Name) [$($Field.Type)]$RequiredText"
    }
    Write-Host ""
    Write-Host ""
}

Write-Host "Access Control:"
Write-Host "  - Full Access: alex1v1a, admin accounts"
Write-Host "  - Read Only: Sales, Support aliases"
Write-Host ""

