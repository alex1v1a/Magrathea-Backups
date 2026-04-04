#!/usr/bin/env node
/**
 * State File Optimizer & Log Manager
 * 
 * Addresses:
 * 1. Task log growth (task-log.md is 11KB and growing)
 * 2. Recovery log rotation (recovery.log is 3.4MB)
 * 3. State file compression
 * 4. Automatic cleanup of old data
 * 
 * Usage: node state-optimizer.js [--compress] [--rotate-logs] [--clean-old]
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Optimization Configuration
const CONFIG = {
  // Task log rotation
  taskLogMaxSize: 50 * 1024,        // 50KB before archival
  taskLogMaxAge: 30,                // Days to keep in active log
  
  // Recovery log rotation  
  recoveryLogMaxSize: 2 * 1024 * 1024, // 2MB before rotation
  recoveryLogMaxBackups: 5,
  
  // State file compression
  compressionThreshold: 100 * 1024, // Compress files > 100KB
  compressionEnabled: true,
  
  // Cleanup settings
  maxHistoryAge: 90,                // Days to keep historical data
  maxHistorySize: 500 * 1024 * 1024, // 500MB total for history
  
  // File patterns to optimize
  optimizablePatterns: [
    '*.json',
    '*.log',
    'task-log.md'
  ]
};

// Metrics tracking
const metrics = {
  bytesBefore: 0,
  bytesAfter: 0,
  filesProcessed: 0,
  filesCompressed: 0,
  logsRotated: 0,
  errors: []
};

// ============================================================================
// TASK LOG MANAGEMENT
// ============================================================================

async function optimizeTaskLog() {
  const taskLogPath = path.join(DATA_DIR, 'task-log.md');
  
  try {
    const stats = await fs.stat(taskLogPath);
    metrics.bytesBefore += stats.size;
    
    // Check if rotation needed
    if (stats.size < CONFIG.taskLogMaxSize) {
      console.log(`  ✓ Task log size OK: ${formatBytes(stats.size)}`);
      return { rotated: false, size: stats.size };
    }
    
    console.log(`  🔄 Task log too large (${formatBytes(stats.size)}), rotating...`);
    
    // Read and split by month
    const content = await fs.readFile(taskLogPath, 'utf8');
    const entries = parseTaskLogEntries(content);
    
    // Group by month
    const byMonth = groupEntriesByMonth(entries);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Archive old months
    for (const [month, monthEntries] of Object.entries(byMonth)) {
      if (month !== currentMonth) {
        const archivePath = path.join(DATA_DIR, `task-log-${month}.md`);
        const archiveContent = monthEntries.map(e => e.raw).join('\n\n');
        await fs.writeFile(archivePath, archiveContent);
        console.log(`    📁 Archived ${month}: ${monthEntries.length} entries → ${path.basename(archivePath)}`);
      }
    }
    
    // Keep only current month in active log
    if (byMonth[currentMonth]) {
      const currentContent = byMonth[currentMonth].map(e => e.raw).join('\n\n');
      await fs.writeFile(taskLogPath, currentContent);
      const newSize = Buffer.byteLength(currentContent);
      metrics.bytesAfter += newSize;
      console.log(`  ✓ Reduced from ${formatBytes(stats.size)} to ${formatBytes(newSize)}`);
    }
    
    metrics.logsRotated++;
    return { rotated: true, originalSize: stats.size };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { rotated: false, reason: 'file_not_found' };
    }
    metrics.errors.push({ file: 'task-log.md', error: error.message });
    return { rotated: false, error: error.message };
  }
}

function parseTaskLogEntries(content) {
  const entries = [];
  const lines = content.split('\n');
  let currentEntry = { lines: [], raw: '' };
  
  for (const line of lines) {
    // New entry starts with date or header
    if (line.match(/^##?\s*\d{4}-\d{2}-\d{2}/) || line.match(/^###\s+/)) {
      if (currentEntry.lines.length > 0) {
        currentEntry.raw = currentEntry.lines.join('\n');
        entries.push(currentEntry);
      }
      currentEntry = { lines: [line], raw: '', date: null };
      
      // Extract date
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentEntry.date = dateMatch[1];
      }
    } else {
      currentEntry.lines.push(line);
    }
  }
  
  // Don't forget last entry
  if (currentEntry.lines.length > 0) {
    currentEntry.raw = currentEntry.lines.join('\n');
    entries.push(currentEntry);
  }
  
  return entries;
}

function groupEntriesByMonth(entries) {
  const groups = {};
  
  for (const entry of entries) {
    const month = entry.date ? entry.date.slice(0, 7) : 'unknown';
    if (!groups[month]) groups[month] = [];
    groups[month].push(entry);
  }
  
  return groups;
}

// ============================================================================
// RECOVERY LOG ROTATION
// ============================================================================

async function rotateRecoveryLog() {
  const recoveryLogPath = path.join(DATA_DIR, 'recovery.log');
  
  try {
    const stats = await fs.stat(recoveryLogPath);
    metrics.bytesBefore += stats.size;
    
    if (stats.size < CONFIG.recoveryLogMaxSize) {
      console.log(`  ✓ Recovery log size OK: ${formatBytes(stats.size)}`);
      return { rotated: false, size: stats.size };
    }
    
    console.log(`  🔄 Rotating recovery.log (${formatBytes(stats.size)})...`);
    
    // Rotate backups
    for (let i = CONFIG.recoveryLogMaxBackups - 1; i >= 1; i--) {
      const oldPath = `${recoveryLogPath}.${i}`;
      const newPath = `${recoveryLogPath}.${i + 1}`;
      
      try {
        await fs.rename(oldPath, newPath);
      } catch {
        // May not exist
      }
    }
    
    // Rotate current to .1
    await fs.rename(recoveryLogPath, `${recoveryLogPath}.1`);
    
    // Create new log with header
    const header = `[${new Date().toISOString()}] Recovery log rotated - previous: ${formatBytes(stats.size)}\n`;
    await fs.writeFile(recoveryLogPath, header);
    
    metrics.bytesAfter += Buffer.byteLength(header);
    metrics.logsRotated++;
    
    // Compress old log
    if (CONFIG.compressionEnabled) {
      const oldLogPath = `${recoveryLogPath}.1`;
      const compressed = await gzip(await fs.readFile(oldLogPath));
      await fs.writeFile(`${oldLogPath}.gz`, compressed);
      await fs.unlink(oldLogPath);
      console.log(`  ✓ Compressed recovery.log.1 → recovery.log.1.gz`);
    }
    
    console.log(`  ✓ Rotated recovery.log`);
    return { rotated: true, originalSize: stats.size };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { rotated: false, reason: 'file_not_found' };
    }
    metrics.errors.push({ file: 'recovery.log', error: error.message });
    return { rotated: false, error: error.message };
  }
}

// ============================================================================
// STATE FILE COMPRESSION
// ============================================================================

async function compressStateFiles() {
  const files = await fs.readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.gz'));
  
  const results = [];
  
  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file);
    const stats = await fs.stat(filePath);
    
    if (stats.size < CONFIG.compressionThreshold) continue;
    
    console.log(`  🗜️  Compressing ${file} (${formatBytes(stats.size)})...`);
    
    try {
      metrics.bytesBefore += stats.size;
      
      const content = await fs.readFile(filePath);
      const compressed = await gzip(content);
      
      // Only keep compressed if it's actually smaller
      if (compressed.length < stats.size * 0.9) {
        await fs.writeFile(`${filePath}.gz`, compressed);
        await fs.unlink(filePath);
        
        metrics.bytesAfter += compressed.length;
        metrics.filesCompressed++;
        
        console.log(`    ✓ ${formatBytes(stats.size)} → ${formatBytes(compressed.length)} (${
          ((1 - compressed.length / stats.size) * 100).toFixed(1)
        }% reduction)`);
        
        results.push({ file, original: stats.size, compressed: compressed.length });
      } else {
        metrics.bytesAfter += stats.size;
        console.log(`    ℹ Compression not beneficial, keeping original`);
      }
      
      metrics.filesProcessed++;
      
    } catch (error) {
      metrics.errors.push({ file, error: error.message });
    }
  }
  
  return results;
}

async function decompressStateFile(fileName) {
  const gzPath = path.join(DATA_DIR, `${fileName}.gz`);
  const jsonPath = path.join(DATA_DIR, fileName);
  
  try {
    const compressed = await fs.readFile(gzPath);
    const decompressed = await gunzip(compressed);
    await fs.writeFile(jsonPath, decompressed);
    await fs.unlink(gzPath);
    return { success: true, size: decompressed.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// OLD DATA CLEANUP
// ============================================================================

async function cleanupOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.maxHistoryAge);
  const cutoffTime = cutoffDate.getTime();
  
  console.log(`  🧹 Cleaning data older than ${cutoffDate.toISOString().split('T')[0]}...`);
  
  const files = await fs.readdir(DATA_DIR);
  let deleted = 0;
  let freed = 0;
  
  for (const file of files) {
    // Skip active files
    if (file === 'tasks.json' || file === 'recovery.log' || file === 'task-log.md') continue;
    
    const filePath = path.join(DATA_DIR, file);
    
    try {
      const stats = await fs.stat(filePath);
      
      // Delete old files
      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(filePath);
        console.log(`    🗑️  Deleted ${file} (${formatBytes(stats.size)})`);
        deleted++;
        freed += stats.size;
      }
      
    } catch (error) {
      // Continue on error
    }
  }
  
  return { deleted, freed };
}

// ============================================================================
// HISTORY DIRECTORY MANAGEMENT
// ============================================================================

async function manageHistoryDirectory() {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    let totalSize = 0;
    const fileStats = [];
    
    // Get stats for all files
    for (const file of files) {
      const filePath = path.join(HISTORY_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileStats.push({ file, size: stats.size, mtime: stats.mtime });
      } catch {
        // Skip
      }
    }
    
    console.log(`  📊 History: ${files.length} files, ${formatBytes(totalSize)}`);
    
    // If under limit, no action needed
    if (totalSize <= CONFIG.maxHistorySize) {
      return { cleaned: 0, freed: 0 };
    }
    
    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => a.mtime - b.mtime);
    
    let freed = 0;
    let cleaned = 0;
    
    // Delete oldest files until under limit
    for (const stat of fileStats) {
      if (totalSize - freed <= CONFIG.maxHistorySize * 0.8) break;
      
      const filePath = path.join(HISTORY_DIR, stat.file);
      await fs.unlink(filePath);
      freed += stat.size;
      cleaned++;
    }
    
    if (cleaned > 0) {
      console.log(`    🗑️  Removed ${cleaned} old files, freed ${formatBytes(freed)}`);
    }
    
    return { cleaned, freed };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { cleaned: 0, freed: 0, reason: 'directory_not_found' };
    }
    return { cleaned: 0, freed: 0, error: error.message };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function printReport() {
  console.log('\n═══════════════════════════════════════════');
  console.log('       OPTIMIZATION REPORT');
  console.log('═══════════════════════════════════════════\n');
  
  const savings = metrics.bytesBefore - metrics.bytesAfter;
  const percent = metrics.bytesBefore > 0 
    ? ((savings / metrics.bytesBefore) * 100).toFixed(1) 
    : 0;
  
  console.log(`  Files Processed:    ${metrics.filesProcessed}`);
  console.log(`  Files Compressed:   ${metrics.filesCompressed}`);
  console.log(`  Logs Rotated:       ${metrics.logsRotated}`);
  console.log(`  Space Before:       ${formatBytes(metrics.bytesBefore)}`);
  console.log(`  Space After:        ${formatBytes(metrics.bytesAfter)}`);
  console.log(`  Space Saved:        ${formatBytes(savings)} (${percent}%)`);
  
  if (metrics.errors.length > 0) {
    console.log(`\n  ⚠️  Errors: ${metrics.errors.length}`);
    for (const err of metrics.errors) {
      console.log(`      ${err.file}: ${err.error}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function runOptimization(options = {}) {
  console.log('\n🚀 Starting State File Optimization...\n');
  
  // 1. Rotate recovery log
  console.log('1️⃣  Recovery Log Management');
  await rotateRecoveryLog();
  console.log('');
  
  // 2. Optimize task log
  console.log('2️⃣  Task Log Management');
  await optimizeTaskLog();
  console.log('');
  
  // 3. Compress large state files (if enabled)
  if (options.compress !== false) {
    console.log('3️⃣  State File Compression');
    await compressStateFiles();
    console.log('');
  }
  
  // 4. Clean up old data
  if (options.cleanOld !== false) {
    console.log('4️⃣  Old Data Cleanup');
    await cleanupOldData();
    console.log('');
  }
  
  // 5. Manage history directory
  console.log('5️⃣  History Directory Management');
  await manageHistoryDirectory();
  console.log('');
  
  // Print report
  printReport();
  
  return metrics;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    compress: !args.includes('--no-compress'),
    rotateLogs: !args.includes('--no-rotate'),
    cleanOld: !args.includes('--no-clean')
  };
  
  runOptimization(options).then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Optimization failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runOptimization,
  rotateRecoveryLog,
  optimizeTaskLog,
  compressStateFiles,
  cleanupOldData,
  metrics,
  CONFIG
};
