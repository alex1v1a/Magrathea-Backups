$Outlook = New-Object -ComObject Outlook.Application
$Namespace = $Outlook.GetNamespace('MAPI')
$AdminFolder = $Namespace.Folders('Admin@vectarr.com')
$DraftsFolder = $AdminFolder.Folders('Drafts')

# Load template
$TemplatePath = 'C:\Users\admin\.openclaw\workspace\templates\outreach\machine_shop_outreach_template.html'
$TemplateHtml = Get-Content $TemplatePath -Raw

# New shops to create drafts for
$created = 0

# Shop 1: FTC Industries
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'rick.flores@ftcindustries.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: FTC Industries - rick.flores@ftcindustries.com"

# Shop 2: NJC Machine Co.
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'contactus@njcmachine.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: NJC Machine Co. - contactus@njcmachine.com"

# Shop 3: Marathon Precision
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'sales@marathonprecision.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: Marathon Precision - sales@marathonprecision.com"

# Shop 4: Wagner Machine Co.
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'info@wagner-machine.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: Wagner Machine Co. - info@wagner-machine.com"

# Shop 5: CCI Companies
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'sales@cci-companies.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: CCI Companies - sales@cci-companies.com"

# Shop 6: Centennial Machining
$Mail = $Outlook.CreateItem(0)
$Mail.To = 'contact@centennialmachining.com'
$Mail.Subject = 'Precision CNC Parts - Instant Quotes at Vectarr'
$Mail.HTMLBody = $TemplateHtml
$Mail.SendUsingAccount = $AdminFolder
$Mail.Save()
$created++
Write-Host "Draft created for: Centennial Machining - contact@centennialmachining.com"

Write-Host "Created $created additional drafts"
