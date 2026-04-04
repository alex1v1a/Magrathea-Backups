@echo off
echo ==========================================
echo    Chrome - Marvin Profile Only
echo ==========================================
echo.
echo Launching Chrome with Marvin profile
echo Account: 9marvinmartian@gmail.com
echo.
echo Other profiles are disabled.
echo.

"C:Program FilesGoogleChromeApplicationchrome.exe" ^
  --user-data-dir="C:\Users\Admin\.openclaw\chrome-marvin-only-profile" ^
  --profile-directory="Default" ^
  --start-maximized ^
  --no-first-run ^
  --no-default-browser-check

echo.
echo Chrome launched with Marvin profile.
pause
