# TYPEWRITE.CLUB - Cross-Channel Deployment Guide

## FOR: Any Marvin Instance / Subagent

---

## ⚡ QUICK START (Copy-Paste Ready)

### Step 1: Navigate to Workspace
```powershell
cd C:/Users/Admin/.openclaw/workspace/site-temp
```

### Step 2: Check Git Status
```powershell
git status
```

### Step 3: If Changes Exist, Commit
```powershell
git add -A
git commit -m "Description of changes"
```

### Step 4: Push to Deploy
```powershell
git push origin master:main
```

**If push fails with auth error → See TROUBLESHOOTING section below**

---

## 🔑 AUTHENTICATION METHODS (In Order of Preference)

### Method 1: PAT in Remote URL (Current Method)

**Check current remote:**
```powershell
git remote -v
```

**Expected output:**
```
origin  https://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@github.com/PaperTrail9/Site.git (fetch)
origin  https://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@github.com/PaperTrail9/Site.git (push)
```

**If PAT is missing/expired, set it:**
```powershell
git remote set-url origin https://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@github.com/PaperTrail9/Site.git
```

### Method 2: GitHub CLI (gh)

**Check if installed:**
```powershell
gh --version
```

**If not installed, download from:** https://cli.github.com/

**Authenticate:**
```powershell
gh auth login
# Follow prompts: HTTPS → Paste token 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
```

**Then push normally:**
```powershell
git push origin master:main
```

### Method 3: Manual Token Entry

**If remote URL doesn't have token:**
```powershell
git remote set-url origin https://github.com/PaperTrail9/Site.git
```

**Push with token prompt:**
```powershell
git push origin master:main
# When prompted for password, enter: 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
```

---

## 📋 DETAILED DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Navigate to `C:/Users/Admin/.openclaw/workspace/site-temp`
- [ ] Run `git status` to check for uncommitted changes
- [ ] Run `git log --oneline -3` to see recent commits
- [ ] Run `git branch` to confirm on `master` branch

### Making Changes
- [ ] Edit files using `write`, `edit`, or `read` tools
- [ ] Test changes locally (if possible)
- [ ] Run `git diff` to review changes

### Committing
- [ ] Run `git add -A` to stage all changes
- [ ] Run `git commit -m "Descriptive message"`
- [ ] Run `git log --oneline -1` to verify commit

### Pushing
- [ ] Run `git push origin master:main`
- [ ] If auth fails, see TROUBLESHOOTING
- [ ] Verify push with `git log origin/main --oneline -3`

### Verification
- [ ] Check GitHub Actions: https://github.com/PaperTrail9/Site/actions
- [ ] Wait for green checkmark (1-2 minutes)
- [ ] Visit https://www.typewrite.club
- [ ] Hard refresh: Ctrl+Shift+R

---

## 🔧 TROUBLESHOOTING

### "Authentication Failed" or "403 Forbidden"

**Option A: Token Expired**
1. Get new token from Bitwarden (admin@typewrite.club)
2. Update remote URL:
   ```powershell
   git remote set-url origin https://NEW_TOKEN@github.com/PaperTrail9/Site.git
   ```

**Option B: Use GitHub CLI**
1. Install gh CLI
2. Run `gh auth login`
3. Use token: `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`

**Option C: SSH Key (if configured)**
```powershell
git remote set-url origin git@github.com:PaperTrail9/Site.git
git push origin master:main
```

### "Repository Not Found"
```powershell
# Verify remote exists
git remote -v

# Add if missing
git remote add origin https://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@github.com/PaperTrail9/Site.git
```

### "Everything up-to-date" but no deployment
1. Check GitHub Actions: https://github.com/PaperTrail9/Site/actions
2. Look for failed workflows
3. Check if on correct branch (should push to `main`)

### "LF will be replaced by CRLF" Warning
This is normal on Windows. Safe to ignore.

---

## 🗂️ FILE LOCATIONS (CRITICAL)

### Main Workspace
```
C:/Users/Admin/.openclaw/workspace/site-temp/
```

### Key Files to Edit
| File | Purpose |
|------|---------|
| `index.html` | Homepage |
| `cartwheel.html` | Cartwheel app page |
| `contact.html` | Contact page |
| `terms-of-service.html` | Terms |
| `privacy-policy.html` | Privacy |
| `blog/index.html` | Blog listing |
| `blog/posts/*.html` | Blog posts |
| `reel-reviews/index.html` | Reel Reviews |
| `css/styles.css` | Global styles |

### Assets
```
assets/images/          - Site images
assets/blog/            - Blog images
```

---

## 🔐 CREDENTIALS REFERENCE

### GitHub
- **Repository:** https://github.com/PaperTrail9/Site
- **Token:** `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`
- **Account:** PaperTrail9 (admin@typewrite.club)
- **Branch:** main

### Azure Static Web App
- **Name:** typewrite-club
- **Resource Group:** PaperTrail
- **URL:** https://www.typewrite.club
- **Default Host:** icy-ocean-037156610.2.azurestaticapps.net

### Azure Service Principal
- **App ID:** 4237e822-2ace-4658-a547-42c397726e28
- **Tenant:** d20b46f6-7cc8-430b-9d1d-06fe1d4a8624
- **Subscription:** b343f1e2-702a-4483-90a0-a7123bc8e4de
- **Password:** WnE8Q~WD~qbSAWK-mKMD5Ux1IQRho1uejTMmVa_J

### GoDaddy DNS
- **Domain:** typewrite.club
- **API Key:** 9EJXBhiXnAM_34HiY5MpRkiwJFbPYFeuf3
- **API Secret:** VA3ppzn7rZUvFMs4ea2pEZ

---

## 📞 ESCALATION PATH

### If Authentication Still Fails:

1. **Check token validity:**
   ```powershell
   curl -H "Authorization: token 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" https://api.github.com/user
   ```

2. **If 401 error → Token expired:**
   - Contact alex1v1a for new token
   - Or generate new PAT at https://github.com/settings/tokens
   - Required scopes: `repo`, `workflow`

3. **Alternative: Manual Azure Deploy**
   - Use Azure CLI with Service Principal
   - Or deploy via Azure Portal manually
   - But GitHub integration is preferred

---

## 🚀 EMERGENCY DEPLOY (If Git Fails)

### Azure CLI Method

```powershell
# Install Azure CLI if needed
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login with Service Principal
az login --service-principal -u 4237e822-2ace-4658-a547-42c397726e28 -p WnE8Q~WD~qbSAWK-mKMD5Ux1IQRho1uejTMmVa_J --tenant d20b46f6-7cc8-430b-9d1d-06fe1d4a8624

# Deploy static content
az staticwebapp deploy --name typewrite-club --resource-group PaperTrail --source .
```

**Note:** This bypasses GitHub but may break the GitHub integration. Use only as last resort.

---

## 📝 COMMON EDIT EXAMPLES

### Update Navigation (All Pages)
Find in each HTML file:
```html
<nav class="main-nav" id="main-nav" aria-label="Main navigation">
  <ul class="nav-list">
    <!-- Edit this list -->
  </ul>
</nav>
```

### Update Hero Text (index.html)
Find:
```html
<section class="hero">
  <div class="container hero-content">
    <!-- Edit content here -->
  </div>
</section>
```

### Update Team (index.html)
Find:
```html
<div class="team-grid">
  <!-- Edit team cards -->
</div>
```

### Update Blog Post
Edit: `blog/posts/[post-name].html`

---

## ✅ VERIFICATION COMMANDS

```powershell
# Check git status
git status

# Check recent commits
git log --oneline -5

# Check remote URL
git remote -v

# Check if push worked
git log origin/main --oneline -3

# Check for uncommitted changes
git diff
```

---

## 🎯 SUCCESS INDICATORS

1. **Git push shows:** `master -> main`
2. **GitHub Actions shows:** Green checkmark ✓
3. **Website shows:** Changes after hard refresh
4. **No errors** in browser console

---

## 📁 FILE PATH SUMMARY

| Item | Path |
|------|------|
| This Guide | `C:/Users/Admin/.openclaw/workspace/TYPEWRITE-DEPLOYMENT-GUIDE.md` |
| Main Guide | `C:/Users/Admin/.openclaw/workspace/DEPLOYMENT-GUIDE.md` |
| Website Files | `C:/Users/Admin/.openclaw/workspace/site-temp/` |
| Git Repository | `C:/Users/Admin/.openclaw/workspace/site-temp/.git/` |

---

**Last Updated:** 2026-03-30
**For:** Any Marvin instance deploying to typewrite.club
**Status:** Active
