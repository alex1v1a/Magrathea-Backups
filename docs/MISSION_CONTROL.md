# Mission Control Dashboard - Vectarr Operations

## Dashboard URL
**Frontend:** http://10.0.1.90:3000  
**API:** http://10.0.1.90:8080  
**API Docs:** http://10.0.1.90:8080/docs

## Purpose
Mission Control is the central command dashboard for Vectarr business operations. It tracks:
- Machine shop outreach pipeline
- Customer project tracking
- Strategic initiatives
- Daily operations tasks

## Current Board Structure

### Board 1: Machine Shop Outreach Pipeline
**Columns:** Prospects → Contacted → Responded → In Discussion → Onboarding → Active → Paused → Declined

**Card Fields:**
- Shop Name (text, required)
- Location (text)
- Contact Person (text)
- Email (email)
- Phone (text)
- Capabilities (multiselect)
- Website (URL)
- Date First Contacted (date)
- Last Activity Date (date)
- Status (dropdown)
- Notes (textarea)
- Next Action (text)

### Board 2: Customer Project Tracking
**Columns:** New Inquiries → Quoted → In Production → Completed → Review Pending → Issues

**Card Fields:**
- Company Name (text, required)
- Contact Person (text)
- Project Description (textarea)
- CAD File Type (text)
- Material Requirements (text)
- Quantity (number)
- Quote Amount (currency)
- Awarded Shop (text)
- Timeline (text)
- Status (dropdown)

### Board 3: Content Calendar
**Columns:** Ideas → In Progress → Review → Scheduled → Published → Promoted

**Card Fields:**
- Title (text, required)
- Content Type (dropdown)
- Author (text)
- Due Date (date)
- Publish Date (date)
- Keywords (text)
- Status (dropdown)
- Notes (textarea)

## Proposed New Boards (2026-04-01)

### Board 4: Business Operations Dashboard
**Columns:** Scheduled → In Progress → Blocked → Completed

**Purpose:** Track daily operational tasks and automation

**Card Fields:**
- Task Name (text, required)
- Type (dropdown: Automated, Manual, Review Required)
- Priority (dropdown: Critical, High, Medium, Low)
- Assigned To (text)
- Due Time (time)
- Status (dropdown)
- Notes (textarea)
- Automation Script (text)
- Last Run (datetime)
- Next Run (datetime)

**Default Cards:**
1. Machine Shop Outreach (5:00 AM daily)
2. Email Monitor (every 2 hours)
3. Business Summary (1:00 PM daily)
4. Website Health Check (hourly)
5. Competitive Intelligence Scan (daily)

### Board 5: Strategic Initiatives
**Columns:** Ideas → Research → In Progress → Testing → Implemented → Measuring

**Purpose:** Track strategic projects and improvements

**Card Fields:**
- Initiative Name (text, required)
- Category (dropdown: Platform, Marketing, Sales, Operations, Partnership)
- Priority (dropdown)
- Owner (text)
- Expected Impact (textarea)
- Timeline (text)
- Budget (currency)
- Status (dropdown)
- Success Metrics (textarea)
- Notes (textarea)

**Current Initiatives:**
1. Platform UX improvements
2. Shop network expansion (500+ target)
3. Customer acquisition campaigns
4. Texas market penetration
5. Automated quoting enhancements

### Board 6: Competitive Intelligence
**Columns:** Monitoring → Changes Detected → Analysis → Action Required → Resolved

**Purpose:** Track competitors and market changes

**Card Fields:**
- Competitor/Topic (text, required)
- Type (dropdown: Competitor, Industry Trend, Customer Feedback, Technology)
- Source (URL)
- Change Detected (textarea)
- Impact Assessment (dropdown: High, Medium, Low)
- Recommended Action (textarea)
- Assigned To (text)
- Status (dropdown)
- Date Detected (date)

**Competitors to Monitor:**
- Xometry
- Protolabs
- Fictiv
- Hubs (Protolabs)
- Plethora
- Fast Radius

## Integration with Daily Reports

### 1:00 PM Business Summary pulls from:
1. **Machine Shop Outreach Board** - New contacts, replies, status changes
2. **Customer Project Board** - New quotes, orders, issues
3. **Business Operations Board** - Task completion, automation status
4. **Strategic Initiatives Board** - Progress updates
5. **Competitive Intelligence Board** - New detections

## Automation Integration

### Scripts that update Mission Control:
- `machine_shop_outreach_fixed.ps1` - Creates/updates shop cards
- `email_monitor.ps1` - Updates customer project cards
- `business_summary.ps1` - Updates operations board

### API Endpoints Used:
- `GET /api/v1/boards` - List all boards
- `GET /api/v1/boards/{board_id}/tasks` - Get tasks on a board
- `POST /api/v1/boards/{board_id}/tasks` - Create new task
- `PUT /api/v1/boards/{board_id}/tasks/{task_id}` - Update task
- `GET /api/v1/boards/{board_id}/snapshot` - Get board state

## Health Monitoring

### Dashboard Health Check Script
```powershell
# Check API health
$response = Invoke-RestMethod -Uri "http://10.0.1.90:8080/health" -Method GET
if ($response -eq "ok") {
    Write-Host "Mission Control API: Healthy"
} else {
    Write-Host "Mission Control API: Issue detected"
}

# Check frontend
$frontend = Invoke-WebRequest -Uri "http://10.0.1.90:3000" -Method HEAD
if ($frontend.StatusCode -eq 200) {
    Write-Host "Mission Control Frontend: Accessible"
} else {
    Write-Host "Mission Control Frontend: Issue detected"
}
```

## Access Control

### Current Users:
- alex1v1a (full access)
- Admin accounts (full access)
- Sales/Support aliases (read-only)

### Authentication:
- API requires bearer token
- Frontend requires login
- Gateway integration available

## Backup and Recovery

### Backup Schedule:
- Daily: Board data export
- Weekly: Full database backup
- Monthly: Archive old completed tasks

### Export Location:
`C:\Users\admin\.openclaw\workspace\mission-control-backups\`

---

*Document Version: 2026-04-01*  
*Next Review: Weekly*
