$result = curl.exe -s --url "imaps://imap.mail.me.com:993/INBOX;UID=11" --user "MarvinMartian9@icloud.com:hazf-gpml-kpha-bqmu"
$result | Out-File -FilePath "dinner-automation/data/raw-email.txt" -Encoding UTF8
Write-Host "Saved to raw-email.txt"
Write-Host "Content:"
Write-Host $result
