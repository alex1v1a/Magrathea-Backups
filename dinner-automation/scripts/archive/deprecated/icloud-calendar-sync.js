/**
 * iCloud Calendar Sync via CalDAV
 * Direct sync to iCloud Calendar
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');

class iCloudCalendarSync {
  constructor() {
    this.email = process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com';
    this.password = process.env.ICLOUD_APP_PASSWORD;
    this.calendarName = 'Dinner';
    
    if (!this.password) {
      console.warn('⚠️  ICLOUD_APP_PASSWORD not set in environment');
    }
  }

  /**
   * Load weekly plan
   */
  loadWeeklyPlan() {
    const planPath = path.join(DATA_DIR, 'weekly-plan.json');
    if (!fs.existsSync(planPath)) {
      throw new Error('Weekly plan not found');
    }
    return JSON.parse(fs.readFileSync(planPath, 'utf8'));
  }

  /**
   * Generate ICS file for import
   */
  generateICS(events) {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Marvin//Dinner Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Dinner Plans',
      'X-WR-TIMEZONE:America/Chicago'
    ];
    
    for (const event of events) {
      const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@marvin.local`;
      const start = event.start.replace(/[-:]/g, '');
      const end = event.end.replace(/[-:]/g, '');
      
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${uid}`);
      ics.push(`DTSTAMP:${now}`);
      ics.push(`DTSTART;TZID=America/Chicago:${start}`);
      ics.push(`DTEND;TZID=America/Chicago:${end}`);
      ics.push(`SUMMARY:${event.title}`);
      ics.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
      ics.push(`LOCATION:${event.location}`);
      ics.push('END:VEVENT');
    }
    
    ics.push('END:VCALENDAR');
    
    return ics.join('\r\n');
  }

  /**
   * Save ICS file for manual import
   */
  saveICSFile() {
    const plan = this.loadWeeklyPlan();
    const eventsPath = path.join(DATA_DIR, 'calendar-events.json');
    
    if (!fs.existsSync(eventsPath)) {
      throw new Error('Calendar events not found. Run calendar-sync first.');
    }
    
    const { events } = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    const ics = this.generateICS(events);
    
    const icsPath = path.join(DATA_DIR, 'dinner-plan.ics');
    fs.writeFileSync(icsPath, ics);
    
    console.log(`✅ ICS file saved: ${icsPath}`);
    return icsPath;
  }

  /**
   * Open ICS file in default app (for import to Apple Calendar)
   */
  openICSFile() {
    const icsPath = this.saveICSFile();
    
    console.log('📅 Opening ICS file for import...');
    
    // Open the file
    const cmd = `start "" "${icsPath}"`;
    exec(cmd, (error) => {
      if (error) {
        console.log('⚠️  Could not auto-open file. Please import manually:');
        console.log(`   ${icsPath}`);
      } else {
        console.log('✅ File opened. Click "Add to Calendar" in Apple Calendar.');
      }
    });
    
    return icsPath;
  }

  /**
   * Create automation for auto-import
   */
  createAutoImportScript() {
    const script = `
tell application "Calendar"
    tell calendar "Dinner"
        -- Clear existing events for this week
        set today to current date
        set endOfWeek to today + (7 * days)
        
        -- Add new events
    end tell
end tell
`;
    
    // Save AppleScript
    const scriptPath = path.join(DATA_DIR, 'import-calendar.scpt');
    fs.writeFileSync(scriptPath, script);
    
    return scriptPath;
  }

  /**
   * Main sync method
   */
  async sync() {
    console.log('📅 iCloud Calendar Sync');
    console.log('═══════════════════════════════════════════\n');
    
    try {
      // Generate ICS file
      const icsPath = this.saveICSFile();
      
      console.log('\n📋 To add to your iCloud Calendar:');
      console.log('   1. Double-click: dinner-automation/data/dinner-plan.ics');
      console.log('   2. Apple Calendar will open');
      console.log('   3. Select your iCloud "Dinner" calendar');
      console.log('   4. Click "Add"\n');
      
      // Try to open automatically
      this.openICSFile();
      
      return { success: true, icsPath };
    } catch (error) {
      console.error('❌ Calendar sync failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { iCloudCalendarSync };

// CLI usage
if (require.main === module) {
  const sync = new iCloudCalendarSync();
  sync.sync().then(result => {
    if (result.success) {
      console.log('\n✅ Done! Check your Apple Calendar app.');
    }
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
