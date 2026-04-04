/**
 * Date Utilities - Date/Time Formatting and Manipulation
 * 
 * Provides consistent date formatting and manipulation utilities
 * used across the dinner-automation codebase.
 * 
 * @module lib/date-utils
 */

// Date format patterns
const DATE_FORMATS = {
  iso: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  short: 'MM/DD/YYYY',
  long: 'MMMM D, YYYY',
  time: 'HH:mm:ss',
  datetime: 'MM/DD/YYYY HH:mm:ss',
  filename: 'YYYY-MM-DD_HH-mm-ss',
  readable: 'MMMM D, YYYY at h:mm A',
  compact: 'YYYYMMDD',
  log: 'YYYY-MM-DD HH:mm:ss'
};

/**
 * Pad a number with leading zeros
 * @param {number} num - Number to pad
 * @param {number} size - Target length
 * @returns {string}
 */
function pad(num, size = 2) {
  return num.toString().padStart(size, '0');
}

/**
 * Format a date according to a pattern
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format pattern or preset name
 * @returns {string}
 */
function formatDateTime(date, format = 'iso') {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  // Use preset if format matches
  if (DATE_FORMATS[format]) {
    format = DATE_FORMATS[format];
  }

  const tokens = {
    'YYYY': d.getFullYear(),
    'MM': pad(d.getMonth() + 1),
    'DD': pad(d.getDate()),
    'HH': pad(d.getHours()),
    'mm': pad(d.getMinutes()),
    'ss': pad(d.getSeconds()),
    'sss': pad(d.getMilliseconds(), 3),
    'M': d.getMonth() + 1,
    'D': d.getDate(),
    'H': d.getHours(),
    'h': d.getHours() % 12 || 12,
    'm': d.getMinutes(),
    's': d.getSeconds(),
    'A': d.getHours() >= 12 ? 'PM' : 'AM',
    'a': d.getHours() >= 12 ? 'pm' : 'am',
    'Z': d.toISOString().match(/Z$/) ? 'Z' : d.toString().match(/([+-]\d{4})/)?.[1] || ''
  };

  // Replace tokens in format string
  return format.replace(/YYYY|MM|DD|HH|mm|ss|sss|M|D|H|h|m|s|A|a|Z/g, match => tokens[match]);
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @param {Date|string|number} relativeTo - Reference date (default: now)
 * @returns {string}
 */
function formatRelativeTime(date, relativeTo = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const r = relativeTo instanceof Date ? relativeTo : new Date(relativeTo);
  const diffMs = r.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDateTime(d, 'short');
}

/**
 * Get the start of a day
 * @param {Date|string|number} date - Input date
 * @returns {Date}
 */
function startOfDay(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a day
 * @param {Date|string|number} date - Input date
 * @returns {Date}
 */
function endOfDay(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add time to a date
 * @param {Date|string|number} date - Input date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (ms, s, m, h, d, w, M, y)
 * @returns {Date}
 */
function addTime(date, amount, unit) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  if (unit === 'M') {
    d.setMonth(d.getMonth() + amount);
  } else if (unit === 'y') {
    d.setFullYear(d.getFullYear() + amount);
  } else {
    d.setTime(d.getTime() + (amount * (multipliers[unit] || 1)));
  }

  return d;
}

/**
 * Get the difference between two dates
 * @param {Date|string|number} dateA - First date
 * @param {Date|string|number} dateB - Second date
 * @param {string} unit - Unit for result (ms, s, m, h, d)
 * @returns {number}
 */
function diff(dateA, dateB, unit = 'ms') {
  const a = dateA instanceof Date ? dateA : new Date(dateA);
  const b = dateB instanceof Date ? dateB : new Date(dateB);
  const diffMs = a.getTime() - b.getTime();

  const divisors = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return Math.floor(diffMs / (divisors[unit] || 1));
}

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean}
 */
function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Check if a date is within a range
 * @param {Date|string|number} date - Date to check
 * @param {Date|string|number} start - Start of range
 * @param {Date|string|number} end - End of range
 * @returns {boolean}
 */
function isWithinRange(date, start, end) {
  const d = date instanceof Date ? date : new Date(date);
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  return d >= s && d <= e;
}

/**
 * Parse a date string safely
 * @param {string} str - Date string
 * @param {Date} fallback - Fallback date if parsing fails
 * @returns {Date}
 */
function parseDate(str, fallback = new Date()) {
  if (!str) return fallback;
  
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * Get week number of a date
 * @param {Date|string|number} date - Input date
 * @returns {number}
 */
function getWeekNumber(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil((diff + start.getDay() * 24 * 60 * 60 * 1000) / oneWeek);
}

/**
 * Get the current week range (Monday to Sunday)
 * @param {Date|string|number} date - Reference date
 * @returns {Object} { start, end }
 */
function getWeekRange(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Format duration in milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @param {Object} options - Formatting options
 * @returns {string}
 */
function formatDuration(ms, options = {}) {
  const { includeMs = false, short = false } = options;
  
  if (ms < 1000) {
    return includeMs ? `${Math.round(ms)}ms` : '< 1s';
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (short) {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);
  if (seconds % 60 > 0 && parts.length < 2) {
    parts.push(`${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}`);
  }

  return parts.join(', ') || '0 seconds';
}

/**
 * Create a timestamp string for filenames
 * @returns {string}
 */
function timestampForFilename() {
  return formatDateTime(new Date(), 'filename');
}

/**
 * Sleep for a duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  // Formatting
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  DATE_FORMATS,
  
  // Manipulation
  addTime,
  diff,
  startOfDay,
  endOfDay,
  
  // Queries
  isToday,
  isWithinRange,
  parseDate,
  getWeekNumber,
  getWeekRange,
  
  // Utilities
  timestampForFilename,
  sleep,
  pad
};
