# Marvin's Mission Control - Vectarr Board Setup

**Board URL:** http://10.0.1.90:3000
**Purpose:** Track machine shop outreach, onboarding, and customer management

---

## Board Structure

### 1. Machine Shop Outreach Pipeline

| Column | Description |
|--------|-------------|
| **Prospects** | Machine shops from spreadsheet not yet contacted |
| **Contacted** | Initial outreach email sent |
| **Responded** | Shop has replied, awaiting follow-up |
| **In Discussion** | Active conversation, qualification ongoing |
| **Onboarding** | Agreement signed, integration in progress |
| **Active** | Shop live on platform, receiving quotes |
| **Paused** | Temporarily inactive |
| **Declined** | Opted not to join |

### 2. Customer Project Tracking

| Column | Description |
|--------|-------------|
| **New Inquiries** | Fresh quote requests |
| **Quoted** | Quotes submitted, awaiting decision |
| **In Production** | Orders awarded and in manufacturing |
| **Completed** | Delivered and paid |
| **Review Pending** | Awaiting customer feedback/review |
| **Issues** | Disputes or problems requiring attention |

### 3. Content Calendar

| Column | Description |
|--------|-------------|
| **Ideas** | DFM blog post concepts |
| **In Progress** | Drafting content |
| **Review** | Pending approval |
| **Scheduled** | Ready to publish |
| **Published** | Live content |
| **Promoted** | Shared on social channels |

---

## Automation Rules

### Daily (5:00 AM)
- Move 5 shops from "Prospects" to "Contacted"
- Create draft emails in Outlook
- Update tracking spreadsheet

### Continuous
- Monitor email replies
- Move responded shops to "Responded" column
- Draft reply emails for review

### Weekly (Monday 8:00 AM)
- Generate outreach summary report
- Update machine shop profiles
- Review Mission Control board health

---

## Data Fields

### Machine Shop Card Fields
- Shop Name
- Location
- Contact Person
- Email
- Phone
- Capabilities (CNC, materials, specialties)
- Website
- Date First Contacted
- Last Activity Date
- Status
- Notes
- Next Action

### Customer Card Fields
- Company Name
- Contact Person
- Project Description
- CAD File Type
- Material Requirements
- Quantity
- Quote Amount
- Awarded Shop
- Timeline
- Status

---

## Integration Points

1. **Outlook:** Draft emails, track replies
2. **SharePoint:** Machine Shops.xlsx, customer files
3. **Vectarr Platform:** Quote data, shop status
4. **Discord:** Notifications and alerts

---

## Access Control

- **Full Access:** alex1v1a, admin accounts
- **Read Only:** Sales, Support aliases (for reference)

