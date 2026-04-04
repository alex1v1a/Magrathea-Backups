#!/bin/bash
# Automated Git Backup Script for OpenClaw Workspace
# Backs up ~/.openclaw/workspace to Magrathea-Backups repo

WORKSPACE_DIR="$HOME/.openclaw/workspace"
LOG_FILE="$HOME/.openclaw/logs/git-backup.log"
NODE_NAME="$(hostname)"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Change to workspace
cd "$WORKSPACE_DIR" || exit 1

# Check if git repo is initialized
if [ ! -d ".git" ]; then
    log "ERROR: Not a git repository. Run: git init && git remote add origin https://github.com/alex1v1a/Magrathea-Backups.git"
    exit 1
fi

# Configure git if not already set
git config user.email "${NODE_NAME}@magrathea.local" 2>/dev/null
git config user.name "${NODE_NAME} Backup" 2>/dev/null

# Add all changes
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    log "No changes to backup"
    exit 0
fi

# Commit with timestamp
COMMIT_MSG="Backup ${NODE_NAME} - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: Git commit failed"
    exit 1
fi

# Push to remote
if git push origin HEAD:${NODE_NAME} 2>/dev/null || git push -u origin HEAD:${NODE_NAME} 2>/dev/null; then
    log "SUCCESS: Backup pushed to Magrathea-Backups/${NODE_NAME}"
else
    # Try pushing to main as fallback
    git push origin HEAD:main 2>/dev/null || git push -u origin HEAD:main 2>/dev/null
    if [ $? -eq 0 ]; then
        log "SUCCESS: Backup pushed to Magrathea-Backups/main"
    else
        log "ERROR: Git push failed"
        exit 1
    fi
fi

exit 0
