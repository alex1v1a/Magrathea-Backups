#!/usr/bin/env node
/**
 * iCloud CalDAV Calendar Integration for Dinner Plans
 * Creates and updates dinner events in the "Dinner" calendar at 5:00 PM daily
 * 
 * Usage:
 *   node update-calendar.js              # Update today's dinner
 *   node update-calendar.js --week       # Sync entire week (7 dinners)
 *   node update-calendar.js --force      # Force update even if exists
 */

const fs = require('fs');
const path = require('path');
const { createAccount, createCalendarObject, updateCalendarObject, deleteCalendarObject, fetchCalendarObjects } = require('tsdav');
const { v4: uuidv4 } = require('uuid');
const { format, addDays, parseISO, startOfWeek } = require('date-fns');
const { getCalDAVConfig, printSetupInstructions } = require('./credentials');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure directories exist
[DATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class CalendarSync {
  constructor() {
    this.logFile = path.join(LOGS_DIR, 'calendar-sync.log');
    this.stateFile = path.join(DATA_DIR, 'calendar-state.json');
    this.calendarName = 'Dinner';
    
    // Load CalDAV config from secure credential system
    try {
      this.icloudConfig = getCalDAVConfig();
    } catch (error) {
      console.error('Failed to load CalDAV configuration:', error.message);
      console.error('\nMake sure to set up your credentials first:\n');
      printSetupInstructions();
      throw error;
    }
    
    this.account = null;
    this.dinnerCalendar = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(`[${level.toUpperCase()}] ${message}`);
    fs.appendFileSync(this.logFile, logEntry);
  }

  /**
   * Load the saved calendar state (event IDs mapped to meals)
   */
  loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } catch (e) {
        this.log(`Error loading state: ${e.message}`, 'error');
      }
    }
    return { events: {}, lastSync: null, weekOf: null };
  }

  /**
   * Save the calendar state
   */
  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Load the weekly meal plan
   */
  loadWeeklyPlan() {
    const planFile = path.join(DATA_DIR, 'weekly-plan.json');
    if (!fs.existsSync(planFile)) {
      throw new Error('Weekly plan not found. Run dinner automation first.');
    }
    return JSON.parse(fs.readFileSync(planFile, 'utf8'));
  }

  /**
   * Initialize CalDAV connection to iCloud
   */
  async initialize() {
    this.log('Initializing CalDAV connection to iCloud...');
    
    try {
      // Create account connection
      this.account = await createAccount({
        serverUrl: this.icloudConfig.serverUrl,
        credentials: {
          username: this.icloudConfig.username,
          password: this.icloudConfig.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      this.log(`Connected to iCloud as ${this.icloudConfig.username}`);
      
      // Find or create the "Dinner" calendar
      await this.findOrCreateDinnerCalendar();
      
      return true;
    } catch (error) {
      this.log(`Failed to initialize CalDAV: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Find the "Dinner" calendar or create it if it doesn't exist
   */
  async findOrCreateDinnerCalendar() {
    this.log('Looking for "Dinner" calendar...');
    
    // Fetch all calendars
    const calendars = await this.account.fetchCalendars();
    
    // Look for existing "Dinner" calendar
    this.dinnerCalendar = calendars.find(cal => 
      cal.displayName === this.calendarName || 
      cal.displayName === `🍽️ ${this.calendarName}`
    );
    
    if (this.dinnerCalendar) {
      this.log(`Found existing "${this.calendarName}" calendar: ${this.dinnerCalendar.url}`);
    } else {
      this.log('"Dinner" calendar not found, creating...');
      
      // Create new calendar
      this.dinnerCalendar = await this.account.createCalendar({
        displayName: this.calendarName,
        color: '#FF6B35', // Warm orange for dinner
        description: 'Daily dinner plans with recipes and ingredients',
      });
      
      this.log(`Created "${this.calendarName}" calendar: ${this.dinnerCalendar.url}`);
    }
    
    return this.dinnerCalendar;
  }

  /**
   * Generate iCalendar (ICS) format event data
   */
  generateICalEvent(meal, date, existingUid = null) {
    const uid = existingUid || uuidv4();
    const dtStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const dtStart = format(date, "yyyyMMdd'T'170000"); // 5:00 PM local
    const dtEnd = format(date, "yyyyMMdd'T'180000");   // 6:00 PM local (1 hour duration)
    
    // Build description with recipe and ingredients
    const ingredientsList = meal.ingredients
      .map(ing => `• ${ing.name}${ing.amount ? ` (${ing.amount})` : ''}`)
      .join('\\n');
    
    const description = `${meal.category.toUpperCase()} | Prep: ${meal.prepTime} | Difficulty: ${meal.difficulty}

INGREDIENTS:
${ingredientsList}

Estimated Cost: $${meal.estimatedCost}`;

    // Escape special characters for iCal format
    const escapeICal = (str) => {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dinner Automation//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtStamp}
DTSTART;TZID=America/Chicago:${format(date, "yyyyMMdd'T'170000")}
DTEND;TZID=America/Chicago:${format(date, "yyyyMMdd'T'180000")}
SUMMARY:${escapeICal(`🍽️ ${meal.name}`)}
DESCRIPTION:${escapeICal(description)}
LOCATION:Dinner
CATEGORIES:Dinner,${meal.category}
STATUS:CONFIRMED
SEQUENCE:${existingUid ? '1' : '0'}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Dinner prep reminder
TRIGGER:-PT60M
END:VALARM
END:VEVENT
END:VCALENDAR`;

    return { icalData, uid };
  }

  /**
   * Create a new dinner event
   */
  async createEvent(meal, date) {
    const { icalData, uid } = this.generateICalEvent(meal, date);
    
    try {
      const result = await createCalendarObject({
        calendar: this.dinnerCalendar,
        filename: `${uid}.ics`,
        iCalString: icalData,
      });
      
      this.log(`Created event: ${meal.name} on ${format(date, 'yyyy-MM-dd')} at 5:00 PM`);
      return { success: true, uid, action: 'created' };
    } catch (error) {
      this.log(`Failed to create event: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Update an existing dinner event
   */
  async updateEvent(meal, date, existingUid) {
    const { icalData, uid } = this.generateICalEvent(meal, date, existingUid);
    
    try {
      await updateCalendarObject({
        calendarObject: {
          url: `${this.dinnerCalendar.url}${existingUid}.ics`,
          etag: null,
        },
        iCalString: icalData,
      });
      
      this.log(`Updated event: ${meal.name} on ${format(date, 'yyyy-MM-dd')} at 5:00 PM`);
      return { success: true, uid: existingUid, action: 'updated' };
    } catch (error) {
      this.log(`Failed to update event: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Find existing events for a date range
   */
  async findExistingEvents(startDate, endDate) {
    try {
      const objects = await fetchCalendarObjects({
        calendar: this.dinnerCalendar,
        timeRange: {
          start: format(startDate, "yyyy-MM-dd'T'00:00:00"),
          end: format(endDate, "yyyy-MM-dd'T'23:59:59"),
        },
      });
      
      // Parse events to find dinner events
      const events = {};
      for (const obj of objects) {
        // Extract date from the iCal data
        const dateMatch = obj.iCalString?.match(/DTSTART[^:]*(\d{8})/);
        if (dateMatch) {
          const eventDate = dateMatch[1];
          const uidMatch = obj.iCalString?.match(/UID:([^\r\n]+)/);
          const summaryMatch = obj.iCalString?.match(/SUMMARY:([^\r\n]+)/);
          
          events[eventDate] = {
            uid: uidMatch ? uidMatch[1] : null,
            summary: summaryMatch ? summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, '\n') : null,
            url: obj.url,
            etag: obj.etag,
          };
        }
      }
      
      return events;
    } catch (error) {
      this.log(`Error fetching existing events: ${error.message}`, 'warn');
      return {};
    }
  }

  /**
   * Sync a single day's dinner
   */
  async syncDay(meal, date, existingEvents = {}, force = false) {
    const dateKey = format(date, 'yyyyMMdd');
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const existingEvent = existingEvents[dateKey];
    const state = this.loadState();
    const savedEventId = state.events[dateStr]?.uid;
    
    // Check if we need to update
    if (existingEvent && !force) {
      const existingSummary = existingEvent.summary || '';
      if (existingSummary.includes(meal.name)) {
        this.log(`Event already exists for ${dateStr}: ${meal.name} (skipping)`);
        return { success: true, action: 'skipped', date: dateStr };
      }
    }
    
    // Update existing or create new
    if (existingEvent?.uid || savedEventId) {
      const uid = existingEvent?.uid || savedEventId;
      const result = await this.updateEvent(meal, date, uid);
      
      // Update state
      state.events[dateStr] = {
        uid: result.uid,
        mealName: meal.name,
        updatedAt: new Date().toISOString(),
      };
      this.saveState(state);
      
      return { ...result, date: dateStr };
    } else {
      const result = await this.createEvent(meal, date);
      
      // Update state
      state.events[dateStr] = {
        uid: result.uid,
        mealName: meal.name,
        createdAt: new Date().toISOString(),
      };
      this.saveState(state);
      
      return { ...result, date: dateStr };
    }
  }

  /**
   * Sync today's dinner only
   */
  async syncToday(force = false) {
    this.log('========================================');
    this.log('SYNCING TODAY\'S DINNER');
    this.log('========================================');
    
    const plan = this.loadWeeklyPlan();
    const today = new Date();
    const todayName = format(today, 'EEEE'); // e.g., "Thursday"
    
    const todayMeal = plan.meals.find(m => m.day === todayName);
    
    if (!todayMeal) {
      this.log(`No meal planned for ${todayName}`);
      return { status: 'no_meal', day: todayName };
    }
    
    // Find existing events for today
    const existingEvents = await this.findExistingEvents(today, today);
    
    const result = await this.syncDay(todayMeal, today, existingEvents, force);
    
    this.log('Today\'s dinner sync complete');
    return result;
  }

  /**
   * Sync the entire week (7 dinners)
   */
  async syncWeek(force = false) {
    this.log('========================================');
    this.log('SYNCING WEEKLY DINNER PLAN');
    this.log('========================================');
    
    const plan = this.loadWeeklyPlan();
    const weekOf = parseISO(plan.weekOf);
    
    // Calculate the Sunday of this week
    const weekStart = startOfWeek(weekOf, { weekStartsOn: 0 }); // Sunday
    
    // Find existing events for the week
    const weekEnd = addDays(weekStart, 6);
    const existingEvents = await this.findExistingEvents(weekStart, weekEnd);
    
    const results = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayName = dayNames[i];
      const meal = plan.meals.find(m => m.day === dayName);
      
      if (meal) {
        try {
          const result = await this.syncDay(meal, date, existingEvents, force);
          results.push({ day: dayName, ...result });
        } catch (error) {
          this.log(`Failed to sync ${dayName}: ${error.message}`, 'error');
          results.push({ day: dayName, success: false, error: error.message });
        }
      } else {
        this.log(`No meal planned for ${dayName}`);
        results.push({ day: dayName, success: false, status: 'no_meal' });
      }
    }
    
    // Update state with week info
    const state = this.loadState();
    state.lastSync = new Date().toISOString();
    state.weekOf = plan.weekOf;
    this.saveState(state);
    
    this.log(`Weekly sync complete: ${results.filter(r => r.success).length}/7 days synced`);
    
    return {
      status: 'complete',
      weekOf: plan.weekOf,
      results,
      summary: {
        total: 7,
        synced: results.filter(r => r.success).length,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        skipped: results.filter(r => r.action === 'skipped').length,
        failed: results.filter(r => !r.success && r.status !== 'no_meal').length,
      }
    };
  }

  /**
   * Delete all dinner events (useful for cleanup)
   */
  async clearCalendar() {
    this.log('Clearing all dinner events...');
    
    const startDate = new Date();
    const endDate = addDays(startDate, 30);
    
    const objects = await fetchCalendarObjects({
      calendar: this.dinnerCalendar,
      timeRange: {
        start: format(startDate, "yyyy-MM-dd'T'00:00:00"),
        end: format(endDate, "yyyy-MM-dd'T'23:59:59"),
      },
    });
    
    for (const obj of objects) {
      try {
        await deleteCalendarObject({
          calendarObject: obj,
        });
        this.log(`Deleted: ${obj.url}`);
      } catch (error) {
        this.log(`Failed to delete ${obj.url}: ${error.message}`, 'error');
      }
    }
    
    // Clear state
    this.saveState({ events: {}, lastSync: null, weekOf: null });
    this.log('Calendar cleared');
  }

  /**
   * Main entry point
   */
  async run() {
    const args = process.argv.slice(2);
    const syncWeek = args.includes('--week');
    const force = args.includes('--force');
    const clear = args.includes('--clear');
    
    try {
      await this.initialize();
      
      if (clear) {
        await this.clearCalendar();
        return { status: 'cleared' };
      }
      
      if (syncWeek) {
        return await this.syncWeek(force);
      } else {
        return await this.syncToday(force);
      }
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new CalendarSync();
  sync.run().then(result => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }).catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
}

module.exports = CalendarSync;
