#!/usr/bin/env node
/**
 * Dinner Calendar to Apple Calendar Sync Bridge (Enhanced Edition)
 * 
 * Pushes dinner plan events from dinner-automation to Apple Calendar via CalDAV
 * Includes full recipe details: instructions, cuisine origin, story, cook times
 * 
 * Usage:
 *   node scripts/sync-dinner-to-icloud.js
 */

const fs = require('fs').promises;
const path = require('path');
const { DAVClient, createCalendarObject, updateCalendarObject, fetchCalendarObjects } = require('tsdav');

const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const CREDENTIALS_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-credentials.json');
const CALENDAR_EVENTS_FILE = path.join(DINNER_DATA_DIR, 'calendar-events.json');
const RECIPE_DATABASE_FILE = path.join(DINNER_DATA_DIR, 'recipe-database.json');
const YOUTUBE_CACHE_FILE = path.join(DINNER_DATA_DIR, 'youtube-cache.json');

// iCloud CalDAV configuration (populated at runtime)
let ICLOUD_CONFIG = null;

/**
 * Load iCloud credentials
 */
async function loadCredentials() {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load credentials:', error.message);
    return null;
  }
}

// Target calendar name in iCloud
const TARGET_CALENDAR_NAME = 'Dinner';

/**
 * Load dinner events from the dinner automation
 */
async function loadDinnerEvents() {
  try {
    const data = await fs.readFile(CALENDAR_EVENTS_FILE, 'utf8');
    const calendar = JSON.parse(data);
    return calendar.events || [];
  } catch (error) {
    console.error('❌ Failed to load dinner events:', error.message);
    return [];
  }
}

/**
 * Load recipe database
 */
async function loadRecipeDatabase() {
  try {
    const data = await fs.readFile(RECIPE_DATABASE_FILE, 'utf8');
    const db = JSON.parse(data);
    return db.recipes || {};
  } catch (error) {
    console.error('⚠️ Failed to load recipe database:', error.message);
    return {};
  }
}

/**
 * Load YouTube video cache
 */
async function loadYouTubeCache() {
  try {
    const data = await fs.readFile(YOUTUBE_CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);
    return cache.videos || {};
  } catch (error) {
    console.log('⚠️ No YouTube cache found. Run build-youtube-cache.js first.');
    return {};
  }
}

/**
 * Find the Dinner calendar in iCloud
 */
async function findDinnerCalendar(client) {
  console.log('📅 Finding Dinner calendar in iCloud...');
  
  const calendars = await client.fetchCalendars();
  
  for (const calendar of calendars) {
    if (calendar.displayName === TARGET_CALENDAR_NAME || 
        calendar.displayName?.includes('Dinner')) {
      console.log(`✓ Found calendar: ${calendar.displayName} (${calendar.url})`);
      return calendar;
    }
  }
  
  // If no Dinner calendar found, list available calendars
  console.log('⚠️ No "Dinner" calendar found. Available calendars:');
  calendars.forEach(cal => console.log(`   - ${cal.displayName}`));
  
  return null;
}

/**
 * Build rich description with recipe details
 */
function buildRichDescription(event, recipe, youtubeLink = null) {
  if (!recipe) {
    // Fallback to basic description if no recipe data
    return event.description || `Dinner: ${event.title}`;
  }
  
  const lines = [];
  
  // Header
  lines.push(`🍽️  ${event.title}`);
  lines.push('');
  
  // Cuisine & Origin
  if (recipe.cuisine) {
    lines.push(`🌍 Cuisine: ${recipe.cuisine}`);
  }
  if (recipe.origin) {
    lines.push(`📍 Origin: ${recipe.origin}`);
  }
  lines.push('');
  
  // Story
  if (recipe.story) {
    lines.push('📖 The Story:');
    lines.push(recipe.story);
    lines.push('');
  }
  
  // Timing
  lines.push('⏱️  Timing:');
  if (recipe.prepTime) lines.push(`   Prep: ${recipe.prepTime}`);
  if (recipe.cookTime) lines.push(`   Cook: ${recipe.cookTime}`);
  if (recipe.totalTime) lines.push(`   Total: ${recipe.totalTime}`);
  lines.push(`   Difficulty: ${recipe.difficulty || 'Medium'}`);
  lines.push(`   Serves: ${recipe.servings || 4}`);
  lines.push('');
  
  // Ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    lines.push('🛒 Ingredients:');
    recipe.ingredients.forEach(ing => {
      lines.push(`   • ${ing}`);
    });
    lines.push('');
  }
  
  // Instructions
  if (recipe.instructions && recipe.instructions.length > 0) {
    lines.push('👨‍🍳 Instructions:');
    recipe.instructions.forEach((step, idx) => {
      lines.push(`   ${idx + 1}. ${step}`);
    });
    lines.push('');
  }
  
  // YouTube Video Link
  if (youtubeLink) {
    lines.push('🎥 How to Cook This Recipe:');
    lines.push(`   Watch on YouTube: ${youtubeLink}`);
    lines.push('');
  }
  
  // Tips
  if (recipe.tips) {
    lines.push('💡 Chef\'s Tip:');
    lines.push(`   ${recipe.tips}`);
    lines.push('');
  }
  
  // Wine pairing
  if (recipe.winePairing) {
    lines.push(`🍷 Wine Pairing: ${recipe.winePairing}`);
    lines.push('');
  }
  
  // Cost estimate
  if (recipe.cost) {
    lines.push(`💰 Estimated Cost: ${recipe.cost}`);
  }
  
  return lines.join('\n');
}

/**
 * Generate ICS event content from dinner event
 */
function generateICSEvent(event, calendarUrl, recipe, youtubeVideo = null) {
  const now = new Date();
  const dtstamp = formatICSTimestamp(now);
  const dtstart = formatICSTimestamp(new Date(event.start));
  const dtend = formatICSTimestamp(new Date(event.end));
  
  // Build rich description with YouTube link
  const youtubeLink = youtubeVideo ? youtubeVideo.url : null;
  const description = buildRichDescription(event, recipe, youtubeLink);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marvin//Dinner Automation//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/Chicago:${dtstart}`,
    `DTEND;TZID=America/Chicago:${dtend}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(event.location || 'Home')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Format date to ICS timestamp (YYYYMMDDTHHMMSS)
 */
function formatICSTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Escape special characters for ICS
 */
function escapeICS(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Check if event already exists in calendar
 */
async function findExistingEvent(client, calendar, uid) {
  try {
    const objects = await client.fetchCalendarObjects({ calendar });
    
    for (const obj of objects) {
      if (obj.data && obj.data.includes(`UID:${uid}`)) {
        return obj;
      }
    }
  } catch (error) {
    // Ignore errors, assume not found
  }
  return null;
}

/**
 * Sync dinner events to Apple Calendar
 */
async function syncDinnerToiCloud() {
  console.log('🍽️  Syncing dinner events to Apple Calendar...\n');
  
  // Load credentials
  const credentials = await loadCredentials();
  if (!credentials) {
    console.error('❌ Could not load iCloud credentials');
    return { success: false, reason: 'no_credentials' };
  }
  
  // Set up ICLOUD_CONFIG
  ICLOUD_CONFIG = {
    serverUrl: credentials.caldav_url || 'https://caldav.icloud.com',
    credentials: {
      username: credentials.email,
      password: credentials.app_specific_password
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  };
  
  console.log(`Using credentials for: ${credentials.email}\n`);
  
  // Load dinner events and recipe database
  const events = await loadDinnerEvents();
  if (events.length === 0) {
    console.log('⚠️ No dinner events to sync');
    return { success: false, reason: 'no_events' };
  }
  
  const recipes = await loadRecipeDatabase();
  const youtubeCache = await loadYouTubeCache();
  console.log(`📋 Loaded ${events.length} dinner events`);
  console.log(`📚 Loaded ${Object.keys(recipes).length} recipes`);
  console.log(`🎬 Loaded ${Object.keys(youtubeCache).length} YouTube videos\n`);
  
  // Create DAV client
  const client = new DAVClient({
    serverUrl: ICLOUD_CONFIG.serverUrl,
    credentials: ICLOUD_CONFIG.credentials,
    authMethod: ICLOUD_CONFIG.authMethod,
    defaultAccountType: ICLOUD_CONFIG.defaultAccountType
  });
  
  // Login
  console.log('🔐 Logging into iCloud...');
  await client.login();
  console.log('✓ Logged in\n');
  
  // Find Dinner calendar
  const dinnerCalendar = await findDinnerCalendar(client);
  if (!dinnerCalendar) {
    console.error('❌ Could not find Dinner calendar. Please create it in Apple Calendar first.');
    return { success: false, reason: 'no_calendar' };
  }
  
  // Sync each event
  let created = 0;
  let updated = 0;
  let failed = 0;
  
  for (const event of events) {
    try {
      console.log(`📝 ${event.title} (${event.start.split('T')[0]})`);
      
      // Find matching recipe
      const recipe = recipes[event.title];
      if (recipe) {
        console.log(`   📖 Recipe found: ${recipe.cuisine}`);
      } else {
        console.log(`   ⚠️ No detailed recipe found`);
      }
      
      // Find matching YouTube video
      const youtubeVideo = youtubeCache[event.title];
      if (youtubeVideo) {
        console.log(`   🎬 YouTube video: ${youtubeVideo.title.substring(0, 40)}...`);
      }
      
      // Check if event already exists
      const existing = await findExistingEvent(client, dinnerCalendar, event.uid);
      
      const icsContent = generateICSEvent(event, dinnerCalendar.url, recipe, youtubeVideo);
      
      if (existing) {
        // Update existing event
        await client.updateCalendarObject({
          calendarObject: {
            url: existing.url,
            data: icsContent,
            etag: existing.etag
          }
        });
        console.log('   ✓ Updated with recipe + YouTube link\n');
        updated++;
      } else {
        // Create new event
        await client.createCalendarObject({
          calendar: dinnerCalendar,
          filename: `${event.uid}.ics`,
          iCalString: icsContent
        });
        console.log('   ✓ Created with recipe + YouTube link\n');
        created++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('📊 Sync Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed:  ${failed}`);
  
  return {
    success: failed === 0,
    created,
    updated,
    failed,
    total: events.length
  };
}

// CLI usage
if (require.main === module) {
  syncDinnerToiCloud()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Dinner events synced to Apple Calendar!');
        console.log('   Includes: Full recipes + YouTube cooking videos');
        process.exit(0);
      } else if (result.reason === 'no_calendar') {
        console.log('\n⚠️ Please create a "Dinner" calendar in Apple Calendar first.');
        process.exit(2);
      } else {
        console.log('\n⚠️ Some events failed to sync');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { syncDinnerToiCloud };
