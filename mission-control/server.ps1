# Vectarr Mission Control - LAN Web Server
# Serves the Mission Control dashboard at http://localhost:8080 and http://<LAN-IP>:8080

param(
    [int]$Port = 8080,
    [string]$RootPath = "$PSScriptRoot"
)

# Get all network IPs
$NetworkIPs = @()
try {
    $NetworkIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.IPAddress -notlike "127.*" -and 
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
    } | Select-Object -ExpandProperty IPAddress
} catch {
    # Fallback: try to get IP from hostname
    try {
        $HostName = [System.Net.Dns]::GetHostName()
        $HostEntry = [System.Net.Dns]::GetHostEntry($HostName)
        $NetworkIPs = $HostEntry.AddressList | Where-Object { 
            $_.AddressFamily -eq "InterNetwork" -and 
            $_.ToString() -notlike "127.*"
        } | Select-Object -ExpandProperty IPAddress
    } catch {
        Write-Warning "Could not detect network IPs"
    }
}

# Create HTTP listener
$Listener = New-Object System.Net.HttpListener

# Always add localhost
$Listener.Prefixes.Add("http://localhost:$Port/")
$Listener.Prefixes.Add("http://127.0.0.1:$Port/")

# Add network IPs for LAN access
foreach ($IP in $NetworkIPs) {
    try {
        $Prefix = "http://$IP`:$Port/"
        $Listener.Prefixes.Add($Prefix)
        Write-Host "Added LAN endpoint: $Prefix" -ForegroundColor DarkGray
    } catch {
        Write-Warning "Could not add endpoint for $IP`: $_"
    }
}

# Also try to add wildcard for any IP (requires admin, may fail)
try {
    $Listener.Prefixes.Add("http://+:$Port/")
    Write-Host "Added wildcard endpoint: http://+:$Port/" -ForegroundColor DarkGray
} catch {
    Write-Warning "Could not add wildcard endpoint (requires admin): $_"
}

try {
    $Listener.Start()
    Write-Host "Vectarr Mission Control Server Started" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Local URL:    http://localhost:$Port/" -ForegroundColor Cyan
    
    if ($NetworkIPs.Count -gt 0) {
        Write-Host "LAN URLs:" -ForegroundColor Cyan
        foreach ($IP in $NetworkIPs) {
            Write-Host "              http://$IP`:$Port/" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server"
    Write-Host ""
    
    # Open browser locally
    Start-Process "http://localhost:$Port/"
    
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response
        
        $Url = $Request.Url.LocalPath
        if ($Url -eq "/") { $Url = "/index.html" }
        
        $FilePath = Join-Path $RootPath $Url
        
        if (Test-Path $FilePath -PathType Leaf) {
            $Content = Get-Content $FilePath -Raw -Encoding UTF8
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Content)
            
            $Response.ContentType = switch ([System.IO.Path]::GetExtension($FilePath)) {
                ".html" { "text/html" }
                ".css" { "text/css" }
                ".js" { "application/javascript" }
                ".json" { "application/json" }
                default { "text/plain" }
            }
            
            $Response.ContentLength64 = $Buffer.Length
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
        } else {
            $Response.StatusCode = 404
            $Message = "Not Found: $Url"
            $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Message)
            $Response.ContentLength64 = $Buffer.Length
            $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
        }
        
        $Response.Close()
    }
} catch {
    Write-Error "Server error: $_"
} finally {
    $Listener.Stop()
    $Listener.Close()
    Write-Host "Server stopped"
}
