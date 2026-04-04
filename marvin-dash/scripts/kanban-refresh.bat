@echo off
if defined ALREADY_HIDDEN goto :run
set ALREADY_HIDDEN=1
start /min "" cmd /c "%~f0" %*
exit
:run
cd /d "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts"
"C:\Program Files\nodejs\node.exe" kanban-refresh.js >> ..\data\kanban-refresh.log 2>&1
