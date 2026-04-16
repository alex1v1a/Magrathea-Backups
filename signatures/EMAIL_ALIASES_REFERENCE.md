# Vectarr Email Aliases - Reference Guide

## Primary Account
**asferrazza@vectarr.com**
- Name: Alexander Sferrazza
- Title: Accounts Manager
- Phone: (808) 381-8835
- Address: 5900 Balcones Drive, Suite 100, Austin, TX 78731
- Signature File: `asferrazza_vectarr_signature.htm`

## Email Aliases (send via asferrazza@vectarr.com)

### 1. sales@vectarr.com
- **Display Name:** Morgan Parker
- **Title:** Sales Representative
- **Phone:** +1 (650) 427-9450
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `sales_signature.htm`

### 2. info@vectarr.com
- **Display Name:** Taylor Brooks
- **Title:** Information Services
- **Phone:** +1 (650) 427-9450
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `info_signature.htm`

### 3. support@vectarr.com
- **Display Name:** Casey Thompson
- **Title:** Technical Support
- **Phone:** +1 (650) 427-9450
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `support_signature.htm`

### 4. accounts@vectarr.com
- **Display Name:** Jordan Mitchell
- **Title:** Accounts Department
- **Phone:** +1 (650) 427-9450
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `accounts_signature.htm`

### 5. admin@vectarr.com
- **Display Name:** Sam Taylor
- **Title:** Administrator
- **Phone:** +1 (650) 427-9450
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `admin_vectarr_signature.htm`

### 6. kwilliamkatul@vectarr.com
- **Display Name:** Kamal William Katul
- **Title:** Accounts Manager
- **Phone:** +1 (909) 757-3353
- **Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731
- **Signature File:** `kwilliamkatul_vectarr_signature.htm`

## TypeWrite Club Account

### admin@typewrite.club
- **Display Name:** Alexander Sferrazza
- **Title:** Administrator
- **Phone:** +64 21 199 9909
- **Address:** 2c/1 Tika Street, Parnell, Auckland 1052, New Zealand
- **Signature File:** `admin_typewrite_signature.htm`
- **Logo:** https://i.imgur.com/MvQAlV5.png

## How to Send Emails from Aliases

### Using Outlook COM Object (PowerShell)
```powershell
$Outlook = New-Object -ComObject Outlook.Application
$Mail = $Outlook.CreateItem(0)
$Mail.To = "recipient@example.com"
$Mail.Subject = "Subject Line"

# For aliases, use the main account but set Reply-To or use SendUsingAccount
$Accounts = $Outlook.Session.Accounts
$SenderAccount = $Accounts | Where-Object {$_.SmtpAddress -eq "asferrazza@vectarr.com"}
$Mail.SendUsingAccount = $SenderAccount

# Add the appropriate signature HTML
$Signature = Get-Content "path\to\signature.htm" -Raw
$Mail.HTMLBody = "<html><body>Email body here<br><br>$Signature</body></html>"

$Mail.Send()
```

### Important Notes
1. All Vectarr aliases send through the main **asferrazza@vectarr.com** account
2. The **admin@typewrite.club** is a separate account
3. Signatures are stored in: `%APPDATA%\Microsoft\Signatures\`
4. Backup location: `~\.openclaw\workspace\signatures\`
5. GitHub: https://github.com/alex1v1a/Magrathea-Backups/tree/master/signatures

## Signature Format
All signatures use the same transparent table-based format:
- Left column: Logo (70px width)
- Divider: 2px gray vertical line
- Right column: Name, Title, separator line, Phone, Address
- Background: Transparent
- Font: Arial, Helvetica, sans-serif
