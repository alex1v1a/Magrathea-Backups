# Mission Control Board Setup Task for Vectarr Operations

**Assigned to:** Trillian
**Location:** http://10.0.1.90:3000 (Marvin's Mission Control)
**Status:** In Progress

## Overview
Set up 3 kanban-style boards for Vectarr operations management.

---

## Board 1: Machine Shop Outreach Pipeline

**Purpose:** Track machine shop onboarding status

**Columns (8):**
1. Prospects
2. Contacted
3. Responded
4. In Discussion
5. Onboarding
6. Active
7. Paused
8. Declined

**Card Fields:**
- Shop Name
- Contact Person
- Email
- Phone
- Location
- Capabilities (CNC, 3D Printing, etc.)
- Notes
- Last Contact Date
- Next Action

---

## Board 2: Customer Project Tracking

**Purpose:** Track customer projects through production

**Columns (6):**
1. New Inquiries
2. Quoted
3. In Production
4. Completed
5. Review Pending
6. Issues

**Card Fields:**
- Customer Name
- Project Title
- Description
- Quote Amount
- Assigned Shop
- Start Date
- Due Date
- Status
- Notes

---

## Board 3: Content Calendar

**Purpose:** Track DFM (Design for Manufacturing) content creation

**Columns (6):**
1. Ideas
2. In Progress
3. Review
4. Scheduled
5. Published
6. Promoted

**Card Fields:**
- Content Title
- Type (Blog, Video, Guide, etc.)
- Author
- Target Publish Date
- Keywords
- Notes
- URL (when published)

---

## Technical Notes

- Mission Control backend runs on port 8080 (API)
- Frontend should run on port 3000
- API endpoint: http://10.0.1.90:8080
- Use SQLite database for board data
- Boards should persist across restarts

## Acceptance Criteria

- [ ] All 3 boards created with correct columns
- [ ] Card fields configured for each board
- [ ] Can create, move, and delete cards
- [ ] Data persists after restart
- [ ] Accessible at http://10.0.1.90:3000
