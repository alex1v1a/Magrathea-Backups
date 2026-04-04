#!/usr/bin/env node
/**
 * Send HTML Report via Email
 * Usage: node send-report.js <report-file.html> [recipient@email.com]
 */

const fs = require('fs');
const path = require('path');

// Import the email sender
const { sendEmail } = require('./send-email');

async function sendReport(reportFile, recipient) {
  const to = recipient || 'alex@1v1a.com';
  
  if (!fs.existsSync(reportFile)) {
    console.error('❌ Report file not found:', reportFile);
    console.log('Available reports:');
    const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
    files.forEach(f => console.log('  -', f));
    return;
  }
  
  const htmlContent = fs.readFileSync(reportFile, 'utf8');
  const reportName = path.basename(reportFile, '.html').replace(/_/g, ' ').toUpperCase();
  
  console.log('📧 Sending report:', reportFile);
  console.log('   To:', to);
  console.log('');
  
  const success = await sendEmail({
    to: to,
    subject: '🏠 Mortgage Refinance Comparison Report',
    body: htmlContent,
    html: true
  });
  
  if (success) {
    console.log('');
    console.log('✅ Report sent successfully to', to);
  }
}

// Main
const reportFile = process.argv[2];
const recipient = process.argv[3];

if (!reportFile) {
  console.log('Usage: node send-report.js <report-file.html> [recipient@email.com]');
  console.log('');
  console.log('Example:');
  console.log('  node send-report.js mortgage_report.html');
  console.log('  node send-report.js mortgage_report_875_escrow.html alex@1v1a.com');
  console.log('');
  console.log('Available reports:');
  const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
  files.forEach(f => console.log('  -', f));
  process.exit(1);
}

sendReport(reportFile, recipient).catch(console.error);