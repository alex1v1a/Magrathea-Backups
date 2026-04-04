# Paper Trail Website - Complete Project Summary
**Date:** March 13, 2026  
**Status:** ✅ COMPLETE & DEPLOYED

---

## 🌐 LIVE WEBSITE
**URL:** https://gentle-pebble-0d0893d10.6.azurestaticapps.net  
**Domains:**
- www.typewrite.club (main)
- www.reelreviews.club (redirects to Reel Reviews)

---

## 📄 PAGES BUILT

| Page | File | Description |
|------|------|-------------|
| **Home** | `index.html` | Modern landing page with app showcase, newsletter signup |
| **Reel Reviews** | `apps/reel-reviews/index.html` | Comic/fishing themed app page with vintage aesthetic |
| **Coming Soon** | `apps/coming-soon/index.html` | Cyberpunk teaser for Project Cartwheel |
| **Blog** | `blog/index.html` | Professional blog with featured posts, categories, sidebar |
| **Contact** | `contact.html` | Contact form, business info, map, support links |
| **Privacy Policy** | `privacy-policy.html` | Apple-compliant privacy policy (GDPR/CCPA) |
| **Terms of Service** | `terms-of-service.html` | Legal terms with DMCA section |

---

## 🎨 DESIGN SYSTEM

**Style:** Modern, clean (inspired by Apple, Stripe, Linear, Vercel)  
**Colors:**
- Primary: Deep slate (#0f172a)
- Accent: Vibrant red (#dc2626)
- Background: Clean white with subtle grays

**Typography:**
- Headings: SF Pro Display / system fonts
- Body: Inter / system sans-serif

**Features:**
- ✅ Dark mode support (prefers-color-scheme)
- ✅ Mobile-responsive (hamburger menu)
- ✅ Custom SVG logo (document + pen icon)
- ✅ Smooth animations and transitions
- ✅ Glassmorphism header (blur backdrop)

---

## 🏢 BUSINESS INFORMATION

**Company:** Paper Trail Limited  
**Location:** New Zealand  
**Address:** 1 Tika Street, Parnell, Auckland 1052, New Zealand  
**Email:** admin@typewrite.club  
**Phone:** +1 (650) 427-9450

---

## 🔧 TECHNICAL DETAILS

**Hosting:** Azure Static Web Apps  
**Resource Group:** PaperTrail  
**Static Web App Name:** PaperTrail  
**GitHub Repo:** PaperTrail9/Website  
**DNS:** GoDaddy (typewrite.club, reelreviews.club)

**Automation:**
- Daily backups at 1:00 AM (30-day retention)
- Backup script: `scripts/backup-system.js`
- Rollback capability to any previous version

**Security:**
- HTTPS enforced
- Content Security Policy configured
- Privacy Policy & Terms of Service (Apple Developer compliant)

---

## 📁 FILE STRUCTURE

```
paper-trail-website/
├── index.html                    # Homepage (modern design)
├── privacy-policy.html           # Privacy Policy
├── terms-of-service.html         # Terms of Service
├── contact.html                  # Contact page
├── staticwebapp.config.json      # Azure configuration
├── css/
│   ├── modern.css               # Main design system
│   ├── modern-components.css    # Component styles
│   ├── legal.css                # Legal page styles
│   ├── contact.css              # Contact page styles
│   ├── blog-v2.css              # Blog styles
│   └── reel-reviews.css         # App-specific styles
├── js/
│   └── main.js                  # Main JavaScript (mobile nav, etc)
├── assets/
│   ├── logo.svg                 # Custom SVG logo
│   ├── typewriter.png           # Hero image
│   ├── reel-reviews-poster.png  # App poster
│   └── reel-reviews-ui.png      # App mockup
├── apps/
│   ├── reel-reviews/
│   │   └── index.html
│   └── coming-soon/
│       └── index.html
├── blog/
│   ├── index.html
│   └── posts/
└── scripts/
    ├── backup-system.js         # Backup/rollback system
    └── setup-backup.ps1         # Backup scheduler
```

---

## ✅ APPLE DEVELOPER COMPLIANCE

| Requirement | Status |
|-------------|--------|
| Privacy Policy | ✅ Complete |
| Terms of Service | ✅ Complete |
| Contact Information | ✅ Email, phone, address |
| Physical Address | ✅ Listed in footer |
| DMCA/Copyright | ✅ In Terms of Service |
| Data Collection Disclosure | ✅ In Privacy Policy |

---

## 🚀 DEPLOYMENT INFO

**Deployment Token:** `b504b07db5e59e1bfb3a463ebcd5d14280bedb6d344b63fcd09dba30db676c2a06-bf41dacc-405e-4542-9a18-818c148af49701019170d0893d10`

**To deploy updates:**
```powershell
cd paper-trail-website
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
swa deploy --deployment-token <token> --env production
```

---

## 🔙 ROLLBACK INSTRUCTIONS

If something breaks:
```powershell
cd paper-trail-website
node scripts/backup-system.js list          # See available backups
node scripts/backup-system.js rollback <name>  # Restore to backup
```

---

## 📝 NOTES

- All code heavily commented for maintainability
- Mobile-first responsive design
- Accessibility features (ARIA labels, focus states, reduced motion support)
- Blog automation PAUSED (can be re-enabled via Task Scheduler)
- Images use existing assets as placeholders

**Last Updated:** March 13, 2026
