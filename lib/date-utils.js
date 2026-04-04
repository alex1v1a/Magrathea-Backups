/**
 * @fileoverview Date and time utilities for formatting, parsing, and manipulation.
 * @module lib/date-utils
 */

const { ValidationError } = require('./errors');

/**
 * Format a date to a consistent string format.
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} [format='ISO'] - Format type ('ISO', 'SHORT', 'LONG', 'FILENAME', 'DISPLAY')
 * @returns {string} Formatted date string
 * @throws {ValidationError} If date is invalid
 * 
 * @example
 * formatDate(new Date(), 'ISO');      // '2024-02-13T10:30:00.000Z'
 * formatDate(new Date(), 'SHORT');    // '2024-02-13'
 * formatDate(new Date(), 'FILENAME'); // '2024-02-13_10-30-00'
 * formatDate(new Date(), 'DISPLAY');  // 'Feb 13, 2024 at 10:30 AM'
 */
function formatDate(date, format = 'ISO') {
  const d = normalizeDate(date);
  
  const formats = {
    ISO: () => d.toISOString(),
    SHORT: () => d.toISOString().split('T')[0],
    LONG: () => d.toISOString().replace('T', ' ').slice(0, 19),
    FILENAME: () => {
      const iso = d.toISOString();
      return iso.replace(/[:T]/g, '-').slice(0, 19);
    },
    DISPLAY: () => {
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },
    TIME: () => {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },
    DATE: () => {
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };
  
  const formatter = formats[format];
  if (!formatter) {
    throw new ValidationError(
      `Unknown date format: ${format}`,
      'INVALID_DATE_FORMAT',
      { metadata: { availableFormats: Object.keys(formats) } }
    );
  }
  
  return formatter();
}

/**
 * Parse a date string into a Date object.
 * 
 * @param {string|Date|number} input - Input to parse
 * @returns {Date} Parsed date
 * @throws {ValidationError} If date cannot be parsed
 * 
 * @example
 * parseDate('2024-02-13');
 * parseDate('2024-02-13T10:30:00Z');
 * parseDate(1707819000000); // timestamp
 */
function parseDate(input) {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      throw new ValidationError(
        'Invalid Date object',
        'INVALID_DATE'
      );
    }
    return input;
  }
  
  if (typeof input === 'number') {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      throw new ValidationError(
        `Invalid timestamp: ${input}`,
        'INVALID_TIMESTAMP'
      );
    }
    return date;
  }
  
  if (typeof input === 'string') {
    // Try parsing ISO format
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try common formats
    const formats = [
      // MM/DD/YYYY
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m) => new Date(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`) },
      // DD-MM-YYYY
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: (m) => new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`) },
      // YYYY.MM.DD
      { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, parse: (m) => new Date(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`) }
    ];
    
    for (const fmt of formats) {
      const match = input.match(fmt.regex);
      if (match) {
        const parsed = fmt.parse(match);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
  }
  
  throw new ValidationError(
    `Unable to parse date: ${input}`,
    'DATE_PARSE_ERROR',
    { metadata: { input: String(input) } }
  );
}

/**
 * Normalize a date input to a Date object.
 * 
 * @param {Date|string|number} date - Date to normalize
 * @returns {Date} Normalized Date object
 * @private
 */
function normalizeDate(date) {
  try {
    return parseDate(date);
  } catch (error) {
    throw new ValidationError(
      `Invalid date: ${date}`,
      'INVALID_DATE',
      { cause: error }
    );
  }
}

/**
 * Get the start of a time period for a date.
 * 
 * @param {Date|string|number} date - Reference date
 * @param {string} period - Period type ('day', 'week', 'month', 'year')
 * @returns {Date} Start of period
 * 
 * @example
 * startOf(new Date(), 'day');   // Start of today
 * startOf(new Date(), 'week');  // Start of week (Sunday)
 * startOf(new Date(), 'month'); // Start of month
 */
function startOf(date, period) {
  const d = normalizeDate(date);
  const result = new Date(d);
  
  switch (period) {
    case 'day':
      result.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
      break;
    case 'month':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'year':
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
      break;
    default:
      throw new ValidationError(
        `Unknown period: ${period}`,
        'INVALID_PERIOD',
        { metadata: { availablePeriods: ['day', 'week', 'month', 'year'] } }
      );
  }
  
  return result;
}

/**
 * Add time to a date.
 * 
 * @param {Date|string|number} date - Starting date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit ('days', 'hours', 'minutes', 'seconds', 'months', 'years')
 * @returns {Date} New date with time added
 * 
 * @example
 * addTime(new Date(), 1, 'days');
 * addTime(new Date(), -7, 'days');
 * addTime(new Date(), 30, 'minutes');
 */
function addTime(date, amount, unit) {
  const d = normalizeDate(date);
  const result = new Date(d);
  
  switch (unit) {
    case 'milliseconds':
    case 'ms':
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
    case 'seconds':
    case 's':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
    case 'm':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
    case 'h':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
    case 'd':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
    case 'w':
      result.setDate(result.getDate() + (amount * 7));
      break;
    case 'months':
    case 'M':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
    case 'y':
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      throw new ValidationError(
        `Unknown time unit: ${unit}`,
        'INVALID_TIME_UNIT',
        { metadata: { availableUnits: ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'] } }
      );
  }
  
  return result;
}

/**
 * Get difference between two dates.
 * 
 * @param {Date|string|number} dateA - First date
 * @param {Date|string|number} dateB - Second date
 * @param {string} [unit='milliseconds'] - Unit for difference
 * @returns {number} Difference in specified unit
 * 
 * @example
 * diff(new Date(), addTime(new Date(), 1, 'days'), 'hours'); // 24
 */
function diff(dateA, dateB, unit = 'milliseconds') {
  const a = normalizeDate(dateA);
  const b = normalizeDate(dateB);
  const msDiff = b.getTime() - a.getTime();
  
  const multipliers = {
    milliseconds: 1,
    ms: 1,
    seconds: 1000,
    s: 1000,
    minutes: 1000 * 60,
    m: 1000 * 60,
    hours: 1000 * 60 * 60,
    h: 1000 * 60 * 60,
    days: 1000 * 60 * 60 * 24,
    d: 1000 * 60 * 60 * 24
  };
  
  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new ValidationError(
      `Unknown unit for diff: ${unit}`,
      'INVALID_DIFF_UNIT'
    );
  }
  
  return Math.floor(msDiff / multiplier);
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * 
 * @param {number} ms - Duration in milliseconds
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.compact=false] - Use compact format
 * @returns {string} Formatted duration
 * 
 * @example
 * formatDuration(90000);        // '1 minute 30 seconds'
 * formatDuration(90000, { compact: true }); // '1m 30s'
 * formatDuration(3661000);      // '1 hour 1 minute 1 second'
 */
function formatDuration(ms, options = {}) {
  const { compact = false } = options;
  
  if (ms < 1000) {
    return compact ? `${ms}ms` : `${ms} millisecond${ms !== 1 ? 's' : ''}`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (compact) {
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
  
  if (parts.length === 0) return '0 seconds';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/**
 * Get dates for a range.
 * 
 * @param {Date|string|number} start - Start date
 * @param {Date|string|number} end - End date
 * @returns {Date[]} Array of dates in range
 * 
 * @example
 * dateRange('2024-02-01', '2024-02-05'); // 5 dates
 */
function dateRange(start, end) {
  const s = normalizeDate(start);
  const e = normalizeDate(end);
  const dates = [];
  
  let current = new Date(s);
  while (current <= e) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get relative time description.
 * 
 * @param {Date|string|number} date - Date to describe
 * @param {Date|string|number} [from=new Date()] - Reference date
 * @returns {string} Relative description
 * 
 * @example
 * relativeTime(addTime(new Date(), -1, 'hours')); // '1 hour ago'
 * relativeTime(addTime(new Date(), 1, 'days'));   // 'in 1 day'
 */
function relativeTime(date, from = new Date()) {
  const d = normalizeDate(date);
  const f = normalizeDate(from);
  const msDiff = d.getTime() - f.getTime();
  
  const absSeconds = Math.abs(Math.floor(msDiff / 1000));
  const absMinutes = Math.floor(absSeconds / 60);
  const absHours = Math.floor(absMinutes / 60);
  const absDays = Math.floor(absHours / 24);
  
  let value, unit;
  
  if (absDays > 0) {
    value = absDays;
    unit = 'day';
  } else if (absHours > 0) {
    value = absHours;
    unit = 'hour';
  } else if (absMinutes > 0) {
    value = absMinutes;
    unit = 'minute';
  } else {
    value = absSeconds;
    unit = 'second';
  }
  
  const plural = value !== 1 ? 's' : '';
  const suffix = msDiff < 0 ? ' ago' : ' from now';
  
  return `${value} ${unit}${plural}${suffix}`;
}

module.exports = {
  formatDate,
  parseDate,
  startOf,
  addTime,
  diff,
  formatDuration,
  dateRange,
  relativeTime
};
