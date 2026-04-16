const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'kanban-tasks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing tasks
let tasks = [];
if (fs.existsSync(TASKS_FILE)) {
  try {
    tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch (e) {
    tasks = [];
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  // List all tasks grouped by status
  const byStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    done: tasks.filter(t => t.status === 'done'),
    blocked: tasks.filter(t => t.status === 'blocked')
  };

  console.log('\n📋 TASK BOARD\n');
  
  for (const [status, taskList] of Object.entries(byStatus)) {
    if (taskList.length > 0) {
      const icon = status === 'todo' ? '⬜' : status === 'in-progress' ? '🔄' : status === 'done' ? '✅' : '⛔';
      console.log(`${icon} ${status.toUpperCase()} (${taskList.length})`);
      console.log('─'.repeat(50));
      
      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      taskList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      for (const task of taskList) {
        const priorityEmoji = task.priority === 'critical' ? '🔴' : task.priority === 'high' ? '🟠' : task.priority === 'medium' ? '🟡' : '⚪';
        console.log(`   ${priorityEmoji} ${task.title}`);
        console.log(`      ID: ${task.id} | Category: ${task.category}`);
        if (task.tags && task.tags.length) {
          console.log(`      Tags: ${task.tags.join(', ')}`);
        }
        console.log();
      }
    }
  }
  
  // Summary
  console.log('─'.repeat(50));
  console.log(`Total: ${tasks.length} tasks | Todo: ${byStatus.todo.length} | In Progress: ${byStatus['in-progress'].length} | Done: ${byStatus.done.length} | Blocked: ${byStatus.blocked.length}`);
  console.log();
  
} else if (command === 'update') {
  const taskId = args[1];
  const newStatus = args[2];
  
  if (!taskId || !newStatus) {
    console.error('Usage: node kanban-update.js update <task-id> <new-status>');
    console.error('Statuses: todo, in-progress, done, blocked');
    process.exit(1);
  }
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  task.status = newStatus;
  task.updatedAt = new Date().toISOString();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  
  console.log(`✅ Updated task "${task.title}" to ${newStatus}`);
  
} else if (command === 'done') {
  const taskId = args[1];
  
  if (!taskId) {
    console.error('Usage: node kanban-update.js done <task-id>');
    process.exit(1);
  }
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  task.status = 'done';
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  
  console.log(`✅ Marked task as done: "${task.title}"`);
  
} else if (command === 'start') {
  const taskId = args[1];
  
  if (!taskId) {
    console.error('Usage: node kanban-update.js start <task-id>');
    process.exit(1);
  }
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  task.status = 'in-progress';
  task.startedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  
  console.log(`🔄 Started task: "${task.title}"`);
  
} else {
  console.log('Usage:');
  console.log('  node kanban-update.js list                    - List all tasks');
  console.log('  node kanban-update.js start <task-id>         - Mark task as in-progress');
  console.log('  node kanban-update.js done <task-id>          - Mark task as done');
  console.log('  node kanban-update.js update <task-id> <status> - Update task status');
  console.log();
  console.log('Statuses: todo, in-progress, done, blocked');
}
