# Mission Control - Administrator Guide

**Document Version:** 2026-04-11  
**System:** Vectarr Mission Control Dashboard  
**Maintainer:** Operations Team

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Network Configuration](#network-configuration)
3. [Service Management](#service-management)
4. [Logging](#logging)
5. [Database](#database)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

---

## System Architecture

### Overview

Mission Control is a web-based dashboard for managing Vectarr operations. The current implementation consists of:

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| **Web Server** | PowerShell HTTP Listener | 8080 | Serves static dashboard files |
| **Dashboard UI** | HTML/CSS/JavaScript (Single Page) | - | Visualization and interaction layer |
| **Data Storage** | CSV/Excel files (SharePoint) | - | Machine shop and customer data |

### File Locations

```
C:\Users\admin\.openclaw\workspace\
├── mission-control\
│   ├── index.html              # Main dashboard UI
│   ├── server.ps1              # PowerShell HTTP server
│   ├── start.bat               # Manual startup script
│   ├── README.md               # User documentation
│   └── backups\               # Backup storage
│       ├── archives\           # Compressed backups
│       └── logs\              # Backup operation logs
├── scripts\
│   ├── mission_control_service.ps1    # Windows service manager
│   ├── mission_control_backup.ps1     # Backup/restore utility
│   └── mission_control_health.ps1     # Health monitoring
├── logs\
│   └── mission-control\
│       ├── api\                # API request logs
│       ├── error\              # Error logs
│       ├── service\            # Service operation logs
│       └── health\             # Health check results
└── docs\
    └── MISSION_CONTROL_ADMIN.md # This document
```

### Architecture Evolution

**Current State (Static Dashboard):**
- Single PowerShell HTTP server on port 8080
- Serves static HTML file with embedded CSS/JS
- No persistent database (reads from CSV/Excel)
- Suitable for single-user or small team

**Planned Evolution (API + Frontend):**
- API Server on port 8080 (Node.js/Python)
- Frontend Server on port 3000/3001 (React/Vue)
- SQLite database for persistent storage
- Multi-user support with authentication
- Real-time updates via WebSocket

---

## Network Configuration

### Ports

| Port | Protocol | Service | Access |
|------|----------|---------|--------|
| 8080 | TCP/HTTP | Mission Control Dashboard | LAN + Localhost |
| 3000 | TCP/HTTP | Future Frontend (planned) | LAN + Localhost |
| 3001 | TCP/HTTP | Future Frontend (alternative) | LAN + Localhost |

### Firewall Rules

To allow LAN access, ensure Windows Firewall permits inbound connections:

```powershell
# Run as Administrator
New-NetFirewallRule `
    -DisplayName "Vectarr Mission Control" `
    -Direction Inbound `
    -LocalPort 8080,3000,3001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private
```

### Access URLs

| Location | URL | Notes |
|----------|-----|-------|
| Local | http://localhost:8080/ | Same machine only |
| LAN | http://10.0.1.90:8080/ | Replace with actual IP |
| Remote | Not configured | VPN required for external access |

To find your machine's LAN IP:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object IPAddress
```

---

## Service Management

### Windows Service Installation

Mission Control runs as a Windows service using NSSM (Non-Sucking Service Manager) for reliability.

#### Prerequisites

1. **Install NSSM** (if not already installed):
   ```powershell
   # Using Chocolatey
   choco install nssm
   
   # Or download from https://nssm.cc/download
   ```

2. **Verify NSSM**:
   ```powershell
   nssm version
   ```

#### Installation

```powershell
cd C:\Users\admin\.openclaw\workspace\scripts
.\mission_control_service.ps1 -Action install
```

This creates a Windows service named `VectarrMissionControl` that:
- Starts automatically on boot
- Runs headless (no console window)
- Auto-restarts on crash (with crash-loop protection)
- Logs all output to files

#### Service Operations

```powershell
# Start the service
.\mission_control_service.ps1 -Action start

# Stop the service
.\mission_control_service.ps1 -Action stop

# Restart the service
.\mission_control_service.ps1 -Action restart

# Check status
.\mission_control_service.ps1 -Action status

# View recent logs
.\mission_control_service.ps1 -Action logs

# Remove the service
.\mission_control_service.ps1 -Action remove

# Update configuration (reinstall)
.\mission_control_service.ps1 -Action update
```

#### Using Windows Service Manager

```powershell
# Check service status
Get-Service VectarrMissionControl

# Start via Service Manager
Start-Service VectarrMissionControl

# Stop via Service Manager
Stop-Service VectarrMissionControl

# Configure auto-start
Set-Service VectarrMissionControl -StartupType Automatic
```

### Manual Startup (Development/Debugging)

For debugging or development:

```powershell
cd C:\Users\admin\.openclaw\workspace\mission-control
.\server.ps1 -Port 8080
```

Or use the batch file:
```batch
start.bat
```

---

## Logging

### Log Directory Structure

```
C:\Users\admin\.openclaw\workspace\logs\mission-control\
├── api\                      # API request/response logs
│   ├── api_20260411.log
│   └── api_20260412.log
├── error\                    # Error and exception logs
│   ├── error_20260411.log
│   └── error_20260412.log
├── service\                  # Service operation logs
│   ├── service_20260411.log
│   └── nssm_stdout.log
└── health\                   # Health check results
    └── health_20260411_143022.json
```

### Log Rotation

Logs are automatically rotated when they exceed 100 MB:
- Current log: `api_20260411.log`
- Rotated logs: `api_20260411.1.log`, `api_20260411.2.log`, etc.
- Maximum 10 archived logs per file

### Viewing Logs

```powershell
# View service logs
Get-Content .\logs\mission-control\service\service_$(Get-Date -Format 'yyyyMMdd').log -Tail 50

# View error logs
Get-Content .\logs\mission-control\error\error_$(Get-Date -Format 'yyyyMMdd').log -Tail 50

# Follow logs in real-time
Get-Content .\logs\mission-control\api\api_$(Get-Date -Format 'yyyyMMdd').log -Wait

# Search for errors
Select-String -Path .\logs\mission-control\*\*.log -Pattern "ERROR" | Select-Object -Last 20
```

### Log Levels

| Level | Color | Description |
|-------|-------|-------------|
| INFO | White | General operational messages |
| WARN | Yellow | Warning conditions |
| ERROR | Red | Error conditions |
| SUCCESS | Green | Successful operations |

---

## Database

### Current State

Mission Control **does not currently use a database**. Data is sourced from:

1. **Machine Shops CSV:**
   - Location: `OneDrive - Vectarr/Communication site - Company Files/Vectarr/Marketing Research/Outreach/Machine Shops.csv`
   - Updated by: `machine_shop_outreach.ps1` scripts

2. **Outlook Integration:**
   - Drafts folder for pending emails
   - Sent items for tracking

3. **Memory Files:**
   - `memory/YYYY-MM-DD.md` for daily operation logs

### Future Database Migration

When migrating to SQLite:

```powershell
# Database path (when implemented)
C:\Users\admin\.openclaw\workspace\data\mission_control.db

# Backup before migration
.\scripts\mission_control_backup.ps1 -Action backup -Type db
```

### Database Schema (Planned)

```sql
-- machine_shops table
CREATE TABLE machine_shops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    capabilities TEXT,
    website TEXT,
    status TEXT DEFAULT 'prospect',
    date_first_contacted DATE,
    last_activity_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- customer_projects table
CREATE TABLE customer_projects (
    id INTEGER PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    project_description TEXT,
    quote_amount REAL,
    status TEXT DEFAULT 'new_inquiry',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- cron_job_history table
CREATE TABLE cron_job_history (
    id INTEGER PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT,
    duration_seconds INTEGER,
    output TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Backup & Recovery

### Backup Strategy

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full | Weekly | 30 days | Local + Remote |
| Config | On change | 90 days | Local |
| Database | Daily (when implemented) | 30 days | Local + Remote |

### Creating Backups

```powershell
cd C:\Users\admin\.openclaw\workspace\scripts

# Full backup (all files)
.\mission_control_backup.ps1 -Action backup -Type full

# Configuration only
.\mission_control_backup.ps1 -Action backup -Type config

# Database only (when implemented)
.\mission_control_backup.ps1 -Action backup -Type db

# Logs only
.\mission_control_backup.ps1 -Action backup -Type logs

# With remote copy
.\mission_control_backup.ps1 -Action backup -Type full -RemoteBackupPath "\\server\backups\mission-control"
```

### Listing Backups

```powershell
# Show all backups
.\mission_control_backup.ps1 -Action list
```

Output:
```
Name                                  Type     Date                SizeMB Path
----                                  ----     ----                ------ ----
mission_control_full_20260411_120000.zip full     4/11/2026 12:00:00  15.23  C:\...\backups\archives\...
mission_control_config_20260410_180000.zip config   4/10/2026 18:00:00  0.05   C:\...\backups\archives\...
```

### Restoring from Backup

```powershell
# Interactive restore (lists backups to choose from)
.\mission_control_backup.ps1 -Action restore

# Restore specific file
.\mission_control_backup.ps1 -Action restore -RestoreFile "C:\...\mission_control_full_20260411_120000.zip"
```

**Warning:** Restoration stops the service, overwrites files, and restarts the service.

### Backup Cleanup

```powershell
# Remove backups older than 30 days
.\mission_control_backup.ps1 -Action cleanup -KeepDays 30
```

### Recovery Procedures

#### Scenario 1: Service Won't Start

1. Check logs:
   ```powershell
   Get-Content .\logs\mission-control\error\*.log -Tail 100
   ```

2. Try manual start to see errors:
   ```powershell
   cd .\mission-control
   .\server.ps1
   ```

3. Restore from backup if needed:
   ```powershell
   .\scripts\mission_control_backup.ps1 -Action restore
   ```

#### Scenario 2: Database Corruption (Future)

1. Stop service:
   ```powershell
   Stop-Service VectarrMissionControl
   ```

2. Backup corrupted database:
   ```powershell
   Copy-Item .\data\mission_control.db .\data\mission_control.db.corrupt.$(Get-Date -Format 'yyyyMMdd')
   ```

3. Restore from backup:
   ```powershell
   .\scripts\mission_control_backup.ps1 -Action restore
   ```

4. Start service:
   ```powershell
   Start-Service VectarrMissionControl
   ```

#### Scenario 3: Complete Server Failure

1. Install prerequisites on new server:
   - PowerShell 5.1+
   - NSSM
   - Windows

2. Restore from backup:
   ```powershell
   .\scripts\mission_control_backup.ps1 -Action restore -RestoreFile "<backup-path>"
   ```

3. Install service:
   ```powershell
   .\scripts\mission_control_service.ps1 -Action install
   .\scripts\mission_control_service.ps1 -Action start
   ```

4. Configure firewall rules (see Network Configuration section)

---

## Troubleshooting

### Common Issues

#### Issue: Service fails to start

**Symptoms:**
- `Get-Service VectarrMissionControl` shows Status = Stopped
- Logs show "Failed to start service"

**Diagnosis:**
```powershell
# Check for port conflicts
Get-NetTCPConnection -LocalPort 8080 | Select-Object LocalPort, OwningProcess, @{N="ProcessName";E={(Get-Process -Id $_.OwningProcess).ProcessName}}

# Check NSSM configuration
nssm dump VectarrMissionControl

# Check Windows Event Log
Get-EventLog -LogName Application -Source "VectarrMissionControl" -Newest 10
```

**Solutions:**
1. **Port in use:** Change port in service configuration
2. **Permission denied:** Run install as Administrator
3. **Missing files:** Restore from backup

#### Issue: Cannot access from LAN

**Symptoms:**
- Local access works (localhost:8080)
- LAN access fails (10.0.1.90:8080)

**Diagnosis:**
```powershell
# Test connectivity
Test-NetConnection -ComputerName 10.0.1.90 -Port 8080

# Check firewall
Get-NetFirewallRule -DisplayName "*Mission Control*" | Select-Object DisplayName, Enabled, Action
```

**Solutions:**
1. Add firewall rule (see Network Configuration)
2. Check Windows Defender profiles
3. Verify IP address hasn't changed

#### Issue: Dashboard not updating

**Symptoms:**
- Page loads but data is stale
- Changes not reflected

**Diagnosis:**
```powershell
# Check if service is running
Get-Service VectarrMissionControl

# Check server logs for errors
Get-Content .\logs\mission-control\error\*.log -Tail 20
```

**Solutions:**
1. Hard refresh browser (Ctrl+F5)
2. Restart service
3. Check data source files are accessible

#### Issue: High memory/CPU usage

**Diagnosis:**
```powershell
# Check process resources
Get-Process powershell | Where-Object { $_.CommandLine -like "*server.ps1*" } | Select-Object ProcessName, Id, WorkingSet, CPU
```

**Solutions:**
1. Restart service to clear memory
2. Check for log file bloat
3. Review health check results

### Diagnostic Commands

```powershell
# Complete system status
function Get-MissionControlDiagnostics {
    Write-Host "=== Mission Control Diagnostics ===" -ForegroundColor Cyan
    
    # Service status
    $Service = Get-Service VectarrMissionControl -ErrorAction SilentlyContinue
    Write-Host "`nService Status: $($Service.Status)" -ForegroundColor $(if($Service.Status -eq 'Running'){'Green'}else{'Red'})
    
    # Port binding
    Write-Host "`nPort Bindings:"
    Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | 
        Select-Object LocalPort, OwningProcess, @{N="Process";E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name}}
    
    # Disk space
    Write-Host "`nDisk Space:"
    Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | 
        Select-Object @{N="Free(GB)";E={[math]::Round($_.FreeSpace/1GB,2)}}, @{N="Total(GB)";E={[math]::Round($_.Size/1GB,2)}}
    
    # Recent errors
    Write-Host "`nRecent Errors:"
    Select-String -Path .\logs\mission-control\*\*.log -Pattern "ERROR" -ErrorAction SilentlyContinue | Select-Object -Last 5
}

Get-MissionControlDiagnostics
```

---

## Security Considerations

### Current Security Model

Mission Control operates in a **trusted LAN environment**:
- No authentication required
- No HTTPS/TLS
- Accessible to all LAN devices

### Recommended Hardening

#### 1. Network Segmentation

Place Mission Control on an isolated management VLAN:
- Restrict access to admin workstations only
- Block inbound internet access
- Log all access attempts

#### 2. IP Whitelisting (Future)

When authentication is implemented:

```powershell
# Example: Restrict to specific IPs
$AllowedIPs = @("10.0.1.0/24", "10.0.2.100")
```

#### 3. HTTPS/TLS (Future)

For external access, implement:
- Reverse proxy (nginx/IIS)
- Let's Encrypt certificates
- Certificate pinning

#### 4. Audit Logging

Enable detailed audit logs:
- All configuration changes
- Login attempts (when auth added)
- Data modifications

#### 5. Backup Encryption

Encrypt backup archives containing sensitive data:

```powershell
# Password-protect ZIP backups
Compress-Archive -Path $Source -DestinationPath $Destination -CompressionLevel Optimal
# Then encrypt with 7-Zip or similar
```

### Security Checklist

- [ ] Firewall rules configured (port 8080 restricted)
- [ ] Backups stored on separate device
- [ ] Service runs as limited user (not LocalSystem)
- [ ] Logs reviewed weekly
- [ ] Access logs monitored
- [ ] Emergency contacts documented

---

## Appendix

### Quick Reference Card

```
START SERVICE:
  .\scripts\mission_control_service.ps1 -Action start

STOP SERVICE:
  .\scripts\mission_control_service.ps1 -Action stop

RESTART SERVICE:
  .\scripts\mission_control_service.ps1 -Action restart

CHECK STATUS:
  .\scripts\mission_control_service.ps1 -Action status

VIEW LOGS:
  .\scripts\mission_control_service.ps1 -Action logs

CREATE BACKUP:
  .\scripts\mission_control_backup.ps1 -Action backup -Type full

RESTORE BACKUP:
  .\scripts\mission_control_backup.ps1 -Action restore

ACCESS DASHBOARD:
  http://localhost:8080/
  http://10.0.1.90:8080/

LOG LOCATION:
  .\logs\mission-control\

BACKUP LOCATION:
  .\mission-control\backups\
```

### Environment Variables

Create a `.env` file for sensitive configuration:

```powershell
# .\mission-control\.env (not yet implemented)
MC_API_PORT=8080
MC_FRONTEND_PORT=3000
MC_LOG_LEVEL=info
MC_DB_PATH=.\data\mission_control.db
```

### Scheduled Tasks

Recommended Windows Scheduled Tasks:

1. **Daily Backup** (2:00 AM):
   ```powershell
   .\scripts\mission_control_backup.ps1 -Action backup -Type full
   ```

2. **Weekly Cleanup** (Sunday 3:00 AM):
   ```powershell
   .\scripts\mission_control_backup.ps1 -Action cleanup -KeepDays 30
   ```

3. **Health Check** (Every 5 minutes):
   ```powershell
   .\scripts\mission_control_health.ps1
   ```

### Support Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Service down | Operations Team | Discord: #operations |
| Data issues | Data Admin | Email: admin@vectarr.com |
| Feature requests | Product Team | Discord: #feature-requests |
| Emergencies | On-call | PagerDuty |

---

*Document generated: 2026-04-11*  
*Next review: 2026-05-11*
