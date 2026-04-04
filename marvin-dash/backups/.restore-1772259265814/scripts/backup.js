#!/usr/bin/env node
/**
 * Marvin Backup System
 * Creates rolling backups every 15 minutes, keeps 1 month, max 10GB
 * Run via: node scripts/backup.js [--now] [--restore YYYY-MM-DD-HHmm]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const AdmZip = require('adm-zip');

// Import progress tracker
const progress = require('./progress-tracker.js');
const TASK_ID = 'backup-system';

const execPromise = util.promisify(exec);

const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const BACKUP_DIR = path.join(WORKSPACE_DIR, 'backups');

// What to backup
const BACKUP_ITEMS = [
  { source: path.join(WORKSPACE_DIR, 'data'), name: 'data' },
  { source: path.join(WORKSPACE_DIR, 'public', 'app.js'), name: 'app.js' },
  { source: path.join(WORKSPACE_DIR, 'public', 'index.html'), name: 'index.html' },
  { source: path.join(WORKSPACE_DIR, 'public', 'styles.css'), name: 'styles.css' },
  { source: path.join(WORKSPACE_DIR, 'server.js'), name: 'server.js' },
  { source: path.join(WORKSPACE_DIR, 'scripts'), name: 'scripts' }
];

// Limits
const MAX_BACKUP_AGE_DAYS = 30;
const MAX_BACKUP_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10GB
const MAX_BACKUP_AGE_MS = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'bright');
}

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create backup directory: ${error.message}`);
  }
}

// Get backup size
async function getBackupSize() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch {
    return 0;
  }
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clean up old backups
async function cleanupOldBackups() {
  log('Cleaning up old backups...', 'dim');
  
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    let deletedCount = 0;
    let freedSpace = 0;
    
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      
      // Check age
      const age = now - stats.mtime.getTime();
      if (age > MAX_BACKUP_AGE_MS) {
        await fs.unlink(filePath);
        deletedCount++;
        freedSpace += stats.size;
        continue;
      }
    }
    
    // Check total size and delete oldest if over limit
    let totalSize = await getBackupSize();
    
    if (totalSize > MAX_BACKUP_SIZE_BYTES) {
      // Get all backups sorted by date
      const backupFiles = [];
      for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        backupFiles.push({ file, path: filePath, mtime: stats.mtime, size: stats.size });
      }
      
      // Sort by modification time (oldest first)
      backupFiles.sort((a, b) => a.mtime - b.mtime);
      
      // Delete oldest until under limit
      for (const backup of backupFiles) {
        if (totalSize <= MAX_BACKUP_SIZE_BYTES * 0.9) break; // Keep 10% buffer
        
        await fs.unlink(backup.path);
        deletedCount++;
        freedSpace += backup.size;
        totalSize -= backup.size;
      }
    }
    
    if (deletedCount > 0) {
      log(`  Deleted ${deletedCount} old backups, freed ${formatBytes(freedSpace)}`, 'green');
    } else {
      log(`  No cleanup needed`, 'dim');
    }
    
    return { deletedCount, freedSpace };
  } catch (error) {
    log(`  Cleanup error: ${error.message}`, 'yellow');
    return { deletedCount: 0, freedSpace: 0 };
  }
}

// Create backup
async function createBackup() {
  await ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `marvin-backup-${timestamp}.zip`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  log(`Creating backup: ${backupName}`, 'cyan');
  
  // Create temp staging directory
  const stagingDir = path.join(BACKUP_DIR, `.staging-${Date.now()}`);
  await fs.mkdir(stagingDir, { recursive: true });
  
  try {
    // Copy files to staging
    for (const item of BACKUP_ITEMS) {
      try {
        await fs.access(item.source);
        const destPath = path.join(stagingDir, item.name);
        
        const stats = await fs.stat(item.source);
        if (stats.isDirectory()) {
          await copyDir(item.source, destPath);
        } else {
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(item.source, destPath);
        }
        log(`  ✓ ${item.name}`, 'dim');
      } catch (error) {
        log(`  ✗ ${item.name} - ${error.message}`, 'yellow');
      }
    }
    
    // Create metadata
    const metadata = {
      created: new Date().toISOString(),
      version: '1.0.0',
      items: BACKUP_ITEMS.map(i => i.name)
    };
    await fs.writeFile(
      path.join(stagingDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Create zip using adm-zip
    const zip = new AdmZip();
    zip.addLocalFolder(stagingDir);
    zip.writeZip(backupPath);
    
    // Get backup size
    const stats = await fs.stat(backupPath);
    
    // Clean up staging
    await fs.rm(stagingDir, { recursive: true, force: true });
    
    log(`  Backup created: ${formatBytes(stats.size)}`, 'green');
    
    // Clean up old backups
    await cleanupOldBackups();
    
    return { success: true, backupPath, size: stats.size };
  } catch (error) {
    // Clean up staging on error
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
    } catch {}
    
    log(`  Backup failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Copy directory recursively
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// List available backups
async function listBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      
      backups.push({
        name: file,
        path: filePath,
        date: stats.mtime,
        size: stats.size
      });
    }
    
    // Sort by date (newest first)
    backups.sort((a, b) => b.date - a.date);
    
    return backups;
  } catch {
    return [];
  }
}

// Restore from backup
async function restoreBackup(backupName) {
  logSection('RESTORE BACKUP');
  
  // Find backup
  let backupPath;
  if (backupName) {
    backupPath = path.join(BACKUP_DIR, backupName);
    if (!backupPath.endsWith('.zip')) {
      backupPath += '.zip';
    }
    try {
      await fs.access(backupPath);
    } catch {
      log(`Backup not found: ${backupName}`, 'red');
      return false;
    }
  } else {
    // Use most recent backup
    const backups = await listBackups();
    if (backups.length === 0) {
      log('No backups available', 'red');
      return false;
    }
    backupPath = backups[0].path;
    log(`Using most recent backup: ${backups[0].name}`, 'cyan');
  }
  
  log(`Restoring from: ${path.basename(backupPath)}`, 'cyan');
  
  // Create restore staging
  const stagingDir = path.join(BACKUP_DIR, `.restore-${Date.now()}`);
  await fs.mkdir(stagingDir, { recursive: true });
  
  try {
    // Extract backup using adm-zip
    const zip = new AdmZip(backupPath);
    zip.extractAllTo(stagingDir, true);
    
    // Stop services before restore
    log('Stopping services...', 'yellow');
    try {
      // Kill dashboard server
      const { stdout } = await execPromise('netstat -ano | findstr :3001');
      const pid = stdout.trim().split(/\s+/).pop();
      if (pid) {
        await execPromise(`taskkill /F /PID ${pid}`);
        log('  Dashboard server stopped', 'dim');
      }
    } catch {
      log('  Dashboard server not running', 'dim');
    }
    
    // Restore files
    log('Restoring files...', 'cyan');
    
    for (const item of BACKUP_ITEMS) {
      try {
        const srcPath = path.join(stagingDir, item.name);
        await fs.access(srcPath);
        
        // Remove existing
        try {
          const stats = await fs.stat(item.source);
          if (stats.isDirectory()) {
            await fs.rm(item.source, { recursive: true, force: true });
          } else {
            await fs.unlink(item.source);
          }
        } catch {}
        
        // Copy from backup
        const stats = await fs.stat(srcPath);
        if (stats.isDirectory()) {
          await copyDir(srcPath, item.source);
        } else {
          await fs.mkdir(path.dirname(item.source), { recursive: true });
          await fs.copyFile(srcPath, item.source);
        }
        
        log(`  ✓ ${item.name}`, 'green');
      } catch (error) {
        log(`  ✗ ${item.name} - ${error.message}`, 'yellow');
      }
    }
    
    // Clean up staging
    await fs.rm(stagingDir, { recursive: true, force: true });
    
    // Restart services
    log('Restarting services...', 'cyan');
    await execPromise(`powershell -Command "Start-Process node -ArgumentList '${path.join(WORKSPACE_DIR, 'server.js')}' -WorkingDirectory '${WORKSPACE_DIR}' -WindowStyle Hidden"`);
    log('  Dashboard server started', 'green');
    
    log('Restore complete!', 'green');
    return true;
  } catch (error) {
    // Clean up staging on error
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
    } catch {}
    
    log(`Restore failed: ${error.message}`, 'red');
    return false;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const shouldBackup = args.includes('--now') || args.length === 0;
  const shouldRestore = args.includes('--restore');
  const shouldList = args.includes('--list');
  
  if (shouldList) {
    logSection('AVAILABLE BACKUPS');
    const backups = await listBackups();
    
    if (backups.length === 0) {
      log('No backups found', 'yellow');
      return;
    }
    
    log(`Found ${backups.length} backups:`, 'cyan');
    for (const backup of backups) {
      log(`  ${backup.name} - ${formatBytes(backup.size)} - ${backup.date.toLocaleString()}`, 'dim');
    }
    
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    log(`\nTotal: ${formatBytes(totalSize)} / ${formatBytes(MAX_BACKUP_SIZE_BYTES)}`, 'cyan');
    return;
  }
  
  if (shouldRestore) {
    const backupName = args[args.indexOf('--restore') + 1];
    await restoreBackup(backupName);
    return;
  }
  
  if (shouldBackup) {
    console.log('');
    log('════════════════════════════════════════', 'bright');
    log('   💾 MARVIN BACKUP', 'bright');
    log('   ' + new Date().toLocaleString(), 'dim');
    log('════════════════════════════════════════', 'bright');
    
    const result = await createBackup();
    
    if (result.success) {
      const totalSize = await getBackupSize();
      log(`\nTotal backup storage: ${formatBytes(totalSize)}`, 'cyan');
    }
    
    console.log('');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Backup failed:', error);
    process.exit(1);
  });
}

module.exports = { createBackup, restoreBackup, listBackups, cleanupOldBackups };
