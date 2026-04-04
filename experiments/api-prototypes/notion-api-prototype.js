# Notion API Prototype

This prototype demonstrates key Notion API capabilities for our workflow.

## Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the Internal Integration Token
3. Share your database/page with the integration
4. Set the token as `NOTION_API_KEY` environment variable

## Installation

```bash
npm install @notionhq/client
```

## Prototype Code

```javascript
const { Client } = require('@notionhq/client');

class NotionWorkflowIntegration {
  constructor(apiKey) {
    this.notion = new Client({ auth: apiKey });
  }

  /**
   * Query a database with optional filters
   */
  async queryDatabase(databaseId, filters = {}) {
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: filters.status ? {
          property: 'Status',
          select: {
            equals: filters.status
          }
        } : undefined,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending'
          }
        ]
      });
      
      return response.results.map(page => ({
        id: page.id,
        title: page.properties.Name?.title[0]?.plain_text || 'Untitled',
        status: page.properties.Status?.select?.name,
        created: page.created_time,
        url: page.url
      }));
    } catch (error) {
      console.error('Error querying database:', error.message);
      throw error;
    }
  }

  /**
   * Create a new task/page in a database
   */
  async createTask(databaseId, { title, status = 'To Do', priority = 'Medium', dueDate = null }) {
    try {
      const properties = {
        'Name': {
          title: [{ text: { content: title } }]
        },
        'Status': {
          select: { name: status }
        }
      };

      if (priority) {
        properties['Priority'] = { select: { name: priority } };
      }

      if (dueDate) {
        properties['Due Date'] = { date: { start: dueDate } };
      }

      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties
      });

      return {
        id: response.id,
        url: response.url,
        created: response.created_time
      };
    } catch (error) {
      console.error('Error creating task:', error.message);
      throw error;
    }
  }

  /**
   * Create meeting notes with structured content
   */
  async createMeetingNotes(parentPageId, { title, attendees = [], agenda = [], notes = [], actionItems = [] }) {
    try {
      // Create the main page
      const page = await this.notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          'title': {
            title: [{ text: { content: title } }]
          }
        }
      });

      // Add content blocks
      const blocks = [
        // Attendees section
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: 'Attendees' } }] }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: attendees.join(', ') || 'No attendees recorded' } }]
          }
        },
        { object: 'block', type: 'divider', divider: {} },
        
        // Agenda section
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: 'Agenda' } }] }
        },
        ...agenda.map(item => ({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: item } }]
          }
        })),
        { object: 'block', type: 'divider', divider: {} },
        
        // Notes section
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: 'Notes' } }] }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: notes.join('\n\n') || 'No notes taken' } }]
          }
        },
        { object: 'block', type: 'divider', divider: {} },
        
        // Action Items section
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: 'Action Items' } }] }
        },
        ...actionItems.map(item => ({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ text: { content: item } }],
            checked: false
          }
        }))
      ];

      await this.notion.blocks.children.append({
        block_id: page.id,
        children: blocks
      });

      return { id: page.id, url: page.url };
    } catch (error) {
      console.error('Error creating meeting notes:', error.message);
      throw error;
    }
  }

  /**
   * Get daily summary of tasks
   */
  async getDailySummary(databaseId) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: 'Due Date',
              date: {
                on_or_before: today
              }
            },
            {
              property: 'Status',
              select: {
                does_not_equal: 'Done'
              }
            }
          ]
        }
      });

      const tasks = response.results.map(page => ({
        title: page.properties.Name?.title[0]?.plain_text,
        status: page.properties.Status?.select?.name,
        priority: page.properties.Priority?.select?.name,
        dueDate: page.properties['Due Date']?.date?.start
      }));

      return {
        overdueCount: tasks.length,
        highPriority: tasks.filter(t => t.priority === 'High'),
        mediumPriority: tasks.filter(t => t.priority === 'Medium'),
        lowPriority: tasks.filter(t => t.priority === 'Low'),
        allTasks: tasks
      };
    } catch (error) {
      console.error('Error getting daily summary:', error.message);
      throw error;
    }
  }

  /**
   * Search across all Notion content
   */
  async search(query, filter = {}) {
    try {
      const response = await this.notion.search({
        query,
        filter: filter.type ? { value: filter.type, property: 'object' } : undefined,
        page_size: 10
      });

      return response.results.map(item => ({
        id: item.id,
        type: item.object,
        title: item.title?.[0]?.plain_text || 'Untitled',
        url: item.url
      }));
    } catch (error) {
      console.error('Error searching:', error.message);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const notion = new NotionWorkflowIntegration(process.env.NOTION_API_KEY);
  
  // Example: Query a tasks database
  // const tasks = await notion.queryDatabase('YOUR_DB_ID', { status: 'In Progress' });
  // console.log('In Progress Tasks:', tasks);
  
  // Example: Create a new task
  // const newTask = await notion.createTask('YOUR_DB_ID', {
  //   title: 'Review API documentation',
  //   status: 'To Do',
  //   priority: 'High',
  //   dueDate: '2026-02-15'
  // });
  // console.log('Created task:', newTask);
  
  // Example: Create meeting notes
  // const notes = await notion.createMeetingNotes('YOUR_PAGE_ID', {
  //   title: 'Team Standup - Feb 13, 2026',
  //   attendees: ['Alice', 'Bob', 'Charlie'],
  //   agenda: ['Sprint review', 'Blockers discussion'],
  //   notes: ['Completed user authentication feature', 'Working on API integration'],
  //   actionItems: ['Update documentation', 'Schedule code review']
  // });
  // console.log('Created notes:', notes);
  
  // Example: Get daily summary
  // const summary = await notion.getDailySummary('YOUR_DB_ID');
  // console.log('Daily Summary:', summary);
}

module.exports = { NotionWorkflowIntegration };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
```

## Environment Variables

```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Use Cases Demonstrated

1. **Task Management** - Query and create tasks in a database
2. **Meeting Notes** - Create structured meeting notes with action items
3. **Daily Briefings** - Get overdue and priority tasks for daily standup
4. **Search** - Search across all Notion content

## Rate Limiting Considerations

- 3 requests per second default limit
- Use batch operations when possible
- Implement retry logic with exponential backoff

## Next Steps

1. Create a Notion database with properties: Name (title), Status (select), Priority (select), Due Date (date)
2. Get the database ID from the URL
3. Test each method
4. Integrate with Discord/Telegram for notifications
