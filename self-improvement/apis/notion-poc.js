/**
 * Notion API Proof of Concept
 * Demonstrates database operations, page management, and task tracking
 * 
 * Setup:
 * 1. npm install @notionhq/client
 * 2. Create integration at https://www.notion.so/my-integrations
 * 3. Set env var: NOTION_API_KEY
 * 4. Share database/page with integration
 */

const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * USE CASE 1: Project/Task Database
 * Better than markdown files - structured, queryable, collaborative
 */
class TaskTracker {
  constructor(databaseId) {
    this.databaseId = databaseId;
  }

  async createTask(task) {
    const response = await notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        'Name': {
          title: [{ text: { content: task.name } }],
        },
        'Status': {
          select: { name: task.status || 'To Do' },
        },
        'Priority': {
          select: { name: task.priority || 'Medium' },
        },
        'Assignee': {
          people: task.assigneeIds ? task.assigneeIds.map(id => ({ id })) : [],
        },
        'Due Date': {
          date: task.dueDate ? { start: task.dueDate } : null,
        },
        'Tags': {
          multi_select: (task.tags || []).map(tag => ({ name: tag })),
        },
        'Project': {
          relation: task.projectId ? [{ id: task.projectId }] : [],
        },
        'Estimated Hours': {
          number: task.estimatedHours || null,
        },
      },
    });

    return response;
  }

  async getTasks(filters = {}) {
    const filterConditions = [];

    if (filters.status) {
      filterConditions.push({
        property: 'Status',
        select: { equals: filters.status },
      });
    }

    if (filters.priority) {
      filterConditions.push({
        property: 'Priority',
        select: { equals: filters.priority },
      });
    }

    if (filters.assignee) {
      filterConditions.push({
        property: 'Assignee',
        people: { contains: filters.assignee },
      });
    }

    if (filters.dueBefore) {
      filterConditions.push({
        property: 'Due Date',
        date: { before: filters.dueBefore },
      });
    }

    const query = {
      database_id: this.databaseId,
      sorts: [
        {
          property: 'Due Date',
          direction: 'ascending',
        },
      ],
    };

    if (filterConditions.length === 1) {
      query.filter = filterConditions[0];
    } else if (filterConditions.length > 1) {
      query.filter = {
        and: filterConditions,
      };
    }

    const response = await notion.databases.query(query);
    return response.results;
  }

  async updateTaskStatus(taskId, status) {
    return await notion.pages.update({
      page_id: taskId,
      properties: {
        'Status': {
          select: { name: status },
        },
        'Last Updated': {
          date: { start: new Date().toISOString() },
        },
      },
    });
  }

  async getOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    return this.getTasks({ dueBefore: today });
  }
}

/**
 * USE CASE 2: Meal Planning Database
 * Structured dinner planning with relationships
 */
class MealPlanDatabase {
  constructor(databaseId) {
    this.databaseId = databaseId;
  }

  async createMealPlan(weekStartDate, meals) {
    const page = await notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        'Week': {
          title: [{ text: { content: `Week of ${weekStartDate}` } }],
        },
        'Week Start': {
          date: { start: weekStartDate },
        },
        'Status': {
          select: { name: 'Planning' },
        },
      },
    });

    // Add meals as children (sub-pages or content)
    const mealBlocks = meals.map(meal => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { text: { content: `${meal.day}: `, annotations: { bold: true } } },
          { text: { content: meal.name } },
          { text: { content: ` (${meal.prepTime} min prep)` } },
        ],
      },
    }));

    await notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Weekly Menu' } }],
          },
        },
        ...mealBlocks,
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Shopping List' } }],
          },
        },
        {
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ text: { content: 'Generate consolidated list' } }],
            checked: false,
          },
        },
      ],
    });

    return page;
  }

  async updateShoppingList(mealPlanId, items) {
    const checkboxes = items.map(item => ({
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: item } }],
        checked: false,
      },
    }));

    return await notion.blocks.children.append({
      block_id: mealPlanId,
      children: checkboxes,
    });
  }
}

/**
 * USE CASE 3: Knowledge Base / Documentation
 * Better than markdown - searchable, linked, versioned
 */
class KnowledgeBase {
  constructor(parentPageId) {
    this.parentPageId = parentPageId;
  }

  async createDoc(title, content, metadata = {}) {
    const page = await notion.pages.create({
      parent: { page_id: this.parentPageId },
      properties: {
        'title': {
          title: [{ text: { content: title } }],
        },
      },
      icon: metadata.icon || '📄',
    });

    // Convert markdown-like content to Notion blocks
    const blocks = this.parseContentToBlocks(content);

    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks,
    });

    return page;
  }

  parseContentToBlocks(content) {
    const lines = content.split('\n');
    const blocks = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: line.substring(2) } }],
          },
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: line.substring(3) } }],
          },
        });
      } else if (line.startsWith('- ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: line.substring(2) } }],
          },
        });
      } else if (line.startsWith('1. ')) {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ text: { content: line.substring(3) } }],
          },
        });
      } else if (line.startsWith('```')) {
        // Code block handling (simplified)
        continue;
      } else if (line.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: line } }],
          },
        });
      }
    }

    return blocks;
  }

  async searchDocs(query) {
    return await notion.search({
      query,
      filter: {
        value: 'page',
        property: 'object',
      },
    });
  }

  async createRecipeDoc(recipe) {
    const content = `# ${recipe.name}

## Ingredients
${recipe.ingredients.map(i => `- ${i.quantity} ${i.name}`).join('\n')}

## Instructions
${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Notes
- Prep time: ${recipe.prepTime} minutes
- Cook time: ${recipe.cookTime} minutes
- Serves: ${recipe.servings}

## Tags
${recipe.tags.map(tag => `- ${tag}`).join('\n')}
`;

    return this.createDoc(recipe.name, content, { icon: '🍽️' });
  }
}

/**
 * USE CASE 4: Meeting Notes & Decisions
 * Track decisions, action items, attendees
 */
class MeetingTracker {
  constructor(databaseId) {
    this.databaseId = databaseId;
  }

  async createMeetingNote(meeting) {
    const page = await notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        'Title': {
          title: [{ text: { content: meeting.title } }],
        },
        'Date': {
          date: { start: meeting.date },
        },
        'Type': {
          select: { name: meeting.type || 'General' },
        },
        'Attendees': {
          multi_select: meeting.attendees.map(a => ({ name: a })),
        },
        'Status': {
          select: { name: 'Completed' },
        },
      },
    });

    const blocks = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Agenda' } }] },
      },
      ...meeting.agenda.map(item => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ text: { content: item } }] },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Notes' } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: meeting.notes } }] },
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Action Items' } }] },
      },
      ...meeting.actionItems.map(item => ({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ text: { content: `${item.assignee}: ${item.task}` } }],
          checked: false,
        },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Decisions' } }] },
      },
      ...meeting.decisions.map(decision => ({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: decision } }],
          icon: { emoji: '✅' },
        },
      })),
    ];

    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks,
    });

    return page;
  }
}

/**
 * USE CASE 5: Integration Sync
 * Sync Notion with other systems (GitHub, Calendar, etc.)
 */
class NotionSync {
  constructor() {
    this.syncState = new Map();
  }

  async syncGitHubIssuesToTasks(repo, databaseId) {
    // Fetch GitHub issues
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const { data: issues } = await octokit.issues.listForRepo({
      owner: repo.owner,
      repo: repo.name,
      state: 'open',
    });

    const taskTracker = new TaskTracker(databaseId);

    for (const issue of issues) {
      // Check if already synced
      const existingId = this.syncState.get(`github:${issue.id}`);
      
      if (!existingId) {
        // Create new task
        const task = await taskTracker.createTask({
          name: issue.title,
          status: issue.assignees.length > 0 ? 'In Progress' : 'To Do',
          priority: this.mapLabelsToPriority(issue.labels),
          tags: issue.labels.map(l => l.name),
        });

        this.syncState.set(`github:${issue.id}`, task.id);
        this.syncState.set(`notion:${task.id}`, issue.id);
      }
    }

    return { synced: issues.length };
  }

  mapLabelsToPriority(labels) {
    if (labels.some(l => l.name.includes('urgent') || l.name.includes('P0'))) return 'High';
    if (labels.some(l => l.name.includes('P1'))) return 'Medium';
    return 'Low';
  }
}

// Demo runner
async function demo() {
  console.log('=== Notion API Integration Demo ===\n');

  // Check for API key
  if (!process.env.NOTION_API_KEY) {
    console.log('Note: Set NOTION_API_KEY to test with real API');
    console.log('Demo shows code structure only');
  }

  // Demo 1: Task creation
  console.log('Demo 1: Task Tracking Setup');
  console.log('Database schema needed:');
  console.log('- Name (Title)');
  console.log('- Status (Select: To Do, In Progress, Done)');
  console.log('- Priority (Select: Low, Medium, High)');
  console.log('- Due Date (Date)');
  console.log('- Tags (Multi-select)');
  console.log('- Assignee (People)');

  // Demo 2: Meal planning
  console.log('\nDemo 2: Meal Planning Database');
  const sampleMeals = [
    { day: 'Monday', name: 'Grilled Salmon', prepTime: 20 },
    { day: 'Tuesday', name: 'Chicken Stir Fry', prepTime: 25 },
    { day: 'Wednesday', name: 'Pasta Primavera', prepTime: 30 },
  ];
  console.log('Sample meals:', JSON.stringify(sampleMeals, null, 2));

  // Demo 3: Knowledge base
  console.log('\nDemo 3: Recipe Documentation');
  const sampleRecipe = {
    name: 'Honey Garlic Chicken',
    ingredients: [
      { name: 'chicken breast', quantity: '2 lbs' },
      { name: 'honey', quantity: '1/4 cup' },
      { name: 'garlic', quantity: '4 cloves' },
      { name: 'soy sauce', quantity: '2 tbsp' },
    ],
    instructions: [
      'Cut chicken into bite-sized pieces',
      'Mix honey, garlic, and soy sauce',
      'Cook chicken until golden',
      'Add sauce and simmer for 5 minutes',
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    tags: ['chicken', 'asian', 'quick'],
  };
  console.log('Sample recipe:', sampleRecipe.name);

  console.log('\nDemo complete!');
  console.log('\nTo set up:');
  console.log('1. Create integration at https://www.notion.so/my-integrations');
  console.log('2. Copy integration token to NOTION_API_KEY');
  console.log('3. Create databases with matching schemas');
  console.log('4. Share databases with your integration');
}

module.exports = {
  TaskTracker,
  MealPlanDatabase,
  KnowledgeBase,
  MeetingTracker,
  NotionSync,
};

if (require.main === module) {
  demo();
}
