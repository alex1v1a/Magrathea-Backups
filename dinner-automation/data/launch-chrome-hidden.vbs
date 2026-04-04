Set WshShell = CreateObject("WScript.Shell")
WshShell.Run ""C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir=\"C:\Users\Admin\.openclaw\chrome-marvin-only-profile\" --load-extension=\"C:\Users\Admin\.openclaw\workspace\dinner-automation\heb-extension\" --no-first-run --no-default-browser-check --start-maximized https://www.heb.com", 0, False
Set WshShell = Nothing