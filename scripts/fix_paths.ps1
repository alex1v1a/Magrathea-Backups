# Ensure log directories exist
$LogDir = "C:\Users\admin\.openclaw\workspace\logs\mission-control"
New-Item -ItemType Directory -Force -Path "$LogDir\service" | Out-Null
New-Item -ItemType Directory -Force -Path "$LogDir\api" | Out-Null
New-Item -ItemType Directory -Force -Path "$LogDir\error" | Out-Null
New-Item -ItemType Directory -Force -Path "$LogDir\health" | Out-Null
Write-Host "Log directories created"