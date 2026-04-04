#!/usr/bin/env node
/**
 * @fileoverview System Health Check CLI Tool
 * Run comprehensive health checks on the automation system
 * 
 * Usage:
 *   node scripts/system-health-check.js
 *   node scripts/system-health-check.js --json
 *   node scripts/system-health-check.js --email
 *   node scripts/system-health-check.js --quiet
 *   node scripts/system-health-check.js --dashboard
 * 
 * @module scripts/system-health-check
 */

const path = require('path');
const fs = require('fs').promises;
const { HealthMonitor } = require('../lib/health-monitor');

// Parse command line arguments
const args = {
  json: process.argv.includes('--json'),
  email: process.argv.includes('--email'),
  quiet: process.argv.includes('--quiet'),
  dashboard: process.argv.includes('--dashboard'),
  log: process.argv.includes('--log'),
  help: process.argv.includes('--help') || process.argv.includes('-h')
};

// Show help
if (args.help) {
  console.log(`
System Health Check - Marvin's Automation Health Monitor

Usage: node scripts/system-health-check.js [options]

Options:
  --json       Output results as JSON
  --email      Send email alert if issues found
  --quiet      Minimal output (exit code only)
  --dashboard  Update dashboard with health status
  --log        Write results to log file (logs/health-YYYY-MM-DD.log)
  --help, -h   Show this help

Exit codes:
  0 = All healthy
  1 = Warnings found
  2 = Critical issues found
  3 = Error running checks

Examples:
  node scripts/system-health-check.js
  node scripts/system-health-check.js --json > health-report.json
  node scripts/system-health-check.js --email --log
`);
  process.exit(0);
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  if (args.quiet || args.json) return text;
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function statusIcon(status) {
  const icons = {
    healthy: '✅',
    warning: '⚠️ ',
    critical: '❌',
    error: '💥'
  };
  return icons[status] || '❓';
}

function statusColor(status) {
  const colorMap = {
    healthy: 'green',
    warning: 'yellow',
    critical: 'red',
    error: 'red'
  };
  return colorMap[status] || 'gray';
}

async function sendHealthEmail(report) {
  try {
    // Try to use the email utilities
    const emailUtils = require('../lib/email-utils');
    
    const hasIssues = report.overall.checks.critical > 0 || report.overall.checks.warning > 0;
    
    const subject = hasIssues 
      ? `⚠️ Marvin Health Alert - ${report.overall.status.toUpperCase()}`
      : `✅ Marvin Health Check - All Systems Healthy`;

    // Build HTML report
    const html = `
      <h2>Marvin System Health Report</h2>
      <p><strong>Status:</strong> ${report.overall.status.toUpperCase()}</p>
      <p><strong>Health Score:</strong> ${report.overall.score}/100</p>
      <p><strong>Timestamp:</strong> ${report.timestamp}</p>
      <p><strong>Duration:</strong> ${report.duration}ms</p>
      
      <h3>Summary</h3>
      <ul>
        <li>✅ Healthy: ${report.overall.checks.healthy}</li>
        <li>⚠️ Warning: ${report.overall.checks.warning}</li>
        <li>❌ Critical: ${report.overall.checks.critical}</li>
        <li>💥 Error: ${report.overall.checks.error}</li>
      </ul>
      
      <h3>Check Details</h3>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr style="background: #f0f0f0;">
          <th>Check</th>
          <th>Status</th>
          <th>Message</th>
          <th>Duration</th>
        </tr>
        ${report.checks.map(check => `
          <tr>
            <td>${check.name}</td>
            <td style="color: ${check.status === 'healthy' ? 'green' : check.status === 'warning' ? 'orange' : 'red'};">
              ${check.status.toUpperCase()}
            </td>
            <td>${check.message}</td>
            <td>${check.duration}ms</td>
          </tr>
        `).join('')}
      </table>
      
      ${hasIssues ? `
        <p style="color: red; margin-top: 20px;">
          <strong>Action Required:</strong> Some systems need attention.
          Run <code>node scripts/system-health-check.js</code> for details.
        </p>
      ` : ''}
    `;

    const text = `
Marvin System Health Report
===========================

Status: ${report.overall.status.toUpperCase()}
Health Score: ${report.overall.score}/100
Timestamp: ${report.timestamp}
Duration: ${report.duration}ms

Summary:
- Healthy: ${report.overall.checks.healthy}
- Warning: ${report.overall.checks.warning}
- Critical: ${report.overall.checks.critical}
- Error: ${report.overall.checks.error}

Check Details:
${report.checks.map(c => `- ${c.name}: ${c.status} - ${c.message}`).join('\n')}

${hasIssues ? 'ACTION REQUIRED: Some systems need attention.' : 'All systems operational.'}
    `.trim();

    // Load credentials from environment
    require('dotenv').config();
    const credentials = {
      user: process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com',
      pass: process.env.ICLOUD_APP_PASSWORD
    };

    if (!credentials.pass) {
      console.error(colorize('❌ Email credentials not configured (ICLOUD_APP_PASSWORD)', 'yellow'));
      return false;
    }

    await emailUtils.sendEmail({
      to: 'alex@1v1a.com',
      subject,
      text,
      html,
      credentials
    });

    if (!args.quiet) {
      console.log(colorize('📧 Health alert email sent', 'green'));
    }
    return true;
  } catch (error) {
    console.error(colorize(`❌ Failed to send email: ${error.message}`, 'red'));
    return false;
  }
}

async function updateDashboard(report) {
  try {
    const dashboardDataPath = path.join(process.cwd(), 'marvin-dash/data/health-status.json');
    
    const dashboardData = {
      ...report,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(dashboardDataPath, JSON.stringify(dashboardData, null, 2));
    
    if (!args.quiet) {
      console.log(colorize('📊 Dashboard updated', 'green'));
    }
    return true;
  } catch (error) {
    console.error(colorize(`❌ Failed to update dashboard: ${error.message}`, 'red'));
    return false;
  }
}

async function writeLogFile(report) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logPath = path.join(process.cwd(), `logs/health-${date}.log`);
    
    // Ensure logs directory exists
    try {
      await fs.mkdir(path.join(process.cwd(), 'logs'), { recursive: true });
    } catch {}

    const logEntry = {
      timestamp: report.timestamp,
      status: report.overall.status,
      score: report.overall.score,
      checks: report.checks.map(c => ({
        name: c.name,
        status: c.status,
        message: c.message,
        duration: c.duration
      }))
    };

    // Append to log file
    let logs = [];
    try {
      const existing = await fs.readFile(logPath, 'utf8');
      logs = JSON.parse(existing);
    } catch {
      // File doesn't exist or is invalid
    }

    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }

    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    
    if (!args.quiet) {
      console.log(colorize(`📝 Log written to logs/health-${date}.log`, 'green'));
    }
    return true;
  } catch (error) {
    console.error(colorize(`❌ Failed to write log: ${error.message}`, 'red'));
    return false;
  }
}

function printReport(report) {
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (args.quiet) {
    return;
  }

  // Header
  console.log('\n' + colorize('═'.repeat(70), 'blue'));
  console.log(colorize('  🤖 MARVIN SYSTEM HEALTH REPORT', 'bold'));
  console.log(colorize('═'.repeat(70), 'blue'));
  
  // Overall status
  const statusColorName = statusColor(report.overall.status);
  console.log(`\n  ${colorize('Overall Status:', 'bold')} ${colorize(report.overall.status.toUpperCase(), statusColorName)}`);
  console.log(`  ${colorize('Health Score:', 'bold')} ${report.overall.score}/100`);
  console.log(`  ${colorize('Timestamp:', 'bold')} ${report.timestamp}`);
  console.log(`  ${colorize('Duration:', 'bold')} ${report.duration}ms`);

  // Summary
  console.log(`\n  ${colorize('Summary:', 'bold')}`);
  console.log(`    ${statusIcon('healthy')} Healthy: ${report.overall.checks.healthy}`);
  console.log(`    ${statusIcon('warning')} Warning: ${report.overall.checks.warning}`);
  console.log(`    ${statusIcon('critical')} Critical: ${report.overall.checks.critical}`);
  console.log(`    ${statusIcon('error')} Error: ${report.overall.checks.error}`);

  // Check details
  console.log(`\n  ${colorize('Check Details:', 'bold')}`);
  console.log('  ' + colorize('─'.repeat(66), 'gray'));
  
  for (const check of report.checks) {
    const icon = statusIcon(check.status);
    const checkColor = statusColor(check.status);
    const paddedName = check.name.padEnd(20);
    const paddedStatus = check.status.toUpperCase().padEnd(10);
    
    console.log(`  ${icon} ${colorize(paddedName, 'bold')} ${colorize(paddedStatus, checkColor)} ${check.message}`);
    
    // Show additional data for certain checks
    if (check.data && (check.status === 'warning' || check.status === 'critical' || check.status === 'error')) {
      if (check.data.tasks) {
        // Cron jobs detail
        const failed = check.data.tasks.filter(t => t.status !== 'healthy');
        for (const task of failed.slice(0, 3)) {
          console.log(`      ${colorize('└─', 'gray')} ${task.name}: ${task.error || task.status}`);
        }
      }
      if (check.data.files) {
        // Files detail
        const failed = check.data.files.filter(f => f.status !== 'healthy');
        for (const file of failed.slice(0, 3)) {
          console.log(`      ${colorize('└─', 'gray')} ${file.name}: ${file.error || 'missing/invalid'}`);
        }
      }
      if (check.data.error) {
        console.log(`      ${colorize('└─', 'gray')} Error: ${check.data.error}`);
      }
    }
  }

  console.log('  ' + colorize('─'.repeat(66), 'gray'));

  // Footer
  if (report.overall.status === 'healthy') {
    console.log(`\n  ${colorize('✨ All systems operational!', 'green')}`);
  } else if (report.overall.status === 'warning') {
    console.log(`\n  ${colorize('⚠️  Some systems need attention', 'yellow')}`);
  } else {
    console.log(`\n  ${colorize('🚨 Critical issues detected!', 'red')}`);
    console.log(`  ${colorize('   Run with --email to send alert', 'gray')}`);
  }

  console.log(colorize('═'.repeat(70), 'blue') + '\n');
}

async function main() {
  const startTime = Date.now();

  if (!args.quiet && !args.json) {
    console.log(colorize('🔍 Running health checks...', 'blue'));
  }

  try {
    const monitor = new HealthMonitor();
    const report = await monitor.runAllChecks();

    // Print report
    printReport(report);

    // Send email if requested or if critical issues
    if (args.email || (report.overall.status === 'critical' && !args.quiet)) {
      await sendHealthEmail(report);
    }

    // Update dashboard if requested
    if (args.dashboard) {
      await updateDashboard(report);
    }

    // Write log if requested
    if (args.log || !args.json) {
      await writeLogFile(report);
    }

    // Exit with appropriate code
    if (report.overall.status === 'healthy') {
      process.exit(0);
    } else if (report.overall.status === 'warning') {
      process.exit(1);
    } else {
      process.exit(2);
    }
  } catch (error) {
    console.error(colorize(`\n💥 Health check failed: ${error.message}`, 'red'));
    if (args.json) {
      console.log(JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
    }
    process.exit(3);
  }
}

// Run main
main();
