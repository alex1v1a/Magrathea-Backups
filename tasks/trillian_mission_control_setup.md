# Mission Control Setup Task - Assigned to Trillian

**Assigned:** 2026-03-23
**Priority:** High
**Status:** Pending

---

## Objective
Set up Marvin's Mission Control board at http://10.0.1.90:3000 for Vectarr machine shop outreach and customer management tracking.

---

## Board Structure

### Board 1: Machine Shop Outreach Pipeline

**Columns (in order):**
1. **Prospects** - Machine shops from spreadsheet not yet contacted
2. **Contacted** - Initial outreach email sent
3. **Responded** - Shop has replied, awaiting follow-up
3. **In Discussion** - Active conversation, qualification ongoing
4. **Onboarding** - Agreement signed, integration in progress
5. **Active** - Shop live on platform, receiving quotes
6. **Paused** - Temporarily inactive
7. **Declined** - Opted not to join

**Card Fields:**
- Shop Name (text)
- Location (text)
- Contact Person (text)
- Email (email)
- Phone (text)
- Capabilities (multi-select: CNC, materials, specialties)
- Website (URL)
- Date First Contacted (date)
- Last Activity Date (date)
- Status (dropdown)
- Notes (textarea)
- Next Action (text)

---

### Board 2: Customer Project Tracking

**Columns (in order):**
1. **New Inquiries** - Fresh quote requests
2. **Quoted** - Quotes submitted, awaiting decision
3. **In Production** - Orders awarded and in manufacturing
4. **Completed** - Delivered and paid
5. **Review Pending** - Awaiting customer feedback/review
6. **Issues** - Disputes or problems requiring attention

**Card Fields:**
- Company Name (text)
- Contact Person (text)
- Project Description (textarea)
- CAD File Type (text)
- Material Requirements (text)
- Quantity (number)
- Quote Amount (currency)
- Awarded Shop (text)
- Timeline (text)
- Status (dropdown)

---

### Board 3: Content Calendar

**Columns (in order):**
1. **Ideas** - DFM blog post concepts
2. **In Progress** - Drafting content
3. **Review** - Pending approval
4. **Scheduled** - Ready to publish
5. **Published** - Live content
6. **Promoted** - Shared on social channels

**Card Fields:**
- Title (text)
- Content Type (dropdown: Blog, Video, Social, Email)
- Author (text)
- Due Date (date)
- Publish Date (date)
- Keywords (text)
- Status (dropdown)
- Notes (textarea)

---

## Access Control

- **Full Access:** alex1v1a, admin accounts
- **Read Only:** Sales, Support aliases (for reference)

---

## Integration Points

1. **Outlook:** Draft emails, track replies
2. **SharePoint:** Machine Shops.xlsx, customer files
3. **Vectarr Platform:** Quote data, shop status
4. **Discord:** Notifications and alerts

---

## Automation Rules to Configure

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

## Completion Checklist

- [ ] Board 1: Machine Shop Outreach Pipeline created
- [ ] Board 2: Customer Project Tracking created
- [ ] Board 3: Content Calendar created
- [ ] All columns configured in correct order
- [ ] All card fields added with proper types
- [ ] Access permissions set
- [ ] Test card created in each board
- [ ] URL confirmed working: http://10.0.1.90:3000

---

## Notes

- Board should be named "Vectarr Operations" or similar
- Use Vectarr branding colors if available
- Ensure mobile responsiveness
- Set up email notifications for status changes

