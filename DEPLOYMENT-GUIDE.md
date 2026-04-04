# Paper Trail Website - Deployment Guide

## Quick Reference

| Item | Value |
|------|-------|
| **Website URL** | https://www.typewrite.club |
| **Repository** | https://github.com/PaperTrail9/Site |
| **Local Workspace** | C:/Users/Admin/.openclaw/workspace/site-temp |
| **Deployment Method** | Git push to GitHub → Azure Static Web Apps |

---

## GitHub Access

### Repository URL
```
https://github.com/PaperTrail9/Site
```

### GitHub Token (PaperTrail9 Account)
**Token:** `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`

**Stored in:** Bitwarden (admin@typewrite.club account)

### Local Git Remote Configuration
```bash
cd C:/Users/Admin/.openclaw/workspace/site-temp
git remote -v
# Should show:
# origin  https://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@github.com/PaperTrail9/Site.git
```

---

## Azure Resources

### Static Web App
| Property | Value |
|----------|-------|
| **Name** | typewrite-club |
| **Resource Group** | PaperTrail |
| **Default Hostname** | icy-ocean-037156610.2.azurestaticapps.net |
| **Custom Domain** | typewrite.club, www.typewrite.club |

### Azure Service Principal (For Automation)
| Property | Value |
|----------|-------|
| **Name** | MarvinAutomation |
| **App ID** | 4237e822-2ace-4658-a547-42c397726e28 |
| **Tenant** | d20b46f6-7cc8-430b-9d1d-06fe1d4a8624 |
| **Subscription** | b343f1e2-702a-4483-90a0-a7123bc8e4de |
| **Password** | WnE8Q~WD~qbSAWK-mKMD5Ux1IQRho1uejTMmVa_J |

**Stored in:** Bitwarden

---

## Deployment Steps

### 1. Navigate to Workspace
```powershell
cd C:/Users/Admin/.openclaw/workspace/site-temp
```

### 2. Make Edits
Edit files directly in the workspace:
- `index.html` - Homepage
- `cartwheel.html` - Cartwheel app page
- `contact.html` - Contact page
- `blog/index.html` - Blog listing
- `blog/posts/*.html` - Individual blog posts
- `reel-reviews/index.html` - Reel Reviews page
- `terms-of-service.html` - Terms page
- `privacy-policy.html` - Privacy page
- `css/styles.css` - Global styles

### 3. Stage Changes
```powershell
git add -A
```

### 4. Commit Changes
```powershell
git commit -m "Description of changes"
```

### 5. Push to GitHub
```powershell
git push origin master:main
```

### 6. Verify Deployment
- Check GitHub Actions: https://github.com/PaperTrail9/Site/actions
- Wait for green checkmark (usually 1-2 minutes)
- Visit https://www.typewrite.club to verify

---

## File Structure

```
site-temp/
├── index.html              # Homepage (company landing)
├── cartwheel.html          # Cartwheel app page
├── contact.html            # Contact page
├── terms-of-service.html   # Terms of Service
├── privacy-policy.html     # Privacy Policy
├── staticwebapp.config.json # Azure SWA config
├── README.md               # Project documentation
├── DEVELOPMENT.md          # Developer guide
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   └── main.js             # Main JavaScript
├── assets/
│   ├── images/             # Site images
│   │   ├── reel-reviews-poster.png
│   │   ├── reel-reviews-mobile.png
│   │   └── typewriter.png
│   └── blog/               # Blog post images
│       ├── featured-post.jpg
│       ├── tech-post.jpg
│       ├── startup-post.jpg
│       ├── startup-post-2.jpg
│       ├── nz-post.jpg
│       ├── nz-gaming-post.jpg
│       ├── behind-post.jpg
│       └── app-dev-post.jpg
├── blog/
│   ├── index.html          # Blog listing page
│   └── posts/              # Individual blog posts
│       ├── building-reel-reviews.html
│       ├── react-native-vs-flutter.html
│       ├── day-in-life.html
│       ├── validating-ideas.html
│       ├── ai-in-mobile-apps.html
│       ├── nz-tech-scene.html
│       ├── app-store-optimization.html
│       ├── startup-funding-nz.html
│       ├── customer-story.html
│       └── nz-gaming-industry-2024.html
└── reel-reviews/
    └── index.html          # Reel Reviews app page
```

---

## Common Edits

### Update Navigation (All Pages)
Navigation is in each HTML file:
```html
<nav class="main-nav" id="main-nav" aria-label="Main navigation">
  <ul class="nav-list">
    <li><a href="/" class="nav-link">Home</a></li>
    <li><a href="/blog/" class="nav-link">Blog</a></li>
    <li><a href="/reel-reviews/" class="nav-link">Reel Reviews</a></li>
    <li><a href="/cartwheel.html" class="nav-link">Cartwheel</a></li>
    <li><a href="/contact.html" class="nav-link">Contact</a></li>
  </ul>
</nav>
```

### Update Team Section (index.html)
```html
<div class="team-grid">
  <div class="team-card">
    <div class="team-avatar" style="background: url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face') center/cover no-repeat;"></div>
    <h3>Alexander</h3>
    <p>Founder & Designer</p>
  </div>
  <div class="team-card">
    <div class="team-avatar" style="background: url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face') center/cover no-repeat;"></div>
    <h3>Bo</h3>
    <p>Founder & Lead Developer</p>
  </div>
</div>
```

### Update App Cards (index.html)
```html
<!-- Reel Reviews -->
<a href="/reel-reviews/" class="app-card">
  <div class="app-card-image">
    <img src="/assets/images/reel-reviews-poster.png" alt="Reel Reviews App" style="width: 100%; height: 100%; object-fit: cover;">
  </div>
  ...
</a>

<!-- Cartwheel -->
<a href="/cartwheel.html" class="app-card">
  <div class="app-card-image cartwheel" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #2d1b4e 0%, #4a1c6b 50%, #7c3aed 100%);">
    <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop" alt="Cartwheel Grocery Delivery" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.9;">
  </div>
  ...
</a>
```

### Update Blog Post Images
In `blog/index.html`:
```html
<div class="blog-card-image" style="background: url('/assets/blog/featured-post.jpg') center/cover no-repeat;"></div>
```

Or use Unsplash:
```html
<div class="blog-card-image" style="background: url('https://images.unsplash.com/photo-XXXXX?w=600&h=400&fit=crop') center/cover no-repeat;"></div>
```

---

## External Image Sources

### Unsplash (Free)
Format: `https://images.unsplash.com/photo-{ID}?w={width}&h={height}&fit=crop`

Examples:
- Grocery: `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop`
- Person 1: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face`
- Person 2: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face`

### Placehold.co (Placeholder)
Format: `https://placehold.co/{width}x{height}/{bg-color}/{text-color}?text={text}`

Example:
- `https://placehold.co/600x400/1a1a2e/ffffff?text=Cartwheel`

---

## Troubleshooting

### Deployment Not Showing
1. Clear browser cache (Ctrl+Shift+R)
2. Check GitHub Actions: https://github.com/PaperTrail9/Site/actions
3. Verify push succeeded: `git log origin/main --oneline -3`

### Git Push Fails
```powershell
# Check remote
git remote -v

# If needed, reset remote
git remote set-url origin https://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@github.com/PaperTrail9/Site.git
```

### Mobile Issues
- Check `overflow-x: hidden` on body
- Verify `@media (max-width: 768px)` queries
- Test with browser dev tools mobile view

---

## DNS/Domain (GoDaddy)

**Domain:** typewrite.club

**DNS Records:**
- TXT: `_km216g3ag79yqaakvtzwe38kzbrhdgn` → Azure validation token
- CNAME: `www` → `icy-ocean-037156610.2.azurestaticapps.net`

**GoDaddy API:**
- Key: `9EJXBhiXnAM_34HiY5MpRkiwJFbPYFeuf3`
- Secret: `VA3ppzn7rZUvFMs4ea2pEZ`

---

## Contact Information

**Team:**
- Alexander: Founder & Designer
- Bo: Founder & Lead Developer

**Support:**
- Email: admin@typewrite.club
- Phone: +1 (650) 427-9450

---

## Last Updated
2026-03-30

**File Location:** `C:/Users/Admin/.openclaw/workspace/DEPLOYMENT-GUIDE.md`
