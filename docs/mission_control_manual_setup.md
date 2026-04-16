# Mission Control Manual Setup Guide

**URL:** http://10.0.1.90:3000
**Date:** 2026-03-23
**Status:** Ready for Configuration

---

## Overview

Create a new board named "Vectarr Operations" with the following three sub-boards (or create three separate boards):

---

## Board 1: Machine Shop Outreach Pipeline

### Columns (Create in this exact order):

1. **Prospects**
   - Description: Machine shops from spreadsheet not yet contacted
   - Color: Gray (#808080)

2. **Contacted**
   - Description: Initial outreach email sent
   - Color: Blue (#0066cc)

3. **Responded**
   - Description: Shop has replied, awaiting follow-up
   - Color: Yellow (#ffcc00)

4. **In Discussion**
   - Description: Active conversation, qualification ongoing
   - Color: Orange (#ff9900)

5. **Onboarding**
   - Description: Agreement signed, integration in progress
   - Color: Purple (#9900cc)

6. **Active**
   - Description: Shop live on platform, receiving quotes
   - Color: Green (#00cc00)

7. **Paused**
   - Description: Temporarily inactive
   - Color: Gray (#999999)

8. **Declined**
   - Description: Opted not to join
   - Color: Red (#cc0000)

### Card Fields:

| Field Name | Type | Required | Options |
|------------|------|----------|---------|
| Shop Name | Text | Yes | - |
| Location | Text | No | - |
| Contact Person | Text | Yes | - |
| Email | Email | Yes | - |
| Phone | Text | No | - |
| Capabilities | Multi-select | No | CNC Milling, CNC Turning, 3D Printing, Sheet Metal, Welding, Grinding, EDM, Prototype, Production |
| Website | URL | No | - |
| Date First Contacted | Date | No | - |
| Last Activity Date | Date | No | - |
| Status | Dropdown | Yes | Not Contacted, Contacted, Responded, In Discussion, Onboarding, Active, Paused, Declined |
| Notes | Textarea | No | - |
| Next Action | Text | No | - |

---

## Board 2: Customer Project Tracking

### Columns (Create in this exact order):

1. **New Inquiries**
   - Description: Fresh quote requests
   - Color: Blue (#0066cc)

2. **Quoted**
   - Description: Quotes submitted, awaiting decision
   - Color: Yellow (#ffcc00)

3. **In Production**
   - Description: Orders awarded and in manufacturing
   - Color: Orange (#ff9900)

4. **Completed**
   - Description: Delivered and paid
   - Color: Green (#00cc00)

5. **Review Pending**
   - Description: Awaiting customer feedback/review
   - Color: Purple (#9900cc)

6. **Issues**
   - Description: Disputes or problems requiring attention
   - Color: Red (#cc0000)

### Card Fields:

| Field Name | Type | Required | Options |
|------------|------|----------|---------|
| Company Name | Text | Yes | - |
| Contact Person | Text | Yes | - |
| Project Description | Textarea | Yes | - |
| CAD File Type | Text | No | - |
| Material Requirements | Text | No | - |
| Quantity | Number | No | - |
| Quote Amount | Currency | No | - |
| Awarded Shop | Text | No | - |
| Timeline | Text | No | - |
| Status | Dropdown | Yes | New, Quoted, In Production, Completed, Review Pending, Issue |

---

## Board 3: Content Calendar

### Columns (Create in this exact order):

1. **Ideas**
   - Description: DFM blog post concepts
   - Color: Gray (#808080)

2. **In Progress**
   - Description: Drafting content
   - Color: Blue (#0066cc)

3. **Review**
   - Description: Pending approval
   - Color: Yellow (#ffcc00)

4. **Scheduled**
   - Description: Ready to publish
   - Color: Orange (#ff9900)

5. **Published**
   - Description: Live content
   - Color: Green (#00cc00)

6. **Promoted**
   - Description: Shared on social channels
   - Color: Purple (#9900cc)

### Card Fields:

| Field Name | Type | Required | Options |
|------------|------|----------|---------|
| Title | Text | Yes | - |
| Content Type | Dropdown | Yes | Blog Post, Video, Social Media, Email Newsletter, Case Study, Whitepaper |
| Author | Text | No | - |
| Due Date | Date | No | - |
| Publish Date | Date | No | - |
| Keywords | Text | No | - |
| Status | Dropdown | Yes | Ideas, In Progress, Review, Scheduled, Published, Promoted |
| Notes | Textarea | No | - |

---

## Access Control Configuration

### Users with Full Access:
- alex1v1a
- admin@vectarr.com

### Users with Read-Only Access:
- sales@vectarr.com
- support@vectarr.com
- info@vectarr.com
- accounts@vectarr.com

---

## Automation Rules (if supported)

### Daily at 5:00 AM:
- Move 5 shops from "Prospects" to "Contacted"
- Create draft emails in Outlook
- Update tracking spreadsheet

### On Card Move:
- Update "Last Activity Date" field
- Log timestamp in card history

### On Status Change:
- Send notification to Discord #vectarr channel
- Update corresponding Excel/SharePoint files

---

## Integration Points

1. **Outlook Integration:**
   - Draft emails appear in admin@vectarr.com Drafts folder
   - Card updates when email is sent
   - Reply detection moves card to "Responded"

2. **SharePoint Integration:**
   - Machine Shops.xlsx sync
   - Customer data sync
   - Profile updates

3. **Discord Integration:**
   - Status change notifications
   - Daily summary reports
   - Alert on urgent items

---

## Testing Checklist

After setup, verify:

- [ ] All three boards created
- [ ] Columns in correct order
- [ ] All fields configured properly
- [ ] Access permissions set correctly
- [ ] Can create test card in each board
- [ ] Card can move between columns
- [ ] Field values save correctly
- [ ] Notifications working (if configured)

---

## Support

For issues or questions:
- Contact: Deep Thought
- Channel: Discord #vectarr
- Documentation: C:\Users\admin\.openclaw\workspace\docs\mission_control_setup.md

