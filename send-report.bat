@echo off
REM Send Report Wrapper for Windows
REM Usage: send-report.bat report-file.html [recipient@email.com]

node "%~dp0send-report.js" %1 %2