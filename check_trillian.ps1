$ErrorActionPreference = 'SilentlyContinue'
$password = Get-Content 'C:\Users\admin\.openclaw\workspace\temp_sshpass.txt' -Raw
$password = $password.Trim()

# Use sshpass if available, otherwise try expect or manual
$env:SSHPASS = $password

# Try direct SSH with password
try {
    $result = echo $password | ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 admin@10.0.1.90 'openclaw gateway status' 2>&1
    Write-Output $result
} catch {
    Write-Error "SSH failed: $_"
}