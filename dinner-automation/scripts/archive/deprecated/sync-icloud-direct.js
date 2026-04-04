/**
 * Direct iCloud Calendar Import via CalDAV
 * Pushes dinner events directly to iCloud Calendar
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');

class iCloudCalDAVSync {
  constructor() {
    this.email = process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com';
    this.password = process.env.ICLOUD_APP_PASSWORD;
    
    if (!this.password) {
      throw new Error('ICLOUD_APP_PASSWORD not set in environment');
    }
    
    this.auth = 'Basic ' + Buffer.from(`${this.email}:${this.password}`).toString('base64');
    
    // iCloud uses different servers; we'll discover the correct one
    this.servers = [
      'p59-caldav.icloud.com',
      'caldav.icloud.com',
      'p55-caldav.icloud.com',
      'p57-caldav.icloud.com'
    ];
  }

  async request(server, path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: server,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': this.auth,
          'User-Agent': 'Marvin-Dinner-Planner/1.0',
          ...headers
        }
      };

      if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ 
          status: res.statusCode, 
          data, 
          headers: res.headers,
          server
        }));
      });

      req.on('error', (err) => reject(err));
      
      if (body) req.write(body);
      req.end();
    });
  }

  /**
   * Discover the correct CalDAV server
   */
  async discoverServer() {
    console.log('🔍 Discovering iCloud CalDAV server...\n');
    
    for (const server of this.servers) {
      try {
        console.log(`  Trying ${server}...`);
        const result = await this.request(server, '/', 'PROPFIND', `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`, {
          'Content-Type': 'text/xml; charset=utf-8',
          'Depth': '0'
        });
        
        if (result.status === 207 || result.status === 401) {
          // 207 = success, 401 = auth required (still valid server)
          console.log(`  ✅ Using server: ${server}\n`);
          this.server = server;
          return server;
        }
      } catch (err) {
        console.log(`  ❌ ${server} failed: ${err.message}`);
      }
    }
    
    throw new Error('Could not discover CalDAV server');
  }

  /**
   * Get current user principal
   */
  async getPrincipal() {
    console.log('🔍 Getting user principal...');
    
    const result = await this.request(this.server, '/', 'PROPFIND', `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`, {
      'Content-Type': 'text/xml; charset=utf-8',
      'Depth': '0'
    });
    
    // Parse principal
    const match = result.data.match(/<([^>]*)href[^>]*>([^<]+)<\/[^>]*href>/i);
    if (match) {
      this.principal = match[2];
      console.log(`  ✅ Principal: ${this.principal}\n`);
      return this.principal;
    }
    
    // Try well-known URI
    const wellKnown = await this.request(this.server, '/.well-known/caldav', 'GET');
    if (wellKnown.status === 302 || wellKnown.status === 301) {
      const location = wellKnown.headers.location;
      console.log(`  ✅ Found principal via well-known: ${location}\n`);
      this.principal = location;
      return location;
    }
    
    // Fallback - try common pattern
    this.principal = '/';
    return this.principal;
  }

  /**
   * Get calendar home
   */
  async getCalendarHome() {
    console.log('🔍 Finding calendar home...');
    
    const result = await this.request(this.server, this.principal, 'PROPFIND', `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`, {
      'Content-Type': 'text/xml; charset=utf-8',
      'Depth': '0'
    });
    
    // Parse calendar home
    const matches = result.data.match(/<([^>]*)href[^>]*>([^<]+)<\/[^>]*href>/gi);
    if (matches && matches.length > 0) {
      // Get the calendar-home-set href
      for (const match of matches) {
        if (match.includes('calendars') || match.includes('calendar')) {
          const href = match.replace(/<[^>]*>/g, '');
          this.calendarHome = href;
          console.log(`  ✅ Calendar home: ${this.calendarHome}\n`);
          return this.calendarHome;
        }
      }
    }
    
    // Fallback - construct from principal
    this.calendarHome = this.principal.replace('principal', 'calendars');
    if (!this.calendarHome.includes('calendars')) {
      this.calendarHome = this.calendarHome + 'calendars/';
    }
    console.log(`  ⚠️ Using fallback calendar home: ${this.calendarHome}\n`);
    return this.calendarHome;
  }

  /**
   * List calendars
   */
  async listCalendars() {
    console.log('📋 Listing calendars...');
    
    const result = await this.request(this.server, this.calendarHome, 'PROPFIND', `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`, {
      'Content-Type': 'text/xml; charset=utf-8',
      'Depth': '1'
    });
    
    const calendars = [];
    const responses = result.data.match(/<d:response[^>]*>[\s\S]*?<\/d:response>/gi) || [];
    
    for (const response of responses) {
      const hrefMatch = response.match(/<d:href>([^<]+)<\/d:href>/i);
      const nameMatch = response.match(/<d:displayname>([^<]*)<\/d:displayname>/i);
      
      // Skip non-calendar resources
      if (!response.includes('calendar') && !response.includes('VEVENT')) {
        continue;
      }
      
      if (hrefMatch) {
        const cal = {
          href: hrefMatch[1],
          name: nameMatch ? nameMatch[1] : 'Unnamed'
        };
        calendars.push(cal);
        console.log(`  📅 ${cal.name}: ${cal.href}`);
      }
    }
    
    console.log();
    return calendars;
  }

  /**
   * Find Dinner calendar or use Home calendar
   */
  async findTargetCalendar(calendars) {
    // Look for Dinner or Dinner Plans calendar
    let target = calendars.find(c => 
      c.name.toLowerCase().includes('dinner') ||
      c.name.toLowerCase().includes('dinner plans')
    );
    
    if (target) {
      console.log(`✅ Using existing calendar: ${target.name}\n`);
      return target.href;
    }
    
    // Look for Home calendar as fallback
    target = calendars.find(c => 
      c.name.toLowerCase() === 'home' ||
      c.name.toLowerCase() === 'personal' ||
      c.name.toLowerCase() === 'calendar'
    );
    
    if (target) {
      console.log(`✅ Using ${target.name} calendar\n`);
      return target.href;
    }
    
    // Use first available calendar
    if (calendars.length > 0) {
      console.log(`✅ Using first available: ${calendars[0].name}\n`);
      return calendars[0].href;
    }
    
    throw new Error('No calendars found');
  }

  /**
   * Load events
   */
  loadEvents() {
    const eventsPath = path.join(DATA_DIR, 'calendar-events.json');
    
    if (!fs.existsSync(eventsPath)) {
      throw new Error('calendar-events.json not found');
    }
    
    const data = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    return data.events || [];
  }

  /**
   * Create calendar event
   */
  async createEvent(calendarHref, event, index) {
    const uid = `dinner-${Date.now()}-${index}@marvin.local`;
    const eventPath = `${calendarHref}${uid}.ics`;
    
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    // Format dates for ICS (local time with timezone)
    const formatDT = (d) => {
      return d.toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, '');
    };
    
    const dtstart = formatDT(start);
    const dtend = formatDT(end);
    
    // Escape special characters
    const escape = (str) => str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marvin//Dinner Planner//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDT(new Date())}Z
DTSTART;TZID=America/Chicago:${dtstart}
DTEND;TZID=America/Chicago:${dtend}
SUMMARY:${escape(event.title)}
DESCRIPTION:${escape(event.description)}
LOCATION:${escape(event.location || 'Home')}
END:VEVENT
END:VCALENDAR`;

    console.log(`  📌 ${event.title} (${start.toLocaleDateString()})`);
    
    const result = await this.request(this.server, eventPath, 'PUT', ics, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': '*'
    });
    
    return {
      success: result.status === 201 || result.status === 204,
      status: result.status,
      title: event.title,
      date: start.toLocaleDateString()
    };
  }

  /**
   * Main sync
   */
  async sync() {
    console.log('📅 iCloud Calendar Direct Sync');
    console.log('═══════════════════════════════════════════\n');
    console.log('Account:', this.email);
    console.log('');
    
    try {
      // Discover server
      await this.discoverServer();
      
      // Get principal
      await this.getPrincipal();
      
      // Get calendar home
      await this.getCalendarHome();
      
      // List calendars
      const calendars = await this.listCalendars();
      
      // Find target calendar
      const targetCalendar = await this.findTargetCalendar(calendars);
      
      // Load events
      const events = this.loadEvents();
      console.log(`📝 Syncing ${events.length} dinner events...\n`);
      
      // Create events
      const results = [];
      for (let i = 0; i < events.length; i++) {
        const result = await this.createEvent(targetCalendar, events[i], i);
        results.push(result);
        
        if (result.success) {
          console.log(`     ✅ Created`);
        } else {
          console.log(`     ❌ Failed (HTTP ${result.status})`);
        }
        
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Summary
      const successCount = results.filter(r => r.success).length;
      console.log('\n═══════════════════════════════════════════');
      console.log(`✅ SYNC COMPLETE: ${successCount}/${events.length} events`);
      console.log('═══════════════════════════════════════════\n');
      
      // List created events
      console.log('Created events:');
      results.filter(r => r.success).forEach(r => {
        console.log(`  • ${r.title} - ${r.date}`);
      });
      
      return {
        success: successCount === events.length,
        created: successCount,
        total: events.length,
        results: results
      };
      
    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run
if (require.main === module) {
  const sync = new iCloudCalDAVSync();
  sync.sync().then(result => {
    if (result.success) {
      console.log('\n🎉 All dinner events synced to iCloud Calendar!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some events may not have synced correctly');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { iCloudCalDAVSync };
