#Requires -Version 5.1
<#
.SYNOPSIS
    Machine Shop Outreach Script for Vectarr
.DESCRIPTION
    Creates personalized outreach emails for machine shops and saves them as drafts
    in the admin@vectarr.com Outlook folder. Uses Jordan Mitchell persona.
#>

param(
    [int]$MaxShops = 5,
    [string]$TemplatePath = "$PSScriptRoot\..\templates\outreach\machine_shop_outreach_template.html",
    [string]$MachineShopsPath = "C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Marketing Research\Outreach\Machine Shops.xlsx",
    [string]$OutputPath = "$PSScriptRoot\..\email_data"
)

# Ensure output directory exists
$null = New-Item -ItemType Directory -Force -Path "$OutputPath\outreach"

# Initialize Outlook
$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace("MAPI")

# Get Admin@vectarr.com account and Drafts folder (note the capital A)
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

# Jordan Mitchell signature (Accounts Department)
$SignatureHtml = @"
<table cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.4; background: transparent;">
    <tr>
        <td style="padding-right: 15px; vertical-align: top;">
            <img src="https://i.imgur.com/DurPqy1.png" alt="Vectarr" width="70" style="display: block;" />
        </td>
        <td style="border-left: 2px solid #888888; padding-left: 15px; vertical-align: top;">
            <div style="font-size: 18px; font-weight: bold; color: #000000;">Jordan Mitchell</div>
            <div style="font-size: 13px; color: #888888; margin-bottom: 8px;">Accounts Department</div>
            <div style="border-top: 1px solid #888888; margin: 8px 0;"></div>
            <div style="font-size: 13px; color: #000000;">+1 (650) 427-9450</div>
            <div style="font-size: 13px; color: #000000;">5900 Balcones Drive, Suite 100</div>
            <div style="font-size: 13px; color: #000000;">Austin, TX 78731</div>
            <div style="font-size: 13px; margin-top: 5px;">
                <a href="https://vectarr.com" style="color: #0066cc; text-decoration: none;">vectarr.com</a>
            </div>
        </td>
    </tr>
</table>
"@

# Function to load machine shops from Excel
function Get-MachineShops {
    param([string]$ExcelPath)
    
    try {
        $Excel = New-Object -ComObject Excel.Application
        $Excel.Visible = $false
        $Workbook = $Excel.Workbooks.Open($ExcelPath)
        $Worksheet = $Workbook.Sheets(1)
        
        # Get data range
        $UsedRange = $Worksheet.UsedRange
        $RowCount = $UsedRange.Rows.Count
        $ColCount = $UsedRange.Columns.Count
        
        # Read headers from first row
        $Headers = @()
        for ($col = 1; $col -le $ColCount; $col++) {
            $Headers += $Worksheet.Cells(1, $col).Text
        }
        
        # Find Status column (should be far left - column A)
        $StatusCol = $Headers.IndexOf("Status") + 1
        if ($StatusCol -eq 0) { $StatusCol = $Headers.IndexOf("Contacted") + 1 }
        
        # Read shop data
        $Shops = @()
        for ($row = 2; $row -le $RowCount; $row++) {
            $Status = if ($StatusCol -gt 0 -and $StatusCol -le $ColCount) { $Worksheet.Cells($row, $StatusCol).Text } else { "" }
            
            # Only get shops that haven't been contacted
            if ([string]::IsNullOrWhiteSpace($Status) -or $Status -eq "Not Contacted" -or $Status -eq "") {
                # Adjust column indices if Status column was inserted at beginning
                $Offset = if ($StatusCol -eq 1) { 2 } else { 0 }
                $Shop = @{
                    Row = $row
                    ShopName = $Worksheet.Cells($row, 1 + $Offset).Text
                    Location = $Worksheet.Cells($row, 2 + $Offset).Text
                    ContactName = $Worksheet.Cells($row, 3 + $Offset).Text
                    Email = $Worksheet.Cells($row, 4 + $Offset).Text
                    Phone = $Worksheet.Cells($row, 5 + $Offset).Text
                    Capabilities = $Worksheet.Cells($row, 6 + $Offset).Text
                    Website = $Worksheet.Cells($row, 7 + $Offset).Text
                    Notes = $Worksheet.Cells($row, 8 + $Offset).Text
                }
                $Shops += $Shop
            }
            
            if ($Shops.Count -ge $MaxShops) { break }
        }
        
        $Workbook.Close($false)
        $Excel.Quit()
        
        return $Shops
    } catch {
        Write-Error "Failed to load machine shops from Excel: $_"
        return @()
    }
}

# Function to personalize email template
function Get-PersonalizedEmail {
    param(
        [string]$Template,
        [hashtable]$Shop
    )
    
    $Email = $Template
    $Email = $Email.Replace("{{CONTACT_NAME}}", $Shop.ContactName)
    $Email = $Email.Replace("{{SHOP_NAME}}", $Shop.ShopName)
    $Email = $Email.Replace("{{CAPABILITY_OR_SPECIALTY}}", $Shop.Capabilities)
    $Email = $Email.Replace("{{LOCATION_OR_REGION}}", $Shop.Location)
    $Email = $Email.Replace("{{SPECIFIC_CAPABILITY}}", $Shop.Capabilities)
    
    return $Email
}

# Function to update Excel with contact status
function Update-ShopStatus {
    param(
        [string]$ExcelPath,
        [int]$Row,
        [string]$Status,
        [string]$DateContacted
    )
    
    try {
        $Excel = New-Object -ComObject Excel.Application
        $Excel.Visible = $false
        $Excel.DisplayAlerts = $false
        $Workbook = $Excel.Workbooks.Open($ExcelPath)
        $Worksheet = $Workbook.Sheets(1)
        
        # Find or create Status column (far left - column A)
        $UsedRange = $Worksheet.UsedRange
        $ColCount = $UsedRange.Columns.Count
        $Headers = @()
        for ($col = 1; $col -le $ColCount; $col++) {
            $Headers += $Worksheet.Cells(1, $col).Text
        }
        
        # Check if we need to insert columns at the beginning
        $StatusCol = $Headers.IndexOf("Status") + 1
        $DateCol = $Headers.IndexOf("Date Contacted") + 1
        
        if ($StatusCol -eq 0 -and $DateCol -eq 0) {
            # Insert two new columns at the beginning
            $Worksheet.Columns(1).Insert() | Out-Null
            $Worksheet.Columns(1).Insert() | Out-Null
            $StatusCol = 1
            $DateCol = 2
            $Worksheet.Cells(1, $StatusCol) = "Status"
            $Worksheet.Cells(1, $DateCol) = "Date Contacted"
        } elseif ($StatusCol -eq 0) {
            $StatusCol = $ColCount + 1
            $Worksheet.Cells(1, $StatusCol) = "Status"
        } elseif ($DateCol -eq 0) {
            $DateCol = $ColCount + 1
            $Worksheet.Cells(1, $DateCol) = "Date Contacted"
        }
        
        # Update status and date
        $Worksheet.Cells($Row, $StatusCol) = $Status
        $Worksheet.Cells($Row, $DateCol) = $DateContacted
        
        # Highlight the entire row in yellow
        $YellowColor = 65535  # Excel color code for yellow
        $Range = $Worksheet.Range("A$Row`:Z$Row")
        $Range.Interior.Color = $YellowColor
        
        $Workbook.Save()
        $Workbook.Close($false)
        $Excel.Quit()
        
        Write-Host "Updated Excel row $Row with status: $Status (highlighted in yellow)"
    } catch {
        Write-Warning "Failed to update Excel: $_"
    }
}

# Main execution
Write-Host "Starting machine shop outreach..."
Write-Host "Maximum shops to contact today: $MaxShops"

# Load machine shops
$Shops = Get-MachineShops -ExcelPath $MachineShopsPath

if ($Shops.Count -eq 0) {
    Write-Host "No machine shops found to contact."
    exit 0
}

Write-Host "Found $($Shops.Count) shops to contact"

# Process each shop
$ContactedCount = 0
$Today = Get-Date -Format "yyyy-MM-dd"

foreach ($Shop in $Shops) {
    Write-Host "Processing: $($Shop.ShopName) - $($Shop.ContactName)"
    
    # Create email draft
    $Draft = $Outlook.CreateItem(0)  # 0 = olMailItem
    
    # Set recipient
    $Draft.Recipients.Add($Shop.Email) | Out-Null
    $Draft.Recipients.ResolveAll() | Out-Null
    
    # Set subject
    $Draft.Subject = "Partnership Opportunity - Vectarr Manufacturing Platform"
    
    # Set sending account
    $Draft.SendUsingAccount = $AdminAccount
    
    # Personalize template
    $EmailBody = Get-PersonalizedEmail -Template $TemplateHtml -Shop $Shop
    
    # Replace signature placeholder with actual signature
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE START -->", $SignatureHtml)
    $EmailBody = $EmailBody.Replace("<!-- SIGNATURE END -->", "")
    
    $Draft.HTMLBody = $EmailBody
    
    # Save draft and move to admin@vectarr.com Drafts folder
    try {
        $Draft.Save()
        Write-Host "Draft created for: $($Shop.ShopName)"
        
        # Move to admin@vectarr.com Drafts folder
        $Draft.Move($DraftsFolder) | Out-Null
        Write-Host "Draft moved to admin@vectarr.com Drafts folder for: $($Shop.ShopName)"
        
        # Update Excel
        Update-ShopStatus -ExcelPath $MachineShopsPath -Row $Shop.Row -Status "Contacted" -DateContacted $Today
        
        # Save metadata
        $Metadata = @{
            shopName = $Shop.ShopName
            contactName = $Shop.ContactName
            email = $Shop.Email
            dateContacted = $Today
            draftEntryId = $Draft.EntryID
            status = "Draft Created"
        }
        $MetadataPath = "$OutputPath\outreach\$($Shop.ShopName -replace '[^a-zA-Z0-9]', '_')_$Today.json"
        $Metadata | ConvertTo-Json | Out-File $MetadataPath
        
        $ContactedCount++
    } catch {
        Write-Error "Failed to save draft for $($Shop.ShopName): $_"
    }
}

Write-Host "Outreach complete. Created $ContactedCount draft emails in admin@vectarr.com Drafts folder."

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Outlook) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
