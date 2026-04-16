param([string]$To="kwilliamkatul@vectarr.com",[string]$From="asferrazza@vectarr.com",[string]$Subject="Your Vectarr Email Signature - Kamal William Katul")
$SigPath="$env:USERPROFILE\.openclaw\workspace\signatures\kwilliamkatul_vectarr_signature.htm"
$Sig=Get-Content $SigPath-Raw
$Body=@"
<html>
<body style="font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#333;">
<p>Hi Kamal,</p>

<p>Your Vectarr email signature is ready. Please find the HTML file attached and see the preview below.</p>

<h3 style="color:#000;">Your Signature Details:</h3>
<ul>
<li><strong>Name:</strong> Kamal William Katul</li>
<li><strong>Title:</strong> Accounts Manager</li>
<li><strong>Phone:</strong> +1 (909) 757-3353</li>
<li><strong>Address:</strong> 5900 Balcones Drive, Suite 100, Austin, TX 78731</li>
<li><strong>Email:</strong> kwilliamkatul@vectarr.com</li>
</ul>

<h3 style="color:#000;">Signature Preview:</h3>
<div style="border:1px solid #ccc; padding:20px; margin:20px 0; background:#f9f9f9;">
$Sig
</div>

<h3 style="color:#000;">Installation Instructions:</h3>
<ol>
<li><strong>Download the attached HTML file</strong> (kwilliamkatul_vectarr_signature.htm)</li>
<li><strong>Open Outlook</strong> and go to File → Options → Mail → Signatures</li>
<li><strong>Click "New"</strong> to create a new signature</li>
<li><strong>Name it:</strong> "Vectarr (kwilliamkatul@vectarr.com)"</li>
<li><strong>Open the HTML file</strong> in Notepad, copy all content, and paste into the signature editor</li>
<li><strong>Set as default</strong> for new messages and replies/forwards</li>
<li><strong>Click OK</strong> to save</li>
</ol>

<p>If you have any issues installing the signature, please let me know!</p>

<p>Best regards,<br>
Alexander Sferrazza<br>
CEO & Founder, Vectarr</p>
</body>
</html>
"@
try{$o=New-Object -ComObject Outlook.Application;$m=$o.CreateItem(0);$m.To=$To;$m.Subject=$Subject;$m.HTMLBody=$Body;$m.Attachments.Add($SigPath)|Out-Null;$a=$o.Session.Accounts|Where-Object{$_.SmtpAddress-eq$From};if($a){$m.SendUsingAccount=$a;Write-Host "Email with signature attachment sent to $To"}else{Write-Warning "Account not found"};$m.Send()}catch{Write-Error "Failed: $_"}finally{if($m){[System.Runtime.Interopservices.Marshal]::ReleaseComObject($m)|Out-Null}if($o){[System.Runtime.Interopservices.Marshal]::ReleaseComObject($o)|Out-Null}}
