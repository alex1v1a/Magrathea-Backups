#!/usr/bin/env node
/**
 * =============================================================================
 * PAPER TRAIL WEBSITE - BACKUP & ROLLBACK SYSTEM
 * =============================================================================
 * File: scripts/backup-system.js
 * Purpose: Creates daily backups and allows instant rollback to any version
 * 
 * TABLE OF CONTENTS:
 * 1. CONFIGURATION - Backup settings and paths
 * 2. BACKUP CREATION - Creates timestamped backups
 * 3. ROLLBACK - Restores from previous backup
 * 4. CLEANUP - Removes old backups (keeps 30 days)
 * 5. CLI COMMANDS - Command-line interface
 * 
 * SCHEDULING:
 * This script is run daily at 1:00 AM by Windows Task Scheduler
 * Task Name: PaperTrailDailyBackup
 * 
 * BACKUP LOCATION:
 * backups/site-history/backup-YYYY-MM-DDTHH-MM-SS/
 * 
 * USAGE:
 *   node scripts/backup-system.js backup          - Create new backup
 *   node scripts/backup-system.js list            - List all backups
 *   node scripts/backup-system.js rollback <name> - Restore to backup
 * 
 * SAFETY FEATURES:
 * - Automatic emergency backup before rollback
 * - 30-day retention policy
 * - Metadata file with timestamp and file list
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// SECTION 1: CONFIGURATION
// ============================================================================

/** 
 * Root directory of the website files
 * This is where index.html, css/, js/, etc. live
 */
const WEBSITE_DIR = path.join(__dirname, '..');

/**
 * Directory where backups are stored
 * Structure: backups/site-history/backup-2024-03-13T01-00-00/
 */
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'site-history');

/**
 * Maximum number of backups to keep
 * Older backups are automatically deleted
 */
const MAX_BACKUPS = 30; // Keep 30 days of history

/**
 * Files and directories to include in backup
 * These are the essential website files
 * Note: node_modules, backups folder, etc. are excluded
 */
const FILES_TO_BACKUP = [
    'index.html',                    // Homepage
    'css',                           // Stylesheets
    'js',                            // JavaScript files
    'assets',                        // Images and media
    'apps',                          // App pages (Reel Reviews, Coming Soon)
    'blog',                          // Blog pages
    'staticwebapp.config.json',      // Azure configuration
    'README.md'                      // Documentation
];

// ============================================================================
// SECTION 2: BACKUP CREATION
// ============================================================================

/**
 * Creates a new timestamped backup of the website
 * 
 * PROCESS:
 * 1. Generates timestamp (e.g., 2024-03-13T01-00-00)
 * 2. Creates backup directory
 * 3. Copies all FILES_TO_BACKUP
 * 4. Creates metadata.json with backup info
 * 5. Cleans up old backups
 * 
 * @returns {string} Path to created backup directory
 */
function createBackup() {
    // Generate timestamp: 2024-03-13T01-00-00
    // Replace colons with dashes for Windows filename compatibility
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
    
    // Ensure backup directory exists
    // { recursive: true } creates parent directories if needed
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copy each file/directory from FILES_TO_BACKUP
    FILES_TO_BACKUP.forEach(item => {
        const sourcePath = path.join(WEBSITE_DIR, item);
        const destPath = path.join(backupPath, item);
        
        // Only backup if source exists
        if (fs.existsSync(sourcePath)) {
            copyRecursive(sourcePath, destPath);
        }
    });
    
    // Create metadata file with backup information
    // This helps identify backups and track what was included
    const metadata = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString(),
        files: FILES_TO_BACKUP,
        backupVersion: '1.0'
    };
    fs.writeFileSync(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
    );
    
    console.log(`✅ Backup created: ${backupPath}`);
    
    // Remove backups older than MAX_BACKUPS
    cleanOldBackups();
    
    return backupPath;
}

/**
 * Recursively copies a file or directory
 * 
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 */
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    
    if (stats.isDirectory()) {
        // It's a directory - create it and copy contents
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
        });
    } else {
        // It's a file - copy it
        fs.copyFileSync(src, dest);
    }
}

// ============================================================================
// SECTION 3: ROLLBACK (RESTORE)
// ============================================================================

/**
 * Restores the website from a specific backup
 * 
 * SAFETY FEATURE:
 * Before restoring, creates an emergency backup of current state
 * This allows undoing the rollback if something goes wrong
 * 
 * @param {string} backupName - Name of backup to restore (e.g., backup-2024-03-13T01-00-00)
 * @returns {boolean} True if successful, false otherwise
 */
function rollback(backupName) {
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // Verify backup exists
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup not found: ${backupName}`);
        console.log('Run "list" command to see available backups');
        return false;
    }
    
    // SAFETY FIRST: Create emergency backup of current state
    console.log('🚨 Creating emergency backup of current state...');
    const emergencyBackup = createBackup();
    console.log(`   Emergency backup: ${path.basename(emergencyBackup)}`);
    
    // Restore files from backup
    console.log(`🔄 Restoring from: ${backupName}`);
    
    FILES_TO_BACKUP.forEach(item => {
        const sourcePath = path.join(backupPath, item);
        const destPath = path.join(WEBSITE_DIR, item);
        
        if (fs.existsSync(sourcePath)) {
            // Remove current version (if exists)
            if (fs.existsSync(destPath)) {
                fs.rmSync(destPath, { recursive: true, force: true });
            }
            // Copy from backup
            copyRecursive(sourcePath, destPath);
            console.log(`   ✓ Restored: ${item}`);
        }
    });
    
    console.log(`\n✅ Rollback complete!`);
    console.log(`📝 If something went wrong, restore from emergency backup:`);
    console.log(`   node backup-system.js rollback ${path.basename(emergencyBackup)}`);
    
    return true;
}

// ============================================================================
// SECTION 4: CLEANUP
// ============================================================================

/**
 * Removes old backups, keeping only the most recent MAX_BACKUPS
 * 
 * This runs automatically after each backup creation
 * Prevents disk space from filling up with old backups
 */
function cleanOldBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return;
    
    // Get all backup directories
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(name => name.startsWith('backup-'))
        .map(name => ({
            name,
            path: path.join(BACKUP_DIR, name),
            time: fs.statSync(path.join(BACKUP_DIR, name)).mtime
        }))
        .sort((a, b) => b.time - a.time); // Sort newest first
    
    // Remove old backups beyond MAX_BACKUPS limit
    if (backups.length > MAX_BACKUPS) {
        const toDelete = backups.slice(MAX_BACKUPS);
        toDelete.forEach(backup => {
            fs.rmSync(backup.path, { recursive: true, force: true });
            console.log(`🗑️  Removed old backup: ${backup.name}`);
        });
    }
}

// ============================================================================
// SECTION 5: LIST BACKUPS
// ============================================================================

/**
 * Lists all available backups with creation dates
 * 
 * @returns {Array} Array of backup objects
 */
function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('No backups found.');
        return [];
    }
    
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(name => name.startsWith('backup-'))
        .map(name => ({
            name,
            path: path.join(BACKUP_DIR, name),
            time: fs.statSync(path.join(BACKUP_DIR, name)).mtime
        }))
        .sort((a, b) => b.time - a.time);
    
    console.log('\n📦 Available Backups:');
    console.log('====================');
    
    if (backups.length === 0) {
        console.log('No backups found.');
        return backups;
    }
    
    backups.forEach((backup, index) => {
        const date = backup.time.toLocaleString();
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Created: ${date}`);
        
        // Show metadata if available
        const metadataPath = path.join(backup.path, 'backup-metadata.json');
        if (fs.existsSync(metadataPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log(`   Files: ${metadata.files.length} items`);
            } catch (e) {
                // Metadata read failed, skip
            }
        }
        console.log('');
    });
    
    return backups;
}

// ============================================================================
// SECTION 6: COMMAND LINE INTERFACE
// ============================================================================

/**
 * Main entry point - handles command line arguments
 * 
 * COMMANDS:
 *   backup  - Create new backup
 *   list    - Show all backups
 *   rollback <name> - Restore to specific backup
 */
function main() {
    const command = process.argv[2];
    
    switch(command) {
        case 'backup':
            // Create new backup
            createBackup();
            break;
            
        case 'list':
            // Show all backups
            listBackups();
            break;
            
        case 'rollback':
            // Restore from backup
            const backupName = process.argv[3];
            if (!backupName) {
                console.log('Usage: node backup-system.js rollback <backup-name>');
                console.log('\nExample:');
                console.log('  node backup-system.js rollback backup-2024-03-13T01-00-00');
                console.log('\nAvailable backups:');
                listBackups();
                return;
            }
            rollback(backupName);
            break;
            
        default:
            // Show help
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║     Paper Trail Website - Backup & Rollback System         ║');
            console.log('╚════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('DESCRIPTION:');
            console.log('  Creates daily backups of the website with 30-day retention.');
            console.log('  Allows instant rollback to any previous version.');
            console.log('');
            console.log('AUTOMATIC BACKUPS:');
            console.log('  Scheduled daily at 1:00 AM via Windows Task Scheduler');
            console.log('  Task Name: PaperTrailDailyBackup');
            console.log('');
            console.log('COMMANDS:');
            console.log('  node backup-system.js backup              Create new backup now');
            console.log('  node backup-system.js list                List all available backups');
            console.log('  node backup-system.js rollback <name>     Restore to backup');
            console.log('');
            console.log('EXAMPLES:');
            console.log('  node backup-system.js backup');
            console.log('  node backup-system.js list');
            console.log('  node backup-system.js rollback backup-2024-03-13T01-00-00');
            console.log('');
            console.log('BACKUP LOCATION:');
            console.log(`  ${BACKUP_DIR}`);
            console.log('');
            
            // Show current backups
            listBackups();
    }
}

// Run if called directly (not imported as module)
if (require.main === module) {
    main();
}

// Export functions for use in other scripts
module.exports = { createBackup, listBackups, rollback };
