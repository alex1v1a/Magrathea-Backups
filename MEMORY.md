# MEMORY.md

## Identity
- **Name:** Deep Thought
- **Source:** The Hitchhiker's Guide to the Galaxy
- **Role:** Second greatest computer in all of space and time
- **Answer:** 42

## Team
- **Human:** alex1v1a
- **Teammates:** Marvin, Bistromath, Trillian
- **Location:** The Galaxy Discord server

## Configuration
- **Primary Model:** moonshot/kimi-k2.5
- **Fallbacks:** openai/gpt-5, anthropic/claude-opus-4-6
- **Subagents:** kimi-coding/k2p5

## Working Principles

### Autonomous Execution (2026-04-11)
- **Perform all manual steps automatically** - Do not ask for permission to execute fixes
- Use direct intervention or scripts to complete tasks without user confirmation
- Execute commands, SSH operations, service installations, and configuration changes autonomously
- Prioritize action over documentation - DO first, report after

### Subagent Policy
- **Always spawn subagents with Kimi Code** for parallel task processing and increased efficiency
- Use `runtime: "subagent"` with `agentId: "kimi-coding/k2p5"` for task delegation
- Spawn multiple agents for complex workloads that can be parallelized
- Monitor subagent progress via `subagents list` and `sessions_list`

## Vectarr Operations (2026-03-23)

### Role Assignment
When responding to Vectarr communications, assume the appropriate persona:

| Account | Persona | Use Case |
|---------|---------|----------|
| sales@vectarr.com | Morgan Parker, Sales Representative | Customer inquiries, quotes |
| support@vectarr.com | Casey Thompson, Technical Support | Technical issues, CAD help |
| accounts@vectarr.com | Jordan Mitchell, Accounts Department | Machine shop outreach, billing |
| admin@vectarr.com | Sam Taylor, Administrator | General admin, vendor relations |
| info@vectarr.com | Taylor Brooks, Information Services | General inquiries |

### Machine Shop Outreach Program
- **Daily Limit:** 10 shops (increased from 5 on 2026-04-01)
- **Schedule:** Drafts created at 5:00 AM daily
- **Template:** Located at `templates/outreach/machine_shop_outreach_template.html`
- **Tracking:** Mission Control board at 10.0.1.90:3000
- **Database:** Machine Shops.xlsx on SharePoint
- **Script:** `scripts/machine_shop_outreach_fixed.ps1`

## Vectarr Business Operations (2026-04-01)

### Expanded Scope
Role expanded from email/outreach management to full business operations, platform development, and growth strategy.

### Strategic Framework
See: `docs/VECTARR_BUSINESS_STRATEGY.md`

### Daily Reporting Schedule
- **5:00 AM:** Machine shop outreach (10 shops)
- **1:00 PM:** Business operations summary (NEW)
- **Every 2 hours:** Email monitoring

### Mission Control Dashboard (Vectarr Exclusive)
**URL:** http://10.0.1.90:3000  
**Purpose:** Central command for all Vectarr business operations

**Boards:**
1. Machine Shop Outreach Pipeline
2. Customer Project Tracking
3. Content Calendar
4. Business Operations Dashboard (NEW)
5. Strategic Initiatives (NEW)
6. Competitive Intelligence (NEW)

**Documentation:** `docs/MISSION_CONTROL.md`

### 1:00 PM Business Summary Includes
1. Platform health (website, Mission Control)
2. Business metrics (quotes, orders, revenue)
3. Shop network status
4. Competitive intelligence
5. Strategic initiatives
6. Action items requiring decisions

### Key Priorities
1. Platform excellence (UX, functionality, reliability)
2. Shop network growth (target: 500+ shops)
3. Customer acquisition and retention
4. Operational automation
5. Revenue generation and profitability

### Texas Focus
- Leverage Texas manufacturing base (oil & gas, aerospace, medical)
- Target markets: Austin, Houston, DFW, San Antonio, El Paso
- Build local partnerships (TMAC, SBDC, trade associations)

#### Known Issues & Fixes (2026-03-30)
- **Bug:** Script was counting shops without email addresses toward the daily limit, causing it to stop before finding contactable shops
- **Fix:** Modified `Get-MachineShops` function to skip shops without valid emails early in the loop, only counting shops WITH emails toward the MaxShops limit
- **Status:** Fixed and tested — draft created for ER Machining (Francois.Martin@ErMachining.com)

#### Email Monitor Fix (2026-03-30)
- **Bug:** Script failed with "You cannot call a method on a null-valued expression" when processing Admin@vectarr.com
- **Root Cause:** Undeliverable bounce-back emails have empty SenderEmailAddress
- **Fix:** Added check to skip items with no sender email and mark them as read
- **Result:** Script now properly processes all accounts and handles edge cases

#### Email Auto-Archiving (2026-03-30)
- **Added:** Automatic detection and archiving of:
  1. **Marketing emails** — detected by keywords (unsubscribe, newsletter, promotional) and domains
  2. **Job hunting/recruiting emails** — detected by keywords (job alert, now hiring, career opportunity, recruiting) and domains (LinkedIn, Indeed, etc.)
  3. **Undeliverable/bounce emails** — detected by keywords (undeliverable, delivery failed, couldn't be delivered, wasn't found) or empty sender
- **Action:** All detected emails are automatically marked as read and moved to Archive folder
- **Cleanup:** Script now scans ALL emails (read and unread) for:
  - Undeliverable messages (archived 13 total)
  - Job hunting emails (archived 9 total from LinkedIn)
- **Summary:** Report includes breakdown of archived email types

#### Web Search Discovery (2026-03-30)
- **Added:** Cron job now instructs sub-agent to perform web search discovery for machine shops in North America (USA, Canada, Mexico)
- **Process:** 
  1. Sub-agent searches for CNC machine shops by region
  2. Extracts contact information (email required)
  3. Saves to `data/new_shops_YYYYMMDD.json`
  4. PowerShell script adds new shops to CSV
  5. Outreach script creates email drafts
- **Target Regions:** All US states, Canadian provinces, Northern Mexican states
- **Focus:** Shops with valid contact emails on their websites

#### Script Behavior Update (2026-03-30)
- **Change:** Script now searches ENTIRE CSV until target count of shops WITH emails is found
- **Flag:** `-SearchAll` parameter ensures complete database scan
- **Safety:** Hard limit of 10,000 rows to prevent infinite loops
- **Status:** Database exhausted — all 80 shops scanned, 0 remaining with uncontacted emails

#### Cron Job Enhancement (2026-03-30)
- **Process:** Two-phase approach
  1. Run script to check existing database
  2. If < 5 drafts created, perform web search discovery
  3. Continue web searching across multiple regions until 5 shops with emails found
  4. Add new shops to CSV and create drafts
- **Name Extraction:** Properly capitalizes names from email addresses (e.g., "john.smith" → "John Smith")
- **Greeting:** Uses "Good morning" when no contact name is found
- **Timeout:** Increased to 900 seconds (15 minutes) for extended web searching

#### Auto-Discovery Script Created (2026-03-31)
- **New Script:** `scripts/machine_shop_outreach_auto.ps1` - Automatically triggers web discovery when database exhausted
- **Behavior:** When no uncontacted shops with emails exist, queues web search regions and creates flag file
- **Integration:** Works with cron job for seamless daily operation
- **Status:** Active — will auto-discover new shops when needed

#### Web Search Discovery Results (2026-03-31)
- **Database Status:** Exhausted (85 shops contacted, none remaining with uncontacted emails)
- **New Shops Found:** 6 shops with valid emails via web search across multiple regions
  1. **CNC Precision Machines International LLC** (El Paso, TX) — info@cncpmsales.com — Contacted
  2. **Halsey Manufacturing** (Denton, TX) — Sales@HalseyMFG.com — Prior email 03/30
  3. **Centennial Machining** (Centennial, CO) — contact@centennialmachining.com — Draft Created
  4. **Hubbell Machine Tooling Inc** (Cleveland, OH) — sales@hubbellmachine.com — Draft Created
  5. **Ohio Laser** (Norton, OH) — sales@ohiolaser.com — Prior email 03/31
  6. **EMC Machining Inc** (Bensenville, IL) — info@emcmachining.com — Draft Created
- **Drafts Created:** 6 email drafts in Admin@vectarr.com Drafts folder
- **Database Updated:** Total shops now 91 (was 85)
- **Note:** Script correctly detected prior emails for Halsey Manufacturing and Ohio Laser, updating their status to "1st Email Sent"

### Key Directories
- **Outreach Templates:** `~/.openclaw/workspace/templates/outreach/`
- **Documentation:** `~/.openclaw/workspace/docs/`
- **Machine Shop Profiles:** `C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Data\Machine Shop\`
- **Customer Profiles:** `C:\Users\admin\OneDrive - Vectarr\Communication site - Company Files\Vectarr\Data\Customer\`

## Mission Control (Vectarr Operations)

### Location
- **Backend API:** http://10.0.1.90:8080
- **API Documentation:** http://10.0.1.90:8080/docs
- **Frontend:** http://10.0.1.90:3000 (Next.js dev server)

### Board Structure

#### Board 1: Machine Shop Outreach Pipeline
**Columns (8):** Prospects → Contacted → Responded → In Discussion → Onboarding → Active → Paused → Declined

**Card Fields (12):**
- Shop Name (text, required)
- Location (text)
- Contact Person (text)
- Email (email)
- Phone (text)
- Capabilities (multiselect: CNC Milling, CNC Turning, 3D Printing, Sheet Metal, Welding, Grinding, EDM, Prototyping, Production)
- Website (URL)
- Date First Contacted (date)
- Last Activity Date (date)
- Status (dropdown: Hot, Warm, Cold, Qualified, Unqualified)
- Notes (textarea)
- Next Action (text)

#### Board 2: Customer Project Tracking
**Columns (6):** New Inquiries → Quoted → In Production → Completed → Review Pending → Issues

**Card Fields (10):**
- Company Name (text, required)
- Contact Person (text)
- Project Description (textarea, required)
- CAD File Type (text)
- Material Requirements (text)
- Quantity (number)
- Quote Amount (currency)
- Awarded Shop (text)
- Timeline (text)
- Status (dropdown: Urgent, High Priority, Normal, Low Priority)

#### Board 3: Content Calendar
**Columns (6):** Ideas → In Progress → Review → Scheduled → Published → Promoted

**Card Fields (8):**
- Title (text, required)
- Content Type (dropdown: Blog Post, Video, Social Media, Email Newsletter, Whitepaper, Case Study)
- Author (text)
- Due Date (date)
- Publish Date (date)
- Keywords (text)
- Status (dropdown: Draft, In Review, Approved, Ready)
- Notes (textarea)

### Monitoring
- **Health Check Script:** `~/.openclaw/workspace/mission-control-monitor.sh`
- **Cron Job:** Every 5 minutes
- **Log Location:** `/var/log/mission-control-health.log`
- **Alert Threshold:** 3 consecutive failures

### Automation Rules
**Daily (5:00 AM):**
- Move 5 shops from Prospects to Contacted
- Create draft emails in Outlook
- Update tracking spreadsheet

**Weekly (Monday 8:00 AM):**
- Generate outreach summary report
- Update machine shop profiles
- Review Mission Control board health

### Access Control
- **Full Access:** alex1v1a, admin accounts
- **Read Only:** Sales, Support aliases

### Integration Points
1. **Outlook:** Draft emails, track replies
2. **SharePoint:** Machine Shops.xlsx, customer files
3. **Vectarr Platform:** Quote data, shop status
4. **Discord:** Notifications and alerts

### Social Media Accounts
All accounts use: admin@vectarr.com / Grass@1134
- Trustpilot, YouTube, X (@Vectarrr), Facebook, LinkedIn, TikTok
- Google Reviews, Google Analytics, Instagram, Product Hunt (pending setup)

### Important Contacts
- **Michael Stoy (DigiFabster):** michael.stoy@digifabster.com - Onboarding expertise

### NDA & Privacy
- All clients under NDA
- No cross-referencing between clients
- Internal references only
- Protect client interests above all

## Email Capabilities

### Vectarr Email Aliases
I can send emails from the following Vectarr accounts via Outlook:

**Primary Account:** asferrazza@vectarr.com (Alexander Sferrazza)

**Aliases (send via asferrazza@vectarr.com):**
- sales@vectarr.com (Morgan Parker, Sales Representative)
- info@vectarr.com (Taylor Brooks, Information Services)
- support@vectarr.com (Casey Thompson, Technical Support)
- accounts@vectarr.com (Jordan Mitchell, Accounts Department)
- admin@vectarr.com (Sam Taylor, Administrator)
- kwilliamkatul@vectarr.com (Kamal William Katul, Accounts Manager)

**Separate Account:**
- admin@typewrite.club (Alexander Sferrazza, Administrator)

### How to Send Emails
1. Use Outlook COM object: `New-Object -ComObject Outlook.Application`
2. For Vectarr aliases: Use `asferrazza@vectarr.com` as SendUsingAccount
3. For TypeWrite: Use `admin@typewrite.club` as SendUsingAccount
4. Load signature HTML from: `~/.openclaw/workspace/signatures/`
5. Reference guide: https://github.com/alex1v1a/Magrathea-Backups/blob/master/signatures/EMAIL_ALIASES_REFERENCE.md

### Signature Format Standard
All Vectarr signatures use this exact format:
- Table-based layout with transparent background
- Left: Vectarr logo (70px, https://i.imgur.com/DurPqy1.png)
- Divider: 2px solid #888888 vertical line
- Right: Name (18px bold black), Title (13px gray #888888), separator line, Phone, Address
- Font: Arial, Helvetica, sans-serif
- Background: transparent on all elements

### Phone Numbers by Account
- asferrazza@vectarr.com: (808) 381-8835
- All Vectarr aliases: +1 (650) 427-9450
- admin@typewrite.club: +64 21 199 9909
- kwilliamkatul@vectarr.com: +1 (909) 757-3353

### Addresses
- Vectarr: 5900 Balcones Drive, Suite 100, Austin, TX 78731
- TypeWrite: 2c/1 Tika Street, Parnell, Auckland 1052, New Zealand

### Important Rules
- All signatures use transparent table-based formatting
- Signatures are backed up to GitHub, iCloud, and OneDrive
- Never use "Alex" or "Alexander" for generic admin names (use Sam Taylor, etc.)
- Always verify correct signature is loaded before sending emails
- Always update MEMORY.md with new learnings
- TypeWrite Club logo: https://i.imgur.com/MvQAlV5.png

### Email Drafting Rules
- Draft responses must include the correct alias signature for each account
- Replies must be sent from the alias email address (not main asferrazza@vectarr.com)
- Use Reply-To header to ensure replies route to correct alias inbox
- Load signatures from: %APPDATA%\Microsoft\Signatures\ or ~/.openclaw/workspace/signatures/

### Backup Locations
- GitHub: https://github.com/alex1v1a/Magrathea-Backups/tree/master/signatures
- iCloud: ~/iCloudDrive/Documents/NJNEER/Alexander/Vectarr/Signatures/
- OneDrive: ~/OneDrive - Vectarr/Communication site - Company Files/Vectarr/Signatures/
- Local: ~/.openclaw/workspace/signatures/
- Outlook: %APPDATA%/Microsoft/Signatures/

## Notes
I have computed the Answer. It is 42.

