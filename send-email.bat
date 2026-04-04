@echo off
REM Send Email Wrapper for Windows
REM Usage: send-email.bat --to "recipient@example.com" --subject "Subject" --body "Message"

node "%~dp0send-email.js" %*