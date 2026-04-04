# Marvin AI Workspace — Git Repo Notes

This repo is a **cleaned, private monorepo** for the OpenClaw / Marvin workspace.

## 1. Large Backup ZIPs Removed from History

On **2026-02-20**, we rewrote the git history to remove large backup archives that were causing push failures:

- Removed path: `marvin-dash/backups/`
- Tool used: `git-filter-repo` (via `python -m git_filter_repo`)
- Command:
  ```bash
  python -m git_filter_repo --force --path marvin-dash/backups --invert-paths
  ```
- Reason: Backup ZIPs (~159MB each, 60+ files) made `git push` fail with
  `fatal: mmap failed: File too large` during pack-objects.

Result:
- ✅ All commits were rewritten **without** the backup ZIPs
- ✅ Repo can now be pushed/pulled normally
- ✅ Working tree still keeps any local backups, but they are **ignored** by git

## 2. .gitignore Rules (Do Not Commit Secrets or Backups)

Key ignore rules:

- `marvin-dash/backups/*.zip`  — large backup archives
- `.secrets/`                  — credentials (SMTP, iCloud, Tuya, API keys, etc.)

Anything under these paths **must not** be committed. If new backup directories or secret files are added in the future, update `.gitignore` immediately.

## 3. Force-Push Warning (History Was Rewritten)

Because we rewrote history, we had to **force-push** to GitHub:

```bash
git push --force origin master
```

Implications:
- Any old clones of this repo (on other machines) now have **stale history**.
- To fix an old clone, either:
  1. **Re-clone** from GitHub (preferred):
     ```bash
     git clone git@github.com:alex1v1a/marvin-ai-workspace.git
     ```
  2. Or hard reset to the new origin (if you really want to keep the old clone):
     ```bash
     git fetch origin
     git reset --hard origin/master
     ```

## 4. Safe Workflow Going Forward

- Use normal flow for day-to-day work:
  ```bash
  git status
  git add <files>
  git commit -m "message"
  git push
  ```
- **Never** add backup archives or secret directories:
  - If you see `marvin-dash/backups/*.zip` or `.secrets/*` in `git status`, do **not** commit — fix `.gitignore` instead.
- For large generated data (logs, usage history), prefer either:
  - Lightweight summaries checked in (e.g., daily metrics), or
  - Keep raw data under a dedicated ignored directory (e.g., `marvin-dash/data/history/`).

## 5. If Push Starts Failing Again

If you ever see `mmap failed`, `file too large`, or similar pack-objects errors again:

1. Run:
   ```bash
   git status
   ```
   and check for large, accidentally tracked files (e.g., new backups, exports).
2. Add appropriate patterns to `.gitignore`.
3. Remove them from history early (before too many commits) using `git-filter-repo` again.

This doc is the canonical reference for **why** the repo history was rewritten and **how** to keep it healthy going forward.