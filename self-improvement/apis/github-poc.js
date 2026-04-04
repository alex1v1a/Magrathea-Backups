/**
 * GitHub API Proof of Concept
 * Demonstrates automated code reviews, issue tracking, and PR automation
 * 
 * Setup:
 * 1. npm install @octokit/rest @octokit/webhooks
 * 2. Set env var: GITHUB_TOKEN (fine-grained PAT with repo access)
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * USE CASE 1: Automated Code Review
 * Analyze PRs and provide structured feedback
 */
class AutomatedCodeReview {
  constructor(repoOwner, repoName) {
    this.owner = repoOwner;
    this.repo = repoName;
  }

  async reviewPullRequest(prNumber) {
    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    // Fetch files changed
    const { data: files } = await octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    // Analyze changes
    const analysis = await this.analyzeChanges(files);

    // Post review comments
    const reviewBody = this.generateReviewReport(analysis);
    
    await octokit.pulls.createReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      body: reviewBody,
      event: analysis.issues.length > 0 ? 'COMMENT' : 'APPROVE',
      comments: analysis.lineComments,
    });

    return analysis;
  }

  async analyzeChanges(files) {
    const analysis = {
      summary: {
        filesChanged: files.length,
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
      },
      issues: [],
      lineComments: [],
      suggestions: [],
    };

    for (const file of files) {
      // Skip non-code files
      if (!this.isCodeFile(file.filename)) continue;

      // Check for common issues
      const issues = this.checkFileIssues(file);
      analysis.issues.push(...issues);

      // Generate line-specific comments
      const comments = this.generateLineComments(file);
      analysis.lineComments.push(...comments);

      // Check for missing tests
      if (file.filename.includes('src/') && !file.filename.includes('.test.')) {
        const hasTestFile = await this.checkHasTestFile(file.filename);
        if (!hasTestFile) {
          analysis.suggestions.push(`Consider adding tests for ${file.filename}`);
        }
      }
    }

    return analysis;
  }

  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  checkFileIssues(file) {
    const issues = [];
    const patch = file.patch || '';

    // Check for console.log in production code
    if (patch.includes('console.log')) {
      issues.push({
        type: 'warning',
        file: file.filename,
        message: 'console.log found - consider removing before merge',
      });
    }

    // Check for TODO/FIXME without issue reference
    const todoMatches = patch.match(/TODO|FIXME/g);
    if (todoMatches) {
      issues.push({
        type: 'info',
        file: file.filename,
        message: `${todoMatches.length} TODO/FIXME found - ensure issues are created`,
      });
    }

    // Check for large files
    if (file.changes > 500) {
      issues.push({
        type: 'warning',
        file: file.filename,
        message: 'Large change - consider breaking into smaller PRs',
      });
    }

    return issues;
  }

  generateLineComments(file) {
    const comments = [];
    const lines = (file.patch || '').split('\n');
    let lineNumber = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header to get starting line number
        const match = line.match(/\+\d+/);
        if (match) lineNumber = parseInt(match[0].substring(1));
        continue;
      }

      if (line.startsWith('+')) {
        lineNumber++;
        
        // Check for specific patterns
        if (line.includes('console.log')) {
          comments.push({
            path: file.filename,
            line: lineNumber,
            body: '📝 **Note:** `console.log` detected. Remove before merging or use a proper logging library.',
          });
        }

        if (line.includes('TODO') && !line.includes('#')) {
          comments.push({
            path: file.filename,
            line: lineNumber,
            body: '⚠️ **TODO without issue reference:** Consider creating an issue and referencing it (e.g., TODO #123)',
          });
        }
      } else if (!line.startsWith('-')) {
        lineNumber++;
      }
    }

    return comments;
  }

  async checkHasTestFile(sourceFile) {
    const testFile = sourceFile
      .replace('src/', 'test/')
      .replace('.js', '.test.js')
      .replace('.ts', '.test.ts');

    try {
      await octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: testFile,
      });
      return true;
    } catch {
      return false;
    }
  }

  generateReviewReport(analysis) {
    const sections = [
      '## 🤖 Automated Code Review',
      '',
      `**Summary:** ${analysis.summary.filesChanged} files changed, +${analysis.summary.additions}/-${analysis.summary.deletions}`,
      '',
    ];

    if (analysis.issues.length > 0) {
      sections.push('### Issues Found');
      sections.push(...analysis.issues.map(i => `- **${i.type.toUpperCase()}** (${i.file}): ${i.message}`));
      sections.push('');
    }

    if (analysis.suggestions.length > 0) {
      sections.push('### Suggestions');
      sections.push(...analysis.suggestions.map(s => `- ${s}`));
      sections.push('');
    }

    sections.push('---');
    sections.push('*This review was automatically generated. Please address critical issues before merging.*');

    return sections.join('\n');
  }
}

/**
 * USE CASE 2: Issue Tracking & Automation
 * Create, update, and manage issues programmatically
 */
class IssueAutomation {
  constructor(repoOwner, repoName) {
    this.owner = repoOwner;
    this.repo = repoName;
  }

  async createBugReport(error, context) {
    const title = `[AUTO] ${error.name}: ${error.message.substring(0, 50)}`;
    const body = this.generateBugReportBody(error, context);

    const { data: issue } = await octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      labels: ['bug', 'automated'],
    });

    return issue;
  }

  async createFeatureRequest(title, description, priority = 'medium') {
    const body = `## Feature Request\n\n${description}\n\n## Priority\n${priority}\n\n## Additional Context\n<!-- Add any other context -->`;

    const { data: issue } = await octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: `[FEATURE] ${title}`,
      body,
      labels: ['enhancement', `priority:${priority}`],
    });

    return issue;
  }

  async triageIssues() {
    // Fetch all open issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      per_page: 100,
    });

    const actions = [];

    for (const issue of issues) {
      // Auto-close stale issues
      const daysSinceUpdate = this.daysSince(issue.updated_at);
      if (daysSinceUpdate > 90 && issue.labels.some(l => l.name === 'stale')) {
        await this.closeStaleIssue(issue);
        actions.push({ type: 'close', issue: issue.number, reason: 'stale' });
        continue;
      }

      // Mark as stale after 60 days
      if (daysSinceUpdate > 60 && !issue.labels.some(l => l.name === 'stale')) {
        await octokit.issues.addLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: issue.number,
          labels: ['stale'],
        });
        actions.push({ type: 'label', issue: issue.number, label: 'stale' });
      }

      // Auto-assign based on labels
      if (issue.assignees.length === 0) {
        const assignee = this.getAssigneeForLabels(issue.labels);
        if (assignee) {
          await octokit.issues.addAssignees({
            owner: this.owner,
            repo: this.repo,
            issue_number: issue.number,
            assignees: [assignee],
          });
          actions.push({ type: 'assign', issue: issue.number, assignee });
        }
      }
    }

    return actions;
  }

  async syncTasksFromNotion(notionTasks) {
    const created = [];

    for (const task of notionTasks) {
      const { data: issue } = await octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: task.name,
        body: `## Description\n${task.description || 'No description'}\n\n## Source\nImported from Notion`,
        labels: ['from-notion', task.status],
      });

      created.push({ notionId: task.id, githubNumber: issue.number });
    }

    return created;
  }

  generateBugReportBody(error, context) {
    return `## Automatic Bug Report\n\n**Error:** \`\`\`\n${error.stack}\n\`\`\`\n\n**Context:**\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\n**Timestamp:** ${new Date().toISOString()}\n\n---\n*This issue was created automatically by error tracking.*`;
  }

  daysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  async closeStaleIssue(issue) {
    await octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issue.number,
      body: 'Closing due to inactivity. Please reopen if this is still relevant.',
    });

    await octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issue.number,
      state: 'closed',
    });
  }

  getAssigneeForLabels(labels) {
    const labelNames = labels.map(l => l.name);
    
    if (labelNames.includes('frontend')) return 'frontend-dev';
    if (labelNames.includes('backend')) return 'backend-dev';
    if (labelNames.includes('devops')) return 'devops-lead';
    if (labelNames.includes('dinner-automation')) return 'alexander';
    
    return null;
  }
}

/**
 * USE CASE 3: Pull Request Automation
 * Auto-create PRs, update branches, merge strategies
 */
class PullRequestAutomation {
  constructor(repoOwner, repoName) {
    this.owner = repoOwner;
    this.repo = repoName;
  }

  async createReleasePR(version, changes) {
    const branchName = `release/${version}`;
    const baseBranch = 'main';

    // Create branch from main
    const { data: baseRef } = await octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: 'heads/main',
    });

    await octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    // Create PR
    const body = this.generateReleaseNotes(changes);
    
    const { data: pr } = await octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: `Release ${version}`,
      head: branchName,
      base: baseBranch,
      body,
    });

    // Add labels
    await octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: pr.number,
      labels: ['release', 'automated'],
    });

    return pr;
  }

  async autoMergeDependabotPRs() {
    const { data: prs } = await octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      head: 'dependabot',
    });

    const results = [];

    for (const pr of prs) {
      // Check if checks pass
      const { data: checks } = await octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: pr.head.sha,
      });

      const allPassed = checks.check_runs.every(c => c.conclusion === 'success');
      const isPatch = pr.title.includes('bump') && pr.title.match(/\d+\.\d+\.(\d+)/);

      if (allPassed && isPatch) {
        try {
          await octokit.pulls.merge({
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
            merge_method: 'squash',
          });
          results.push({ pr: pr.number, status: 'merged' });
        } catch (error) {
          results.push({ pr: pr.number, status: 'failed', error: error.message });
        }
      } else {
        results.push({ pr: pr.number, status: 'skipped', reason: allPassed ? 'not patch' : 'checks failed' });
      }
    }

    return results;
  }

  async updateBranchProtection(branch = 'main') {
    return await octokit.repos.updateBranchProtection({
      owner: this.owner,
      repo: this.repo,
      branch,
      required_status_checks: {
        strict: true,
        contexts: ['ci/tests', 'ci/lint'],
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
      },
      restrictions: null,
    });
  }

  generateReleaseNotes(changes) {
    const sections = [
      '## Release Notes',
      '',
      '### Changes',
      ...changes.map(c => `- ${c}`),
      '',
      '### Deployment Checklist',
      '- [ ] Tests pass',
      '- [ ] Documentation updated',
      '- [ ] Database migrations run',
      '',
      '---',
      '*Automated release PR*',
    ];

    return sections.join('\n');
  }
}

/**
 * USE CASE 4: Repository Analytics
 * Track code quality, contributor activity
 */
class RepositoryAnalytics {
  constructor(repoOwner, repoName) {
    this.owner = repoOwner;
    this.repo = repoName;
  }

  async generateWeeklyReport() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch commits
    const { data: commits } = await octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      since: oneWeekAgo.toISOString(),
      per_page: 100,
    });

    // Fetch PRs
    const { data: prs } = await octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'all',
      per_page: 100,
    });

    const weeklyPRs = prs.filter(p => new Date(p.created_at) > oneWeekAgo);
    const mergedPRs = weeklyPRs.filter(p => p.merged_at);

    // Fetch issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      state: 'all',
      since: oneWeekAgo.toISOString(),
    });

    return {
      period: `Week of ${oneWeekAgo.toDateString()}`,
      commits: {
        total: commits.length,
        authors: this.countBy(commits, c => c.author?.login),
      },
      pullRequests: {
        created: weeklyPRs.length,
        merged: mergedPRs.length,
        averageTimeToMerge: this.calculateAverageMergeTime(mergedPRs),
      },
      issues: {
        opened: issues.filter(i => !i.pull_request).length,
        closed: issues.filter(i => i.closed_at && new Date(i.closed_at) > oneWeekAgo).length,
      },
    };
  }

  countBy(array, keyFn) {
    const counts = {};
    for (const item of array) {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  calculateAverageMergeTime(prs) {
    if (prs.length === 0) return 0;
    
    const times = prs.map(pr => {
      const created = new Date(pr.created_at);
      const merged = new Date(pr.merged_at);
      return (merged - created) / (1000 * 60 * 60); // Hours
    });

    return times.reduce((a, b) => a + b, 0) / times.length;
  }
}

/**
 * USE CASE 5: Webhook Handler
 * React to GitHub events in real-time
 */
class GitHubWebhookHandler {
  constructor(secret) {
    this.secret = secret;
    this.handlers = new Map();
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  async handleEvent(eventType, payload) {
    const handler = this.handlers.get(eventType);
    
    if (!handler) {
      console.log(`No handler for event: ${eventType}`);
      return;
    }

    try {
      await handler(payload);
    } catch (error) {
      console.error(`Error handling ${eventType}:`, error);
    }
  }

  // Express/Next.js middleware
  middleware() {
    return async (req, res) => {
      const eventType = req.headers['x-github-event'];
      const signature = req.headers['x-hub-signature-256'];

      // Verify signature (implement based on your crypto library)
      // if (!verifySignature(req.body, signature, this.secret)) {
      //   return res.status(401).send('Unauthorized');
      // }

      await this.handleEvent(eventType, req.body);
      res.status(200).send('OK');
    };
  }
}

// Setup webhook handlers
function setupDinnerAutomationWebhooks() {
  const handler = new GitHubWebhookHandler(process.env.GITHUB_WEBHOOK_SECRET);

  handler.on('push', async (payload) => {
    // Deploy on push to main
    if (payload.ref === 'refs/heads/main') {
      console.log('Deploying dinner automation...');
      // Trigger deployment
    }
  });

  handler.on('pull_request', async (payload) => {
    // Run automated review on PR open
    if (payload.action === 'opened') {
      const reviewer = new AutomatedCodeReview(
        payload.repository.owner.login,
        payload.repository.name
      );
      await reviewer.reviewPullRequest(payload.pull_request.number);
    }
  });

  handler.on('issues', async (payload) => {
    // Auto-assign dinner-related issues
    if (payload.action === 'opened') {
      const issue = payload.issue;
      if (issue.title.toLowerCase().includes('dinner') || 
          issue.labels.some(l => l.name === 'dinner-automation')) {
        await octokit.issues.addAssignees({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: issue.number,
          assignees: ['alexander'],
        });
      }
    }
  });

  return handler;
}

// Demo runner
async function demo() {
  console.log('=== GitHub API Integration Demo ===\n');

  if (!process.env.GITHUB_TOKEN) {
    console.log('Note: Set GITHUB_TOKEN to test with real API');
  }

  // Demo 1: Code review
  console.log('Demo 1: Automated Code Review');
  console.log('Checks performed:');
  console.log('- console.log detection');
  console.log('- TODO without issue references');
  console.log('- Missing test files');
  console.log('- Large change detection');

  // Demo 2: Issue automation
  console.log('\nDemo 2: Issue Automation');
  console.log('Features:');
  console.log('- Auto bug report creation from errors');
  console.log('- Issue triage (stale detection)');
  console.log('- Auto-assignment based on labels');
  console.log('- Notion sync');

  // Demo 3: PR automation
  console.log('\nDemo 3: PR Automation');
  console.log('Features:');
  console.log('- Automated release PRs');
  console.log('- Dependabot auto-merge');
  console.log('- Branch protection rules');

  console.log('\nDemo complete!');
}

module.exports = {
  AutomatedCodeReview,
  IssueAutomation,
  PullRequestAutomation,
  RepositoryAnalytics,
  GitHubWebhookHandler,
  setupDinnerAutomationWebhooks,
};

if (require.main === module) {
  demo();
}
