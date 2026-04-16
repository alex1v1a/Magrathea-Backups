param([string]$To="alex@1v1a.com")
$Sigs=@(
    @{File="asferrazza_vectarr_signature.htm";Name="Alexander Sferrazza";Email="asferrazza@vectarr.com";Subj="Test 1/7 - asferrazza@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="sales_signature.htm";Name="Morgan Parker";Email="sales@vectarr.com";Subj="Test 2/7 - sales@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="info_signature.htm";Name="Taylor Brooks";Email="info@vectarr.com";Subj="Test 3/7 - info@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="support_signature.htm";Name="Casey Thompson";Email="support@vectarr.com";Subj="Test 4/7 - support@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="accounts_signature.htm";Name="Jordan Mitchell";Email="accounts@vectarr.com";Subj="Test 5/7 - accounts@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="admin_vectarr_signature.htm";Name="Sam Taylor";Email="admin@vectarr.com";Subj="Test 6/7 - admin@vectarr.com";From="asferrazza@vectarr.com"},
    @{File="admin_typewrite_signature.htm";Name="Alexander Sferrazza";Email="admin@typewrite.club";Subj="Test 7/7 - admin@typewrite.club";From="admin@typewrite.club"}
)
$c=1;foreach($Sig in $Sigs){try{$s=Get-Content "$env:APPDATA\Microsoft\Signatures\$($Sig.File)"-Raw;$o=New-Object -ComObject Outlook.Application;$m=$o.CreateItem(0);$m.To=$To;$m.Subject=$Sig.Subj;$Body="Test $c/7 - Using correct signature for: $($Sig.Name) ($($Sig.Email)) with proper formatting and details.";$m.HTMLBody="<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family:Arial,sans-serif;'><p>$Body</p><br>$s</body></html>";$a=$o.Session.Accounts|Where-Object{$_.SmtpAddress-eq$Sig.From};if($a){$m.SendUsingAccount=$a};$m.Send();Write-Host "[$c/7] Sent from: $($Sig.Email) | Name: $($Sig.Name)";[System.Runtime.Interopservices.Marshal]::ReleaseComObject($m)|Out-Null;[System.Runtime.Interopservices.Marshal]::ReleaseComObject($o)|Out-Null;if($c-lt 7){Start-Sleep -Seconds 15}}catch{Write-Error "Failed [$c/7]: $_"}$c++}
Write-Host "All 7 test emails sent to $To with correct signatures!"
