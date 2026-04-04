# Paper Trail Limited Website

A multi-page static website for **Paper Trail Limited**, a New Zealand-based mobile app development company. The site showcases the company and its applications under a unified brand umbrella.

[![Azure Static Web Apps](https://img.shields.io/badge/Azure-Static%20Web%20Apps-blue?logo=microsoftazure)](https://azure.microsoft.com/services/app-service/static/)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-black?logo=github)](https://github.com/features/actions)

---

## 📁 Project Structure

```
paper-trail-website/
├── index.html                    # Home page - Company overview
├── staticwebapp.config.json      # Azure Static Web App configuration
├── README.md                     # This file
│
├── css/
│   └── main.css                  # Global styles and design system
│
├── js/
│   └── main.js                   # Global JavaScript functionality
│
├── assets/                       # Images and media files
│   ├── typewriter.png            # Home page hero image
│   ├── reel-reviews-poster.png   # Reel Reviews promotional poster
│   └── reel-reviews-ui.png       # Reel Reviews app mockup
│
├── apps/
│   ├── reel-reviews/             # Reel Reviews app page
│   │   ├── index.html
│   │   ├── reel-reviews.css      # Comic book/fishing theme styles
│   │   └── reel-reviews.js       # App-specific interactivity
│   │
│   └── coming-soon/              # Second app teaser page
│       ├── index.html
│       ├── coming-soon.css       # Futuristic/dark theme styles
│       └── coming-soon.js
│
└── .github/
    └── workflows/
        └── azure-static-web-apps.yml  # Auto-deployment workflow
```

---

## 🌐 Domains

| Domain | Purpose | Status |
|--------|---------|--------|
| **typewrite.club** | Main company website | 🟢 Primary |
| **reelreviews.club** | Redirects to Reel Reviews page | 🟡 Redirect |

---

## 🚀 Quick Start

### Local Development

Since this is a static website, no build process is required. Simply open the files in a browser:

```bash
# Navigate to the project folder
cd paper-trail-website

# Option 1: Open directly in browser
start index.html          # Windows
open index.html           # macOS
xdg-open index.html       # Linux

# Option 2: Use a local server (recommended)
# Python 3
python -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# Then visit: http://localhost:8000
```

### Making Changes

1. Edit HTML files for content changes
2. Edit CSS files for styling changes
3. Edit JS files for functionality changes
4. Test locally before deploying
5. Push to GitHub for automatic deployment

---

## 🎨 Design System

### Global Styles (`css/main.css`)

**Colors:**
- `--color-primary`: #1a1a2e (Deep Navy) - Brand color
- `--color-secondary`: #f5f5dc (Warm Cream) - Background
- `--color-accent`: #c41e3a (Vintage Red) - CTAs
- `--color-gold`: #d4af37 (Gold) - Highlights

**Typography:**
- Headings: Georgia, serif (classic typewriter feel)
- Body: System fonts (modern, fast-loading)

**Spacing:**
- Based on 8px grid system
- Sections: 80px-120px vertical padding
- Components: 16px-32px internal spacing

### App-Specific Themes

#### Reel Reviews (`apps/reel-reviews/`)
**Theme:** Vintage Comic Book + Fishing

**Colors:**
- Primary Red: #e63946
- Ocean Blue: #1d3557
- Sunny Yellow: #ffd60a

**Fonts:**
- Headlines: 'Bangers' (comic book style)
- Body: 'Comic Neue' (readable comic text)

**Features:**
- Halftone pattern overlays
- Comic action words (POW!, ZAP!, BAM!)
- Fishing metaphor throughout
- Glitch and bounce animations

#### Coming Soon (`apps/coming-soon/`)
**Theme:** Futuristic / Cyberpunk / Mysterious

**Colors:**
- Deep Space: #0a0a0f
- Neon Purple: #a855f7
- Neon Cyan: #06b6d4

**Fonts:**
- 'Space Grotesk' (modern tech feel)

**Features:**
- Animated grid background
- Floating particles
- Glitch text effects
- Dark mode only

---

## 🔧 Maintenance Guide

### Adding a New App Page

1. **Create the folder:**
   ```
   mkdir apps/your-app-name
   ```

2. **Create base files:**
   ```
   apps/your-app-name/
   ├── index.html      # Main page
   ├── your-app.css    # Styles
   └── your-app.js     # Scripts
   ```

3. **Use this template for `index.html`:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Your App | Paper Trail Limited</title>
       <link rel="stylesheet" href="../../css/main.css">
       <link rel="stylesheet" href="your-app.css">
   </head>
   <body class="your-app-page">
       <!-- Copy navigation from existing app page -->
       <header class="site-header">...</header>
       
       <main>
           <!-- Your content here -->
       </main>
       
       <footer class="site-footer">...</footer>
       
       <script src="../../js/main.js"></script>
       <script src="your-app.js"></script>
   </body>
   </html>
   ```

4. **Add to navigation:**
   Update all `nav-links` sections in every HTML file to include the new page.

5. **Update Azure config:**
   Add a route in `staticwebapp.config.json`:
   ```json
   {
     "route": "/apps/your-app-name",
     "rewrite": "/apps/your-app-name/index.html"
   }
   ```

### Updating Content

#### Company Information
Edit `index.html` in the root folder:
- Hero section: Lines 60-90
- About section: Lines 95-125
- Apps section: Lines 130-180

#### Reel Reviews Content
Edit `apps/reel-reviews/index.html`:
- Hero: Lines 35-70
- Features: Lines 120-150
- Download CTA: Lines 155-180

#### Images
Place new images in `assets/` folder and update references:
```html
<img src="../../assets/your-image.png" alt="Description">
```

### Styling Changes

#### Global Changes
Edit `css/main.css`:
- CSS variables (lines 15-60) for colors, fonts, spacing
- Component styles organized by section

#### App-Specific Changes
Edit the respective CSS file in `apps/[app-name]/`

### Adding New Sections

1. Add HTML in the appropriate file
2. Add styles in the corresponding CSS file
3. Use BEM naming convention: `.section-name__element--modifier`
4. Test responsive behavior at 320px, 768px, and 1024px+ widths

---

## 🚀 Deployment

### Automatic Deployment (Recommended)

The site deploys automatically when you push to the `main` branch:

```bash
git add .
git commit -m "Update: Description of changes"
git push origin main
```

GitHub Actions will build and deploy to Azure Static Web Apps.

### Manual Deployment

If you need to deploy manually:

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Login to Azure
az login

# Deploy (run from project root)
swa deploy --env production
```

### Checking Deployment Status

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: Resource groups → PaperTrail → PaperTrail Static Web App
3. Click "Deployments" to see deployment history
4. Click "Overview" to see the site URL

---

## 📊 Analytics & Monitoring

### Azure Monitor
- Visit the Static Web App in Azure Portal
- Click "Monitoring" → "Application Insights" (if configured)

### GitHub Actions Logs
- Go to your GitHub repository
- Click "Actions" tab
- View workflow runs and logs

---

## 🔒 Security

### Content Security Policy
Configured in `staticwebapp.config.json`:
- Only allows resources from same origin
- External fonts loaded from Google Fonts
- No inline scripts allowed (except our own)

### HTTPS
Azure Static Web Apps automatically enforces HTTPS.

### Headers
Security headers configured:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Limits referrer info

---

## 🐛 Troubleshooting

### Site Not Updating
1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
2. Check GitHub Actions for build errors
3. Verify `staticwebapp.config.json` syntax

### Images Not Loading
1. Check image paths are correct (relative paths)
2. Verify images are in the `assets/` folder
3. Check file extensions match (.png vs .jpg)

### Styles Not Applying
1. Check CSS file paths in HTML
2. Verify no syntax errors in CSS
3. Use browser DevTools to inspect elements

### 404 Errors
1. Check routes in `staticwebapp.config.json`
2. Verify file names match exactly (case-sensitive)
3. Ensure `index.html` exists in each folder

---

## 📞 Support

### Resources
- [Azure Static Web Apps Docs](https://docs.microsoft.com/azure/static-web-apps/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [MDN Web Docs](https://developer.mozilla.org/)

### Contact
- **Company:** Paper Trail Limited
- **Location:** New Zealand
- **Domain:** typewrite.club

---

## 📝 Changelog

### v1.0.0 (2024-03-XX)
- Initial website launch
- Home page with company overview
- Reel Reviews app page (comic/fishing theme)
- Coming Soon teaser page (futuristic theme)
- Azure Static Web Apps deployment
- GitHub Actions CI/CD

---

## 🏗️ Architecture Decisions

### Why Static Site?
- **Fast:** No server-side rendering delays
- **Secure:** No server to hack
- **Cheap:** Free hosting on Azure
- **Scalable:** CDN handles traffic automatically
- **Simple:** Easy to maintain

### Why No Build Step?
- Faster development iteration
- No dependencies to manage
- Easier for non-technical maintainers
- Works out of the box

### Why Separate CSS per App?
- Each app has distinct branding
- Smaller CSS files to download
- Easier to maintain individual themes
- Prevents style conflicts

---

## 🎯 Future Enhancements

Potential improvements for future versions:

- [ ] Blog section for company updates
- [ ] Team member profiles
- [ ] Contact form integration
- [ ] Newsletter signup (backend needed)
- [ ] Multi-language support
- [ ] Dark mode toggle for main site
- [ ] Performance optimizations (image lazy loading, etc.)

---

**Last Updated:** March 2024  
**Maintained by:** Paper Trail Limited
