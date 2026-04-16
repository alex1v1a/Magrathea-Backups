' Silent Launcher - Completely hidden execution
' Usage: silent_launcher.vbs "path\to\script.ps1" [args]

Set WshShell = CreateObject("WScript.Shell")

If WScript.Arguments.Count < 1 Then
    WScript.Echo "Usage: silent_launcher.vbs ""path\to\script.ps1"" [args]"
    WScript.Quit 1
End If

scriptPath = WScript.Arguments(0)
args = ""

For i = 1 To WScript.Arguments.Count - 1
    args = args & " " & WScript.Arguments(i)
Next

' Run PowerShell completely hidden (window style 0 = hidden)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """" & args
WshShell.Run cmd, 0, True

Set WshShell = Nothing
