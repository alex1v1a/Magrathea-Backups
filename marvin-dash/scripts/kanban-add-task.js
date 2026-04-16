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
let title = '';
let category = 'general';
let priority = 'medium';
let tags = '';
let status = 'todo';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--title':
    case '-t':
      title = args[++i];
      break;
    case '--category':
    case '-c':
      category = args[++i];
      break;
    case '--priority':
    case '-p':
      priority = args[++i];
      break;
    case '--tags':
      tags = args[++i];
      break;
    case '--status':
    case '-s':
      status = args[++i];
      break;
  }
}

if (!title) {
  console.error('Usage: node kanban-add-task.js --title "Task Name" [--category security] [--priority critical|high|medium|low] [--tags "tag1,tag2"]');
  process.exit(1);
}

const task = {
  id: Date.now().toString(36),
  title,
  category,
  priority,
  tags: tags ? tags.split(',').map(t => t.trim()) : [],
  status,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

tasks.push(task);
fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));

console.log(`✅ Task added: ${title}`);
console.log(`   ID: ${task.id}`);
console.log(`   Priority: ${priority}`);
console.log(`   Category: ${category}`);
console.log(`   Status: ${status}`);
