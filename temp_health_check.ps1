try {
    $r = Invoke-WebRequest -Uri 'http://10.0.1.90:3000' -TimeoutSec 10 -ErrorAction Stop
    Write-Output "Frontend StatusCode=$($r.StatusCode)"
} catch {
    Write-Output "Frontend Error=$($_.Exception.Message)"
}

try {
    $r = Invoke-WebRequest -Uri 'http://10.0.1.90:8080/docs' -TimeoutSec 10 -ErrorAction Stop
    Write-Output "API StatusCode=$($r.StatusCode)"
} catch {
    Write-Output "API Error=$($_.Exception.Message)"
}
