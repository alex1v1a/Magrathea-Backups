/**
 * Direct iCloud CalDAV Client
 * Pushes events directly to iCloud without Outlook
 */

const https = require('https');
const { URL } = require('url');

class iCloudCalDAV {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.server = 'p59-caldav.icloud.com';
    this.auth = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');
  }

  async request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.server,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': this.auth,
          'Content-Type': 'text/xml; charset=utf-8',
          'User-Agent': 'Marvin-Dinner-Planner/1.0',
          'Depth': '1'
        }
      };

      if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });

      req.on('error', reject);
      
      if (body) req.write(body);
      req.end();
    });
  }

  async findCalendar(name) {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`;

    const result = await this.request('/25480544858/calendars/', 'PROPFIND', body);
    
    // Parse response to find calendar URL
    if (result.data.includes(name)) {
      // Extract calendar URL from response
      const match = result.data.match(new RegExp(`<[^>]*href[^>]*>([^\u003c]*${name}[^\u003c]*)<`));
      if (match) return match[1];
    }
    
    return null;
  }

  async createEvent(calendarUrl, event) {
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = `${calendarUrl}${uid}.ics`;
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marvin//Dinner//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${this.formatDate(new Date())}
DTSTART:${this.formatDate(new Date(event.start))}
DTEND:${this.formatDate(new Date(event.end))}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location || 'Home'}
END:VEVENT
END:VCALENDAR`;

    const result = await this.request(url, 'PUT', ics);
    return result.status === 201 || result.status === 204;
  }

  formatDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}

module.exports = { iCloudCalDAV };

// Test
if (require.main === module) {
  const client = new iCloudCalDAV(
    process.env.ICLOUD_EMAIL,
    process.env.ICLOUD_APP_PASSWORD
  );
  
  console.log('iCloud CalDAV client created');
  console.log('Email:', client.email);
  console.log('Server:', client.server);
}
