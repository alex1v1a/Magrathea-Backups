Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\Users\Admin\.openclaw\chrome-marvin-only-profile --restore-last-session --no-first-run --no-default-browser-check --start-maximized", 0, False
Set WshShell = Nothing