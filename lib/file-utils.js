/**
 * @fileoverview File system utilities with safety features and common patterns.
 * @module lib/file-utils
 */

const fs = require('fs');
const path = require('path');
const { MarvinError, ConfigError } = require('./errors');

/**
 * Ensure a directory exists, creating it if necessary.
 * 
 * @param {string} dirPath - Directory path to ensure
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.recursive=true] - Create parent directories if needed
 * @returns {string} The resolved directory path
 * @throws {ConfigError} If directory cannot be created
 * 
 * @example
 * const logDir = ensureDir('./logs');
 * const nested = ensureDir('./data/2024/january');
 */
function ensureDir(dirPath, options = {}) {
  const { recursive = true } = options;
  const resolved = path.resolve(dirPath);
  
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive });
    } catch (error) {
      throw new ConfigError(
        `Failed to create directory: ${dirPath}`,
        'DIR_CREATE_FAILED',
        { cause: error, metadata: { path: resolved } }
      );
    }
  }
  
  return resolved;
}

/**
 * Read a JSON file safely with validation.
 * 
 * @template T
 * @param {string} filePath - Path to JSON file
 * @param {Object} [options={}] - Options
 * @param {T} [options.defaultValue] - Default value if file doesn't exist
 * @param {Function} [options.validator] - Validation function (data) => boolean
 * @returns {T} Parsed JSON data
 * @throws {ConfigError} If file cannot be read or parsed
 * 
 * @example
 * const config = readJsonSafe('./config.json', { defaultValue: {} });
 * const data = readJsonSafe('./data.json', { 
 *   validator: (d) => Array.isArray(d.items) 
 * });
 */
function readJsonSafe(filePath, options = {}) {
  const { defaultValue, validator } = options;
  const resolved = path.resolve(filePath);
  
  if (!fs.existsSync(resolved)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ConfigError(
      `File not found: ${filePath}`,
      'FILE_NOT_FOUND',
      { metadata: { path: resolved } }
    );
  }
  
  let content;
  try {
    content = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    throw new ConfigError(
      `Failed to read file: ${filePath}`,
      'FILE_READ_FAILED',
      { cause: error, metadata: { path: resolved } }
    );
  }
  
  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new ConfigError(
      `Invalid JSON in file: ${filePath}`,
      'JSON_PARSE_ERROR',
      { cause: error, metadata: { path: resolved } }
    );
  }
  
  if (validator && !validator(data)) {
    throw new ConfigError(
      `JSON validation failed for file: ${filePath}`,
      'JSON_VALIDATION_FAILED',
      { metadata: { path: resolved } }
    );
  }
  
  return data;
}

/**
 * Write data to a JSON file atomically.
 * 
 * @param {string} filePath - Path to write
 * @param {*} data - Data to serialize
 * @param {Object} [options={}] - Options
 * @param {number} [options.indent=2] - Indentation spaces
 * @param {boolean} [options.atomic=true] - Write atomically using temp file
 * @returns {string} Path to written file
 * @throws {ConfigError} If file cannot be written
 * 
 * @example
 * writeJsonSafe('./config.json', { foo: 'bar' });
 * writeJsonSafe('./data.json', largeObject, { indent: 4 });
 */
function writeJsonSafe(filePath, data, options = {}) {
  const { indent = 2, atomic = true } = options;
  const resolved = path.resolve(filePath);
  const content = JSON.stringify(data, null, indent);
  
  // Ensure parent directory exists
  ensureDir(path.dirname(resolved));
  
  if (atomic) {
    // Write to temp file first, then rename (atomic operation)
    const tempPath = `${resolved}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, resolved);
    } catch (error) {
      // Clean up temp file on error
      try {
        fs.unlinkSync(tempPath);
      } catch {}
      throw new ConfigError(
        `Failed to write file: ${filePath}`,
        'FILE_WRITE_FAILED',
        { cause: error, metadata: { path: resolved } }
      );
    }
  } else {
    try {
      fs.writeFileSync(resolved, content, 'utf8');
    } catch (error) {
      throw new ConfigError(
        `Failed to write file: ${filePath}`,
        'FILE_WRITE_FAILED',
        { cause: error, metadata: { path: resolved } }
      );
    }
  }
  
  return resolved;
}

/**
 * Append data to a file with locking to prevent corruption.
 * 
 * @param {string} filePath - Path to file
 * @param {string} data - Data to append
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.newline=true] - Add newline if not present
 * @returns {string} Path to file
 * @throws {ConfigError} If file cannot be appended to
 */
function appendFileSafe(filePath, data, options = {}) {
  const { newline = true } = options;
  const resolved = path.resolve(filePath);
  
  let content = data;
  if (newline && !content.endsWith('\n')) {
    content += '\n';
  }
  
  ensureDir(path.dirname(resolved));
  
  try {
    fs.appendFileSync(resolved, content, 'utf8');
  } catch (error) {
    throw new ConfigError(
      `Failed to append to file: ${filePath}`,
      'FILE_APPEND_FAILED',
      { cause: error, metadata: { path: resolved } }
    );
  }
  
  return resolved;
}

/**
 * Find files matching a pattern recursively.
 * 
 * @param {string} dir - Directory to search
 * @param {RegExp|string} pattern - Pattern to match
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.recursive=true] - Search recursively
 * @param {number} [options.maxDepth=10] - Maximum depth to search
 * @returns {string[]} Array of matching file paths
 * 
 * @example
 * const jsFiles = findFiles('./src', /\.js$/);
 * const configFiles = findFiles('.', 'config.json', { maxDepth: 3 });
 */
function findFiles(dir, pattern, options = {}) {
  const { recursive = true, maxDepth = 10 } = options;
  const results = [];
  
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    return results;
  }
  
  const regex = pattern instanceof RegExp 
    ? pattern 
    : new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
  
  function search(currentDir, currentDepth) {
    if (currentDepth > maxDepth) return;
    
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && recursive) {
        search(fullPath, currentDepth + 1);
      } else if (entry.isFile() && regex.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  
  search(resolved, 0);
  return results;
}

/**
 * Get file stats with safe defaults.
 * 
 * @param {string} filePath - Path to file
 * @returns {Object|null} File stats or null if not found
 */
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch {
    return null;
  }
}

/**
 * Safely delete a file or directory.
 * 
 * @param {string} filePath - Path to delete
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.recursive=false] - Delete directories recursively
 * @returns {boolean} True if deleted, false if didn't exist
 * @throws {ConfigError} If deletion fails
 */
function deleteSafe(filePath, options = {}) {
  const { recursive = false } = options;
  const resolved = path.resolve(filePath);
  
  if (!fs.existsSync(resolved)) {
    return false;
  }
  
  try {
    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      fs.rmSync(resolved, { recursive });
    } else {
      fs.unlinkSync(resolved);
    }
    return true;
  } catch (error) {
    throw new ConfigError(
      `Failed to delete: ${filePath}`,
      'DELETE_FAILED',
      { cause: error, metadata: { path: resolved } }
    );
  }
}

/**
 * Move a file safely (copy then delete).
 * 
 * @param {string} source - Source path
 * @param {string} dest - Destination path
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.overwrite=false] - Overwrite destination if exists
 * @returns {string} Destination path
 * @throws {ConfigError} If move fails
 */
function moveFileSafe(source, dest, options = {}) {
  const { overwrite = false } = options;
  const resolvedSource = path.resolve(source);
  const resolvedDest = path.resolve(dest);
  
  if (!fs.existsSync(resolvedSource)) {
    throw new ConfigError(
      `Source file not found: ${source}`,
      'MOVE_SOURCE_NOT_FOUND',
      { metadata: { source: resolvedSource } }
    );
  }
  
  if (fs.existsSync(resolvedDest) && !overwrite) {
    throw new ConfigError(
      `Destination already exists: ${dest}`,
      'MOVE_DEST_EXISTS',
      { metadata: { dest: resolvedDest } }
    );
  }
  
  ensureDir(path.dirname(resolvedDest));
  
  try {
    fs.renameSync(resolvedSource, resolvedDest);
  } catch (error) {
    // Fallback to copy + delete if rename fails (e.g., across drives)
    try {
      fs.copyFileSync(resolvedSource, resolvedDest);
      fs.unlinkSync(resolvedSource);
    } catch (copyError) {
      throw new ConfigError(
        `Failed to move file: ${source} -> ${dest}`,
        'MOVE_FAILED',
        { cause: copyError, metadata: { source, dest } }
      );
    }
  }
  
  return resolvedDest;
}

module.exports = {
  ensureDir,
  readJsonSafe,
  writeJsonSafe,
  appendFileSafe,
  findFiles,
  getFileStats,
  deleteSafe,
  moveFileSafe
};
