' WSL Monitor - Hidden Runner
Dim WshShell
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts\wsl-monitor.bat" & """", 0, True
Set WshShell = Nothing
