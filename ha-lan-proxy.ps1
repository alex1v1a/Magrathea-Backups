# HA LAN Proxy - Forwards external 8123 to localhost 8123
# Run this as Administrator to enable LAN access to Home Assistant

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse("10.0.1.90"), 8123)
$listener.Start()
Write-Host "HA LAN Proxy started on 10.0.1.90:8123 -> 127.0.0.1:8123"
Write-Host "Press Ctrl+C to stop"

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $target = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 8123)
        
        # Forward data in both directions
        $clientStream = $client.GetStream()
        $targetStream = $target.GetStream()
        
        # Start forwarding
        $client.CopyToAsync($targetStream)
        $target.CopyToAsync($clientStream)
    }
} finally {
    $listener.Stop()
}
