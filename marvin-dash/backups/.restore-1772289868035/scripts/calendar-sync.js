#!/usr/bin/env node
/**
 * Apple Calendar Sync Script - Using tsdav library
 * Two-way sync between iCloud CalDAV and Marvin's Dashboard
 * Run via: node scripts/calendar-sync.js
 */

const fs = require('fs').promises;
const path = require('path');
const {
  DAVClient,
  fetchCalendars,
  fetchCalendarObjects,
  createCalendarObject,
  updateCalendarObject,
  deleteCalendarObject
} = require('tsdav');

// Import progress tracker
const progress = require('./progress-tracker.js');
const TASK_ID = 'calendar-sync';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar-events.json');
const SYNC_STATE_FILE = path.join(DATA_DIR, 'calendar-sync-state.json');

// Load iCloud credentials
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const CREDENTIALS_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-credentials.json');

async function loadCredentials() {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load credentials:', error.message);
    return null;
  }
}

// iCloud CalDAV configuration (populated at runtime)
let ICLOUD_CONFIG = null;

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

// Load calendar events from file
async function loadLocalEvents() {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { events: [], lastSync: null, calendars: [], syncConfig: {} };
  }
}

// Save calendar events to file
async function saveLocalEvents(events) {
  try {
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(events, null, 2));
    return true;
  } catch (error) {
    log(`Error saving events: ${error.message}`, 'red');
    return false;
  }
}

// Convert DAV calendar object to our format
function calendarToLocalFormat(calendar) {
  return {
    id: calendar.url?.split('/').filter(Boolean).pop() || calendar.url,
    name: calendar.displayName || 'Unnamed Calendar',
    url: calendar.url,
    ctag: calendar.ctag,
    syncToken: calendar.syncToken
  };
}

// Parse iCalendar data
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

// Convert America/Chicago local time to UTC (returns ISO Z)
function localToUTC(dateStr) {
  if (!dateStr) return null;
  if (dateStr.endsWith('Z')) return dateStr;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return dateStr;
  const [_, year, month, day, hour, minute, second = '00'] = match;
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10) - 1;
  const dayNum = parseInt(day, 10);
  const hourNum = parseInt(hour, 10);
  const isDST = () => {
    if (monthNum < 2 || monthNum > 10) return false;
    if (monthNum > 2 && monthNum < 10) return true;
    if (monthNum === 2) {
      const secondSunday = 8 + ((7 - new Date(yearNum, 2, 1).getDay()) % 7);
      return dayNum > secondSunday || (dayNum === secondSunday && hourNum >= 2);
    }
    if (monthNum === 10) {
      const firstSunday = 1 + ((7 - new Date(yearNum, 10, 1).getDay()) % 7);
      return dayNum < firstSunday || (dayNum === firstSunday && hourNum < 2);
    }
    return false;
  };
  const offsetMinutes = isDST() ? 300 : 360;
  const localDate = new Date(Date.UTC(yearNum, monthNum, dayNum, hourNum, parseInt(minute, 10), parseInt(second, 10)));
  const utcDate = new Date(localDate.getTime() + offsetMinutes * 60000);
  return utcDate.toISOString();
}

function parseDateTime(dtStr) {
  if (!dtStr) return null;
  if (dtStr.length === 8) {
    return `${dtStr.slice(0, 4)}-${dtStr.slice(4, 6)}-${dtStr.slice(6, 8)}`;
  }
  const base = `${dtStr.slice(0, 4)}-${dtStr.slice(4, 6)}-${dtStr.slice(6, 8)}T${dtStr.slice(9, 11)}:${dtStr.slice(11, 13)}:${dtStr.slice(13, 15)}`;
  // If iCal time includes Z, keep UTC. Otherwise treat as America/Chicago local and convert to UTC.
  return dtStr.endsWith('Z') ? `${base}Z` : localToUTC(base);
}

// Convert DAV event to our format
function eventToLocalFormat(davEvent, calendarName) {
  try {
    const parsed = parseICal(davEvent.calendarData || davEvent.data || '');
    
    return {
      id: parsed.id || davEvent.url?.split('/').pop()?.replace('.ics', '') || `event-${Date.now()}`,
      title: parsed.title || 'Untitled Event',
      description: parsed.description || '',
      start: parsed.start,
      end: parsed.end,
      allDay: parsed.allDay,
      location: parsed.location || '',
      calendarName: calendarName,
      source: 'icloud',
      url: davEvent.url,
      etag: davEvent.etag
    };
  } catch (error) {
    log(`Error parsing event: ${error.message}`, 'yellow');
    return null;
  }
}

// Create iCalendar data from local event
function localEventToICal(event) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = event.id?.startsWith('local-') ? event.id : `local-${event.id || Date.now()}`;
  
  const formatDateTime = (dt) => {
    if (!dt) return '';
    if (event.allDay) return dt.replace(/-/g, '');
    const clean = dt.replace('Z', '');
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return '';
    const [_, y, m, d, hh, mm, ss = '00'] = match;
    // Keep local time (no Z); we will send TZID with VTIMEZONE
    return `${y}${m}${d}T${hh}${mm}${ss}`;
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

// Notify dashboard of changes
async function notifyDashboard() {
  try {
    const http = require('http');
    const data = JSON.stringify({ type: 'calendar-sync', timestamp: new Date().toISOString() });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/calendar/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.write(data);
      req.end();
    });
  } catch (error) {
    return false;
  }
}

// Update service status
async function updateServiceStatus(status, eventCount) {
  try {
    const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');
    const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
    const serviceStatus = JSON.parse(data);
    
    const service = serviceStatus.services.find(s => s.id === 'calendar-sync');
    if (service) {
      service.status = status === 'success' ? 'online' : 'warning';
      service.lastRecovery = status === 'success' ? new Date().toISOString() : service.lastRecovery;
      service.uptimeStarted = service.uptimeStarted || new Date().toISOString();
      serviceStatus.lastUpdated = new Date().toISOString();
      await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
    }
  } catch (error) {
    // Silently fail
  }
}

// Main sync function
async function sync() {
  log('', 'reset');
  log('════════════════════════════════════════', 'bright');
  log('   📅 APPLE CALENDAR SYNC (tsdav)', 'bright');
  log('   ' + new Date().toLocaleString(), 'dim');
  log('════════════════════════════════════════', 'bright');
  
  // Load credentials first
  const credentials = await loadCredentials();
  if (!credentials) {
    log('❌ Could not load iCloud credentials', 'red');
    process.exit(1);
  }
  
  // Set up ICLOUD_CONFIG with loaded credentials
  ICLOUD_CONFIG = {
    serverUrl: credentials.caldav_url || 'https://caldav.icloud.com',
    credentials: {
      username: credentials.email,
      password: credentials.app_specific_password
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  };
  
  log(`Using credentials for: ${credentials.email}`, 'dim');
  
  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
  
  // Start progress tracking BEFORE any operations that might fail
  let taskStarted = false;
  try {
    await progress.startTask(TASK_ID, 'Apple Calendar Sync', {
      description: 'Two-way sync between iCloud CalDAV and Marvin\'s Dashboard',
      category: 'sync',
      steps: ['Connect to iCloud', 'Fetch calendars', 'Download events', 'Push local events', 'Save merged events', 'Notify dashboard']
    });
    taskStarted = true;
  } catch (e) {
    log(`Warning: Could not start progress tracking: ${e.message}`, 'yellow');
    log('Continuing without progress tracking...', 'dim');
    // Create a local-only fallback so the script continues to work
    taskStarted = false;
  }
  
  let syncSuccess = false;
  let totalEvents = 0;
  let davClient;
  
  try {
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 10, 'Connecting to iCloud CalDAV...', { stepIndex: 0 });
    }
    // Create DAV client
    log('Connecting to iCloud CalDAV...', 'cyan');
    davClient = new DAVClient(ICLOUD_CONFIG);
    await davClient.login();
    log('Connected successfully', 'green');
    log(`Principal: ${davClient.account.principalUrl}`, 'dim');
    log(`Home URL: ${davClient.account.homeUrl}`, 'dim');
    
    // Fetch calendars
    log('Fetching calendars...', 'cyan');
    const calendars = await fetchCalendars({
      account: davClient.account,
      headers: davClient.authHeaders
    });
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 25, `Fetched ${calendars.length} calendars`, { stepIndex: 1 });
    }
    
    log(`Found ${calendars.length} calendars:`, 'green');
    calendars.forEach(cal => log(`  • ${cal.displayName || 'Unnamed'}`, 'dim'));
    
    // Fetch events from each calendar
    logSection('SYNCING FROM ICLOUD');
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 45, 'Downloading events from iCloud...', { stepIndex: 2 });
    }
    const allEvents = [];
    
    for (const calendar of calendars) {
      try {
        log(`Fetching events from "${calendar.displayName}"...`, 'dim');
        
        const events = await fetchCalendarObjects({
          calendar: calendar,
          headers: davClient.authHeaders
        });
        
        log(`  Found ${events.length} events`, 'dim');
        
        for (const event of events) {
          const localEvent = eventToLocalFormat(event, calendar.displayName);
          if (localEvent) {
            allEvents.push(localEvent);
          }
        }
      } catch (error) {
        log(`  Error fetching from ${calendar.displayName}: ${error.message}`, 'yellow');
      }
    }
    
    log(`Downloaded ${allEvents.length} events from iCloud`, 'green');
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 60, `Downloaded ${allEvents.length} events`, { stepIndex: 2 });
    }
    
    // Load existing local events
    const localData = await loadLocalEvents();
    
    // Merge: iCloud events take precedence
    const eventMap = new Map();
    
    // Keep local-only events that haven't been synced
    localData.events.forEach(event => {
      if (event.source === 'dashboard' || !event.source) {
        eventMap.set(event.id, event);
      }
    });
    
    // Add/overwrite with iCloud events
    allEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    const mergedEvents = Array.from(eventMap.values());
    
    // Push local events to iCloud (one-way for now)
    logSection('PUSHING TO ICLOUD');
    const localOnlyEvents = mergedEvents.filter(e => e.source === 'dashboard' || !e.source);
    let pushedCount = 0;
    
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 75, `Pushing ${localOnlyEvents.length} local events`, { stepIndex: 3 });
    }
    
    if (localOnlyEvents.length > 0 && calendars.length > 0) {
      log(`Pushing ${localOnlyEvents.length} local events...`, 'cyan');
      const homeCalendar = calendars.find(c => (c.displayName || '').toLowerCase() === 'home') || calendars[0];
      
      for (const event of localOnlyEvents) {
        try {
          const targetName = (event.calendarName || '').toLowerCase();
          const targetCalendar = calendars.find(c => (c.displayName || '').toLowerCase() === targetName) || homeCalendar;
          const icalData = localEventToICal(event);
          await createCalendarObject({
            calendar: targetCalendar,
            filename: `${event.id}.ics`,
            iCalString: icalData,
            headers: davClient.authHeaders
          });
          log(`  Created: ${event.title} -> ${targetCalendar.displayName || 'Home'}`, 'green');
          pushedCount++;
          event.source = 'icloud';
        } catch (error) {
          log(`  Failed to create ${event.title}: ${error.message}`, 'yellow');
        }
      }
    } else {
      log('No local events to push', 'dim');
    }
    
    log(`Pushed ${pushedCount} events to iCloud`, 'green');
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 85, `Pushed ${pushedCount} events to iCloud`, { stepIndex: 3 });
    }
    
    // Save merged events
    await saveLocalEvents({
      events: mergedEvents,
      lastSync: new Date().toISOString(),
      calendars: calendars.map(calendarToLocalFormat),
      syncConfig: {
        account: ICLOUD_CONFIG.credentials.username,
        syncFrequency: '15m',
        lastSyncAttempt: new Date().toISOString(),
        syncStatus: 'synced',
        eventCount: mergedEvents.length
      }
    });
    if (taskStarted) {
      await progress.updateProgress(TASK_ID, 90, 'Saved merged events', { stepIndex: 4 });
    }
    
    totalEvents = mergedEvents.length;
    syncSuccess = true;
    
  } catch (error) {
    log(`iCloud sync failed: ${error.message}`, 'yellow');
    log('Using local calendar storage', 'dim');
    
    // Only try to update progress if task was started successfully
    if (taskStarted) {
      try {
        await progress.updateProgress(TASK_ID, 50, `iCloud sync failed: ${error.message}`, { 
          log: `iCloud sync failed: ${error.message}`, 
          logLevel: 'error' 
        });
      } catch (e) {
        // Progress tracking may fail, continue anyway
        log(`Warning: Could not update progress: ${e.message}`, 'dim');
      }
    }
    
    // Update local data to show sync attempt
    const localData = await loadLocalEvents();
    if (!localData.syncConfig) localData.syncConfig = {};
    localData.syncConfig.lastSyncAttempt = new Date().toISOString();
    localData.syncConfig.syncStatus = 'local-only';
    localData.syncConfig.error = error.message;
    localData.lastSync = new Date().toISOString();
    await saveLocalEvents(localData);
    
    totalEvents = localData.events?.length || 0;
  }
  
  // Update service status
  await updateServiceStatus(syncSuccess ? 'success' : 'warning', totalEvents);
  
  // Notify dashboard
  const notified = await notifyDashboard();
  if (notified) {
    log('Dashboard notified of changes', 'green');
  }
  
  // Update progress before completing (may fail if task already completed)
  if (taskStarted) {
    try {
      await progress.updateProgress(TASK_ID, 95, 'Notified dashboard', { stepIndex: 5 });
    } catch (e) {
      // Task may already be completed, ignore
    }
  }
  
  // Complete progress tracking
  if (taskStarted) {
    try {
      if (syncSuccess) {
        await progress.completeTask(TASK_ID, {
          result: { totalEvents, pushedToIcloud: true, notified }
        });
      } else {
        await progress.completeTask(TASK_ID, {
          failed: true,
          error: 'iCloud sync failed - using local-only data',
          result: { totalEvents, notified }
        });
      }
    } catch (e) {
      log(`Warning: Could not complete progress tracking: ${e.message}`, 'yellow');
    }
  } else {
    // Task wasn't started (progress tracking unavailable), just log completion
    log(`Sync complete: ${totalEvents} events (${syncSuccess ? 'synced with iCloud' : 'local-only'})`, syncSuccess ? 'green' : 'yellow');
  }
  
  logSection('SYNC COMPLETE');
  log(`Total events: ${totalEvents}`, 'cyan');
  log(`Status: ${syncSuccess ? 'Synced with iCloud' : 'Local-only'}`, syncSuccess ? 'green' : 'yellow');
  log(`Next sync: 15 minutes`, 'dim');
  log('', 'reset');
}

// Run if called directly
if (require.main === module) {
  sync().catch(error => {
    console.error('Calendar sync failed:', error);
    process.exit(1);
  });
}

module.exports = { sync };
