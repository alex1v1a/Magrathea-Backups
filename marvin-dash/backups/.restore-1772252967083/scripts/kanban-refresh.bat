@echo off
REM Kanban Auto-Refresh Cron Job for Windows
REM Runs every 30 minutes via Task Scheduler

echo [%date% %time%] Starting kanban refresh...

REM Change to script directory
cd /d "C:\Users\Admin\.openclaw\workspace\marvin-dash\scripts"

REM Run the refresh script
"C:\Program Files\nodejs\node.exe" kanban-refresh.js >> ..\data\kanban-refresh.log 2>&1

echo [%date% %time%] Kanban refresh complete.
