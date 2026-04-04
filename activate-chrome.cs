Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class ChromeActivator {
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    static extern bool IsWindow(IntPtr hWnd);
    
    [DllImport("user32.dll", SetLastError=true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    const int SW_RESTORE = 9;
    const int SW_SHOW = 5;
    
    public static void Main(string[] args) {
        // Find Chrome windows
        Process[] chromeProcs = Process.GetProcessesByName("chrome");
        Console.WriteLine($"Found {chromeProcs.Length} Chrome processes");
        
        foreach (var proc in chromeProcs) {
            if (proc.MainWindowHandle != IntPtr.Zero) {
                Console.WriteLine($"Process {proc.Id}: Window found (Handle: {proc.MainWindowHandle})");
                ShowWindow(proc.MainWindowHandle, SW_RESTORE);
                SetForegroundWindow(proc.MainWindowHandle);
                Console.WriteLine("Window activated!");
                return;
            }
        }
        
        // Try finding by class name
        IntPtr hwnd = FindWindow("Chrome_WidgetWin_1", null);
        if (hwnd != IntPtr.Zero) {
            Console.WriteLine("Found Chrome window by class name");
            ShowWindow(hwnd, SW_RESTORE);
            SetForegroundWindow(hwnd);
            Console.WriteLine("Window activated!");
        } else {
            Console.WriteLine("No Chrome window found to activate");
        }
    }
}
"@

[ChromeActivator]::Main(@())
