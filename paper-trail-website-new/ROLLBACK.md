# Paper Trail Website - Rollback Documentation

## Current State (March 16, 2026)

### Latest Commit
- **Hash:** `e976a64`
- **Message:** "Fix: Cache control headers and blog routing"
- **GitHub:** https://github.com/alex1v1a/Marvin-Backups/commit/e976a64

### Recent Commit History (for rollback)
```
e976a64 - Fix: Cache control headers and blog routing (CURRENT)
1cf3a7f - Cache bust: Add version meta tags v2
7a2d8d1 - Add: 2 new blog posts (AI in Mobile Apps, Startup Funding NZ)
0fafb0f - Fix: Blog header, images, routing, home content, contact map
5bac27a - Add: Complete blog post population
028103d - Update: Backup rotation and dashboard data sync
```

### Rollback Commands

#### Rollback to Previous Version
```bash
cd paper-trail-website
git reset --hard 1cf3a7f
git push origin master --force
```

#### Rollback to Specific Commit
```bash
cd paper-trail-website
git reset --hard <commit-hash>
git push origin master --force
```

### Azure Deployment Info
- **Resource Group:** PaperTrail
- **Static Web App Name:** PaperTrail
- **Hostname:** gentle-pebble-0d0893d10.6.azurestaticapps.net
- **Deployment Token:** b504b07db5e59e1bfb3a463ebcd5d14280bedb6d...

### Issues Being Addressed
1. ✅ Duplicate blog header - REMOVED
2. ✅ Blog post images - SVG gradients implemented
3. ✅ Blog routing - staticwebapp.config.json updated
4. ✅ Category nav - JavaScript filtering added
5. ✅ Home content - Expanded to 300+ words
6. ✅ Contact map - Styled clickable card implemented

### Cache Status
- **Issue:** Azure CDN aggressively caching old content
- **Expected Resolution:** 24 hours or manual purge via Azure Portal
- **Local Files:** All fixes correctly implemented
- **GitHub:** All commits pushed

### Files Modified in Latest Commit
- `paper-trail-website/index.html` (version tag added)
- `paper-trail-website/staticwebapp.config.json` (cache headers + routing)

### Verification Commands
```bash
# Check local content
grep -n "Paper Trail began in 2023" paper-trail-website/index.html

# Check GitHub status
git log --oneline -5
git status

# Verify deployment
swa deploy . --deployment-token <token> --env production
```
