Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
}
"@

# Find Chrome window
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1

if ($chrome) {
    Write-Host "Found Chrome window: $($chrome.MainWindowTitle)" -ForegroundColor Green
    $hwnd = $chrome.MainWindowHandle
    
    # Show and activate
    [WinAPI]::ShowWindow($hwnd, 9)  # SW_RESTORE
    [WinAPI]::SetForegroundWindow($hwnd)
    
    Write-Host "Chrome window activated!" -ForegroundColor Green
} else {
    Write-Host "No Chrome window with title found" -ForegroundColor Red
    Write-Host "Chrome processes running: $((Get-Process chrome -ErrorAction SilentlyContinue).Count)"
}
