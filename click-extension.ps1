Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClicker {
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int x, int y);
    
    [DllImport("user32.dll")]
    static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    
    const int MOUSEEVENTF_LEFTDOWN = 0x02;
    const int MOUSEEVENTF_LEFTUP = 0x04;
    
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@

Write-Host "🖱️  Mouse automation ready"
Write-Host "Moving to extension icon location..."

# Extension icon is typically at top-right of browser
# At 1920x1080, it's around x=1850, y=50 (varies by setup)
[MouseClicker]::Click(1850, 50)

Write-Host "✅ Clicked at (1850, 50)"
Write-Host "Waiting for popup..."
Start-Sleep -Seconds 2

# Click "Add All Items" button in popup (typically center of popup)
Write-Host "🖱️  Clicking Add All Items..."
[MouseClicker]::Click(1700, 150)

Write-Host "✅ Done!"
