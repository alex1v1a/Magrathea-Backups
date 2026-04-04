# HomeKit Port Forwarder
# Forwards 10.0.1.90:21065 -> 127.0.0.1:21065

$listenIP = "0.0.0.0"
$listenPort = 21065
$forwardIP = "127.0.0.1"
$forwardPort = 21065

Write-Host "Starting HomeKit port forwarder..."
Write-Host "Listening on ${listenIP}:${listenPort} -> ${forwardIP}:${forwardPort}"

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse($listenIP), $listenPort)

try {
    $listener.Start()
    Write-Host "Forwarder started successfully!"
    
    while ($true) {
        Write-Host "Waiting for connection..."
        $client = $listener.AcceptTcpClient()
        Write-Host "Client connected from $($client.Client.RemoteEndPoint)"
        
        $backend = New-Object System.Net.Sockets.TcpClient($forwardIP, $forwardPort)
        
        $clientStream = $client.GetStream()
        $backendStream = $backend.GetStream()
        
        # Simple bidirectional copy (blocking, single connection)
        $buffer = New-Object byte[] 4096
        while ($client.Connected -and $backend.Connected) {
            if ($clientStream.DataAvailable) {
                $read = $clientStream.Read($buffer, 0, $buffer.Length)
                $backendStream.Write($buffer, 0, $read)
            }
            if ($backendStream.DataAvailable) {
                $read = $backendStream.Read($buffer, 0, $buffer.Length)
                $clientStream.Write($buffer, 0, $read)
            }
            Start-Sleep -Milliseconds 10
        }
        
        $client.Close()
        $backend.Close()
    }
} catch {
    Write-Host "Error: $_"
} finally {
    $listener.Stop()
}
