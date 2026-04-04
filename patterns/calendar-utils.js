/**
 * Optimized Calendar Sync
 * Incremental sync with change tracking
 */

const { getCalDAVConfig } = require('../patterns/credentials');

// Optional tsdav for CalDAV
let tsdav;
try {
  tsdav = require('tsdav');
} catch (e) {
  // tsdav not installed
}
const { withRetry, sleep } = require('../patterns/retry-utils');
const { logger } = require('../patterns/logger');
const fs = require('fs').promises;
const path = require('path');

const SYNC_STATE_FILE = path.join(process.cwd(), 'data', 'calendar-sync-state.json');

/**
 * Load sync state for incremental syncing
 */
async function loadSyncState() {
  try {
    const data = await fs.readFile(SYNC_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      lastSync: null,
      syncTokens: {},
      eventEtags: {}
    };
  }
}

/**
 * Save sync state
 */
async function saveSyncState(state) {
  try {
    await fs.mkdir(path.dirname(SYNC_STATE_FILE), { recursive: true });
    await fs.writeFile(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger.warn('Failed to save sync state:', e.message);
  }
}

/**
 * Parse iCalendar data
 */
function parseICal(icalData) {
  const event = {
    id: '',
    title: '',
    description: '',
    start: null,
    end: null,
    location: '',
    allDay: false
  };
  
  const uidMatch = icalData.match(/UID:([^\r\n]+)/);
  if (uidMatch) event.id = uidMatch[1];
  
  const summaryMatch = icalData.match(/SUMMARY:([^\r\n]+)/);
  if (summaryMatch) event.title = summaryMatch[1];
  
  const descMatch = icalData.match(/DESCRIPTION:([\s\S]*?)(?=\n[A-Z]+:|\nEND:VEVENT)/);
  if (descMatch) event.description = descMatch[1].replace(/\\n/g, '\n').replace(/\\,/g, ',');
  
  const locationMatch = icalData.match(/LOCATION:([^\r\n]+)/);
  if (locationMatch) event.location = locationMatch[1];
  
  const dtStartMatch = icalData.match(/DTSTART[^:]*:([^\r\n]+)/);
  const dtEndMatch = icalData.match(/DTEND[^:]*:([^\r\n]+)/);
  
  if (dtStartMatch) {
    const dtStart = dtStartMatch[1];
    event.allDay = dtStart.length === 8;
    event.start = parseDateTime(dtStart);
  }
  
  if (dtEndMatch) {
    event.end = parseDateTime(dtEndMatch[1]);
  }
  
  return event;
}

function parseDateTime(dtStr) {
  if (!dtStr) return null;
  if (dtStr.length === 8) {
    return `${dtStr.slice(0, 4)}-${dtStr.slice(4, 6)}-${dtStr.slice(6, 8)}`;
  }
  const base = `${dtStr.slice(0, 4)}-${dtStr.slice(4, 6)}-${dtStr.slice(6, 8)}T${dtStr.slice(9, 11)}:${dtStr.slice(11, 13)}:${dtStr.slice(13, 15)}`;
  return dtStr.endsWith('Z') ? `${base}Z` : base;
}

/**
 * Incremental calendar sync
 */
async function incrementalSync(options = {}) {
  if (!tsdav) {
    throw new Error('tsdav not installed. Run: npm install tsdav');
  }
  
  const { DAVClient, fetchCalendars, fetchCalendarObjects } = tsdav;
  
  const { 
    fullSync = false,
    onProgress = null 
  } = options;
  
  logger.section('INCREMENTAL CALENDAR SYNC');
  
  const state = await loadSyncState();
  const config = getCalDAVConfig();
  
  return withRetry(async () => {
    const davClient = new DAVClient(config);
    await davClient.login();
    
    logger.info('Connected to iCloud CalDAV');
    
    // Fetch calendars
    const calendars = await fetchCalendars({
      account: davClient.account,
      headers: davClient.authHeaders
    });
    
    logger.info(`Found ${calendars.length} calendars`);
    
    const allEvents = [];
    const changes = { added: [], updated: [], removed: [] };
    
    for (const calendar of calendars) {
      const calName = calendar.displayName || 'Unnamed';
      logger.info(`Syncing "${calName}"...`);
      
      // Check if we can do incremental sync
      const syncToken = state.syncTokens[calendar.url];
      const canIncremental = !fullSync && syncToken && calendar.syncToken === syncToken;
      
      // Fetch events
      const events = await fetchCalendarObjects({
        calendar,
        headers: davClient.authHeaders
      });
      
      logger.info(`  Found ${events.length} events`);
      
      // Track current event URLs
      const currentEventUrls = new Set();
      
      for (const event of events) {
        currentEventUrls.add(event.url);
        
        const parsed = parseICal(event.calendarData || event.data || '');
        if (!parsed.id) continue;
        
        const localEvent = {
          id: parsed.id,
          title: parsed.title || 'Untitled',
          description: parsed.description || '',
          start: parsed.start,
          end: parsed.end,
          allDay: parsed.allDay,
          location: parsed.location || '',
          calendarName: calName,
          url: event.url,
          etag: event.etag
        };
        
        // Check if this is new or updated
        const oldEtag = state.eventEtags[event.url];
        if (!oldEtag) {
          changes.added.push(localEvent);
        } else if (oldEtag !== event.etag) {
          changes.updated.push(localEvent);
        }
        
        state.eventEtags[event.url] = event.etag;
        allEvents.push(localEvent);
      }
      
      // Find removed events
      const knownUrls = Object.keys(state.eventEtags).filter(url => 
        state.eventEtags[url].calendarUrl === calendar.url
      );
      for (const url of knownUrls) {
        if (!currentEventUrls.has(url)) {
          changes.removed.push(url);
          delete state.eventEtags[url];
        }
      }
      
      // Save sync token for next time
      state.syncTokens[calendar.url] = calendar.syncToken;
    }
    
    // Update sync state
    state.lastSync = new Date().toISOString();
    await saveSyncState(state);
    
    logger.section('SYNC SUMMARY');
    logger.info(`Total events: ${allEvents.length}`);
    logger.info(`Added: ${changes.added.length}`);
    logger.info(`Updated: ${changes.updated.length}`);
    logger.info(`Removed: ${changes.removed.length}`);
    
    return {
      events: allEvents,
      changes,
      lastSync: state.lastSync
    };
    
  }, {
    maxRetries: 3,
    onRetry: (attempt, max, delay) => {
      logger.warn(`Sync retry ${attempt}/${max} after ${delay}ms`);
    }
  });
}

/**
 * Convert local event to iCalendar format
 */
function eventToICal(event) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = event.id?.startsWith('local-') ? event.id : `local-${event.id || Date.now()}`;
  
  const formatDateTime = (dt) => {
    if (!dt) return '';
    if (event.allDay) return dt.replace(/-/g, '');
    return dt.replace(/[-:]/g, '').replace('Z', '');
  };
  
  const dtStart = formatDateTime(event.start);
  const dtEnd = formatDateTime(event.end);
  
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marvin Dashboard//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:America/Chicago
BEGIN:DAYLIGHT
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
TZNAME:CDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
TZNAME:CST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
CREATED:${now}
LAST-MODIFIED:${now}
SUMMARY:${event.title?.replace(/\n/g, '\\n') || 'Untitled'}
`;
  
  if (event.allDay) {
    ical += `DTSTART;VALUE=DATE:${dtStart}\n`;
    if (dtEnd) ical += `DTEND;VALUE=DATE:${dtEnd}\n`;
  } else {
    ical += `DTSTART;TZID=America/Chicago:${dtStart}\n`;
    if (dtEnd) ical += `DTEND;TZID=America/Chicago:${dtEnd}\n`;
  }
  
  if (event.description) {
    ical += `DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}\n`;
  }
  
  if (event.location) {
    ical += `LOCATION:${event.location.replace(/,/g, '\\,')}\n`;
  }
  
  ical += `END:VEVENT\nEND:VCALENDAR`;
  
  return ical;
}

module.exports = {
  incrementalSync,
  parseICal,
  eventToICal,
  loadSyncState,
  saveSyncState
};
