#!/usr/bin/env node
/**
 * Maintenance Cleanup Script
 * Rotates logs, cleans old screenshots, archives old data files
 * Run via: node dinner-automation/scripts/maintenance-cleanup.js
 * Cron: Weekly (Sundays 3 AM)
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

// Configuration
const CONFIG = {
  // Rotate logs larger than this (bytes)
  logRotationSize: 100 * 1024, // 100KB
  
  // Keep this many rotated log files
  maxRotatedLogs: 5,
  
  // Delete PNG screenshots older than this (days)
  screenshotMaxAge: 7,
  
  // Archive JSON data files older than this (days)
  jsonArchiveAge: 30,
  
  // Delete old archive files after this (days)
  archiveDeleteAge: 90
};

// Files to rotate (relative to data dir)
const LOG_FILES = [
  'chrome-controller.log',
  'edge-connector.log',
  'heb-debug.log',
  'heb-recovery.log',
  'fb-marketplace-unified.log'
];

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Already exists
  }
}

async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return { exists: true, size: stats.size, mtime: stats.mtime };
  } catch {
    return { exists: false };
  }
}

async function rotateLog(logPath) {
  const stats = await getFileStats(logPath);
  if (!stats.exists || stats.size < CONFIG.logRotationSize) {
    return { rotated: false, reason: stats.exists ? 'under size threshold' : 'not found' };
  }

  const dir = path.dirname(logPath);
  const basename = path.basename(logPath, '.log');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rotatedName = `${basename}-${timestamp}.log`;
  const rotatedPath = path.join(LOGS_DIR, rotatedName);

  // Ensure logs directory exists
  await ensureDir(LOGS_DIR);

  // Move current log to rotated location
  await fs.rename(logPath, rotatedPath);
  
  // Create fresh empty log file
  await fs.writeFile(logPath, `# Log rotated: ${new Date().toISOString()}\n`);

  return { rotated: true, to: rotatedName, size: stats.size };
}

async function cleanupRotatedLogs() {
  await ensureDir(LOGS_DIR);
  const files = await fs.readdir(LOGS_DIR);
  const logFiles = files.filter(f => f.endsWith('.log')).sort();
  
  const results = { deleted: [], kept: [] };
  
  // Group by base name
  const grouped = {};
  for (const file of logFiles) {
    const base = file.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/, '');
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(file);
  }

  // Keep only the most recent N files per group
  for (const [base, files] of Object.entries(grouped)) {
    // Sort by date (newest first)
    files.sort().reverse();
    
    for (let i = CONFIG.maxRotatedLogs; i < files.length; i++) {
      const toDelete = path.join(LOGS_DIR, files[i]);
      await fs.unlink(toDelete);
      results.deleted.push(files[i]);
    }
    results.kept.push(...files.slice(0, CONFIG.maxRotatedLogs));
  }

  return results;
}

async function cleanupScreenshots() {
  const cutoff = Date.now() - (CONFIG.screenshotMaxAge * 24 * 60 * 60 * 1000);
  const files = await fs.readdir(DATA_DIR);
  const screenshots = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  
  const results = { deleted: [], kept: [] };
  
  for (const file of screenshots) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtime.getTime() < cutoff) {
      await fs.unlink(filePath);
      results.deleted.push({ file, age: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000)) });
    } else {
      results.kept.push(file);
    }
  }
  
  return results;
}

async function archiveOldData() {
  const cutoff = Date.now() - (CONFIG.jsonArchiveAge * 24 * 60 * 60 * 1000);
  await ensureDir(ARCHIVE_DIR);
  
  const files = await fs.readdir(DATA_DIR);
  const dataFiles = files.filter(f => 
    f.endsWith('.json') && 
    f.includes('-20') && // Has date in filename
    !f.includes('database') && // Don't archive recipe database
    !f.includes('cache') && // Don't archive caches
    !f.includes('config') // Don't archive configs
  );
  
  const results = { archived: [], kept: [] };
  
  for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtime.getTime() < cutoff) {
      const archivePath = path.join(ARCHIVE_DIR, file);
      await fs.rename(filePath, archivePath);
      results.archived.push({ file, age: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000)) });
    } else {
      results.kept.push(file);
    }
  }
  
  return results;
}

async function cleanupOldArchives() {
  const cutoff = Date.now() - (CONFIG.archiveDeleteAge * 24 * 60 * 60 * 1000);
  
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    const results = { deleted: [] };
    
    for (const file of files) {
      const filePath = path.join(ARCHIVE_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime.getTime() < cutoff) {
        await fs.unlink(filePath);
        results.deleted.push({ file, age: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000)) });
      }
    }
    
    return results;
  } catch {
    return { deleted: [] };
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🧹 Maintenance Cleanup');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Rotate logs
  console.log('📋 Log Rotation');
  console.log('─────────────────────────────────────────────────');
  for (const logFile of LOG_FILES) {
    const logPath = path.join(DATA_DIR, logFile);
    const result = await rotateLog(logPath);
    if (result.rotated) {
      console.log(`  ✅ ${logFile} → ${result.to} (${formatBytes(result.size)})`);
    } else {
      console.log(`  ⏭️  ${logFile} (${result.reason})`);
    }
  }

  // 2. Cleanup old rotated logs
  console.log('\n🗑️  Rotated Log Cleanup');
  console.log('─────────────────────────────────────────────────');
  const logCleanup = await cleanupRotatedLogs();
  if (logCleanup.deleted.length > 0) {
    console.log(`  Deleted ${logCleanup.deleted.length} old rotated logs`);
  } else {
    console.log('  No old logs to delete');
  }
  console.log(`  Keeping: ${logCleanup.kept.length} recent logs`);

  // 3. Cleanup screenshots
  console.log('\n🖼️  Screenshot Cleanup');
  console.log('─────────────────────────────────────────────────');
  const screenshotCleanup = await cleanupScreenshots();
  if (screenshotCleanup.deleted.length > 0) {
    console.log(`  Deleted ${screenshotCleanup.deleted.length} old screenshots:`);
    for (const item of screenshotCleanup.deleted) {
      console.log(`    - ${item.file} (${item.age} days old)`);
    }
  } else {
    console.log('  No old screenshots to delete');
  }

  // 4. Archive old data
  console.log('\n📦 Data Archive');
  console.log('─────────────────────────────────────────────────');
  const archiveResult = await archiveOldData();
  if (archiveResult.archived.length > 0) {
    console.log(`  Archived ${archiveResult.archived.length} old data files:`);
    for (const item of archiveResult.archived) {
      console.log(`    - ${item.file} (${item.age} days old)`);
    }
  } else {
    console.log('  No old data to archive');
  }

  // 5. Cleanup old archives
  console.log('\n🗑️  Archive Cleanup');
  console.log('─────────────────────────────────────────────────');
  const archiveCleanup = await cleanupOldArchives();
  if (archiveCleanup.deleted.length > 0) {
    console.log(`  Deleted ${archiveCleanup.deleted.length} old archives:`);
    for (const item of archiveCleanup.deleted) {
      console.log(`    - ${item.file} (${item.age} days old)`);
    }
  } else {
    console.log('  No old archives to delete');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Maintenance Complete');
  console.log('═══════════════════════════════════════════════════');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, CONFIG };
