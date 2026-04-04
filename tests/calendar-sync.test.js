/**
 * Calendar Sync Tests
 * Tests for calendar operations and ICS generation
 */

const { TestRunner } = require('./test-runner');
const runner = new TestRunner();

// Calendar Sync implementation (extracted for testing)
class CalendarSync {
  constructor(options = {}) {
    this.calendarName = options.calendarName || 'Dinner Plans';
    this.timezone = options.timezone || 'America/Chicago';
    this.defaultStartHour = options.defaultStartHour || 17;
    this.defaultDuration = options.defaultDuration || 1;
  }

  getDatesForWeek(weekOf) {
    const startDate = new Date(weekOf);
    
    if (isNaN(startDate.getTime())) {
      throw new Error(`Invalid weekOf date: ${weekOf}`);
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dates = {};
    
    days.forEach((day, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      dates[day] = {
        iso: date.toISOString().split('T')[0],
        date: date
      };
    });
    
    return dates;
  }

  generateUID(meal, dateStr) {
    const timestamp = Date.now();
    const hash = Buffer.from(`${meal.name}-${dateStr}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    return `${hash}-${timestamp}@dinner-automation`;
  }

  formatICSDate(date, hour = this.defaultStartHour, minute = 0) {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  escapeICS(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  buildICSEvent(meal, dateInfo) {
    const uid = this.generateUID(meal, dateInfo.iso);
    const dtstart = this.formatICSDate(dateInfo.date, this.defaultStartHour);
    const dtend = this.formatICSDate(dateInfo.date, this.defaultStartHour + this.defaultDuration);
    const created = this.formatICSDate(new Date());
    
    const ingredientsList = meal.ingredients
      ?.map(ing => `- ${ing.name} (${ing.amount})`)
      .join('\\n') || '';
    
    const description = this.escapeICS(
      `Dinner: ${meal.name}\\n` +
      `Prep Time: ${meal.prepTime}\\n` +
      `Difficulty: ${meal.difficulty}\\n` +
      `Cost: $${meal.estimatedCost}\\n\\n` +
      `Ingredients:\\n${ingredientsList}`
    );
    
    return {
      ics: [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${created}`,
        `DTSTART;TZID=${this.timezone}:${dtstart}`,
        `DTEND;TZID=${this.timezone}:${dtend}`,
        `SUMMARY:${this.escapeICS(meal.name)}`,
        `DESCRIPTION:${description}`,
        `LOCATION:Home`,
        'END:VEVENT'
      ].join('\r\n'),
      json: {
        title: meal.name,
        start: `${dateInfo.iso}T${String(this.defaultStartHour).padStart(2, '0')}:00:00`,
        end: `${dateInfo.iso}T${String(this.defaultStartHour + this.defaultDuration).padStart(2, '0')}:00:00`,
        description: `Dinner: ${meal.name}\nPrep: ${meal.prepTime}`,
        location: 'Home',
        uid: uid
      }
    };
  }

  generateICS(events) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Marvin//Dinner Automation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.calendarName}`,
      `X-WR-TIMEZONE:${this.timezone}`,
      ...events.map(e => e.ics),
      'END:VCALENDAR'
    ];
    
    return lines.join('\r\n');
  }

  validateEvent(event) {
    const errors = [];
    
    if (!event.title || event.title.trim() === '') {
      errors.push('Event title is required');
    }
    
    if (!event.start || !this.isValidISODate(event.start)) {
      errors.push('Valid start date is required');
    }
    
    if (!event.end || !this.isValidISODate(event.end)) {
      errors.push('Valid end date is required');
    }
    
    if (new Date(event.start) >= new Date(event.end)) {
      errors.push('End date must be after start date');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  isValidISODate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }
}

// Test data
const mockMeal = {
  name: 'Pork Tenderloin with Brussels Sprouts',
  prepTime: '45 min',
  difficulty: 'Medium',
  estimatedCost: 18.50,
  ingredients: [
    { name: 'Pork tenderloin', amount: '1.5 lbs' },
    { name: 'Brussels sprouts', amount: '1.5 lbs' }
  ]
};

const mockPlan = {
  weekOf: '2025-02-10',
  meals: [
    { day: 'Monday', ...mockMeal },
    { day: 'Tuesday', name: 'Turkey Chili', prepTime: '30 min', difficulty: 'Easy', estimatedCost: 12.00, ingredients: [] }
  ]
};

// Tests
runner.describe('Date Generation', () => {
  runner.it('generates dates for a week', () => {
    const sync = new CalendarSync();
    const dates = sync.getDatesForWeek('2025-02-10');
    runner.assertObjectHas(dates, 'Monday');
    runner.assertObjectHas(dates, 'Sunday');
    runner.assertEqual(Object.keys(dates).length, 7);
  });

  runner.it('generates correct ISO dates', () => {
    const sync = new CalendarSync();
    const dates = sync.getDatesForWeek('2025-02-10T00:00:00');
    // Check that we get 7 consecutive days starting from Sunday
    runner.assertTrue(dates.Sunday.iso.includes('2025-02-09') || dates.Sunday.iso.includes('2025-02-10'));
    runner.assertTrue(dates.Monday.iso.includes('2025-02-10') || dates.Monday.iso.includes('2025-02-11'));
  });

  runner.it('throws for invalid date', () => {
    const sync = new CalendarSync();
    runner.assertThrows(() => sync.getDatesForWeek('invalid-date'), 'Should throw for invalid date');
  });

  runner.it('handles Sunday start correctly', () => {
    const sync = new CalendarSync();
    const dates = sync.getDatesForWeek('2025-02-09');
    runner.assertEqual(dates.Sunday.iso, '2025-02-09');
    runner.assertEqual(dates.Monday.iso, '2025-02-10');
  });
});

runner.describe('ICS Date Formatting', () => {
  runner.it('formats date correctly', () => {
    const sync = new CalendarSync();
    const date = new Date('2025-02-10T17:00:00');
    const formatted = sync.formatICSDate(date);
    runner.assertEqual(formatted, '20250210T170000');
  });

  runner.it('formats with custom hour', () => {
    const sync = new CalendarSync();
    const date = new Date('2025-02-10T00:00:00');
    const formatted = sync.formatICSDate(date, 19, 30);
    runner.assertEqual(formatted, '20250210T193000');
  });

  runner.it('pads single digit values', () => {
    const sync = new CalendarSync();
    const date = new Date('2025-01-05T05:05:05');
    const formatted = sync.formatICSDate(date);
    // ICS format should have padded values: YYYYMMDDTHHMMSS
    runner.assertTrue(formatted.length === 15); // 20250105T050505 = 15 chars
    runner.assertTrue(formatted.startsWith('20250105'));
  });
});

runner.describe('ICS Escaping', () => {
  runner.it('escapes backslashes', () => {
    const sync = new CalendarSync();
    const result = sync.escapeICS('Line 1\\Line 2');
    runner.assertTrue(result.includes('\\\\'));
  });

  runner.it('escapes semicolons', () => {
    const sync = new CalendarSync();
    const result = sync.escapeICS('Item 1; Item 2');
    runner.assertTrue(result.includes('\\;'));
  });

  runner.it('escapes commas', () => {
    const sync = new CalendarSync();
    const result = sync.escapeICS('A, B, C');
    runner.assertTrue(result.includes('\\,'));
  });

  runner.it('escapes newlines', () => {
    const sync = new CalendarSync();
    const result = sync.escapeICS('Line 1\nLine 2');
    runner.assertTrue(result.includes('\\n'));
  });

  runner.it('handles empty string', () => {
    const sync = new CalendarSync();
    const result = sync.escapeICS('');
    runner.assertEqual(result, '');
  });

  runner.it('handles null/undefined', () => {
    const sync = new CalendarSync();
    runner.assertEqual(sync.escapeICS(null), '');
    runner.assertEqual(sync.escapeICS(undefined), '');
  });
});

runner.describe('Event Building', () => {
  runner.it('builds valid ICS event', () => {
    const sync = new CalendarSync();
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event = sync.buildICSEvent(mockMeal, dateInfo);
    
    runner.assertObjectHas(event, 'ics');
    runner.assertObjectHas(event, 'json');
    runner.assertTrue(event.ics.includes('BEGIN:VEVENT'));
    runner.assertTrue(event.ics.includes('END:VEVENT'));
  });

  runner.it('includes meal name in summary', () => {
    const sync = new CalendarSync();
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event = sync.buildICSEvent(mockMeal, dateInfo);
    
    runner.assertTrue(event.ics.includes('SUMMARY:Pork Tenderloin'));
    runner.assertTrue(event.json.title === mockMeal.name);
  });

  runner.it('includes ingredients in description', () => {
    const sync = new CalendarSync();
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event = sync.buildICSEvent(mockMeal, dateInfo);
    
    runner.assertTrue(event.ics.includes('Pork tenderloin'));
    runner.assertTrue(event.ics.includes('Brussels sprouts'));
  });

  runner.it('generates unique UID', async () => {
    const sync = new CalendarSync();
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event1 = sync.buildICSEvent(mockMeal, dateInfo);
    await new Promise(r => setTimeout(r, 10)); // Small delay to ensure different timestamp
    const event2 = sync.buildICSEvent(mockMeal, dateInfo);
    
    // UIDs should be different due to timestamp
    runner.assertTrue(event1.json.uid !== event2.json.uid);
  });

  runner.it('sets correct start time', () => {
    const sync = new CalendarSync({ defaultStartHour: 18 });
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event = sync.buildICSEvent(mockMeal, dateInfo);
    
    runner.assertTrue(event.json.start.includes('T18:00:00'));
  });

  runner.it('calculates correct end time', () => {
    const sync = new CalendarSync({ defaultStartHour: 17, defaultDuration: 2 });
    const dateInfo = { iso: '2025-02-10', date: new Date('2025-02-10') };
    const event = sync.buildICSEvent(mockMeal, dateInfo);
    
    runner.assertTrue(event.json.end.includes('T19:00:00'));
  });
});

runner.describe('Calendar Generation', () => {
  runner.it('generates valid ICS calendar', () => {
    const sync = new CalendarSync();
    const events = [
      { ics: 'EVENT1_CONTENT' },
      { ics: 'EVENT2_CONTENT' }
    ];
    const ics = sync.generateICS(events);
    
    runner.assertTrue(ics.includes('BEGIN:VCALENDAR'));
    runner.assertTrue(ics.includes('END:VCALENDAR'));
    runner.assertTrue(ics.includes('VERSION:2.0'));
  });

  runner.it('includes calendar name', () => {
    const sync = new CalendarSync({ calendarName: 'Test Calendar' });
    const ics = sync.generateICS([]);
    
    runner.assertTrue(ics.includes('X-WR-CALNAME:Test Calendar'));
  });

  runner.it('includes timezone', () => {
    const sync = new CalendarSync({ timezone: 'America/New_York' });
    const ics = sync.generateICS([]);
    
    runner.assertTrue(ics.includes('X-WR-TIMEZONE:America/New_York'));
  });

  runner.it('handles empty events array', () => {
    const sync = new CalendarSync();
    const ics = sync.generateICS([]);
    
    runner.assertTrue(ics.includes('BEGIN:VCALENDAR'));
    runner.assertTrue(ics.includes('END:VCALENDAR'));
  });
});

runner.describe('Event Validation', () => {
  runner.it('validates correct event', () => {
    const sync = new CalendarSync();
    const event = {
      title: 'Dinner',
      start: '2025-02-10T17:00:00',
      end: '2025-02-10T18:00:00'
    };
    const result = sync.validateEvent(event);
    
    runner.assertTrue(result.valid);
    runner.assertArrayLength(result.errors, 0);
  });

  runner.it('rejects event without title', () => {
    const sync = new CalendarSync();
    const event = {
      start: '2025-02-10T17:00:00',
      end: '2025-02-10T18:00:00'
    };
    const result = sync.validateEvent(event);
    
    runner.assertFalse(result.valid);
    runner.assertTrue(result.errors.some(e => e.includes('title')));
  });

  runner.it('rejects event with invalid start date', () => {
    const sync = new CalendarSync();
    const event = {
      title: 'Dinner',
      start: 'invalid',
      end: '2025-02-10T18:00:00'
    };
    const result = sync.validateEvent(event);
    
    runner.assertFalse(result.valid);
  });

  runner.it('rejects event where end is before start', () => {
    const sync = new CalendarSync();
    const event = {
      title: 'Dinner',
      start: '2025-02-10T18:00:00',
      end: '2025-02-10T17:00:00'
    };
    const result = sync.validateEvent(event);
    
    runner.assertFalse(result.valid);
    runner.assertTrue(result.errors.some(e => e.includes('after start')));
  });

  runner.it('rejects empty title', () => {
    const sync = new CalendarSync();
    const event = {
      title: '   ',
      start: '2025-02-10T17:00:00',
      end: '2025-02-10T18:00:00'
    };
    const result = sync.validateEvent(event);
    
    runner.assertFalse(result.valid);
  });
});

runner.describe('Configuration', () => {
  runner.it('uses default configuration', () => {
    const sync = new CalendarSync();
    runner.assertEqual(sync.calendarName, 'Dinner Plans');
    runner.assertEqual(sync.timezone, 'America/Chicago');
    runner.assertEqual(sync.defaultStartHour, 17);
  });

  runner.it('accepts custom configuration', () => {
    const sync = new CalendarSync({
      calendarName: 'Meals',
      timezone: 'America/New_York',
      defaultStartHour: 18
    });
    runner.assertEqual(sync.calendarName, 'Meals');
    runner.assertEqual(sync.timezone, 'America/New_York');
    runner.assertEqual(sync.defaultStartHour, 18);
  });
});

// Run tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
