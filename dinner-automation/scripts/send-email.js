#!/usr/bin/env node
/**
 * Send Email via iCloud SMTP
 * 
 * Uses iCloud SMTP with app-specific password
 * 
 * Usage:
 *   node send-email.js --to alex@1v1a.com --subject "Test" --body "Hello"
 *   node send-email.js --to alex@1v1a.com --subject "Test" --body-file email.html --html
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const SMTP_CONFIG_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-smtp.json');

/**
 * Load SMTP configuration
 */
async function loadSmtpConfig() {
  try {
    const data = await fs.readFile(SMTP_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load SMTP config:', error.message);
    console.log('   Expected at:', SMTP_CONFIG_FILE);
    return null;
  }
}

/**
 * Send email via SMTP using curl
 */
async function sendEmailViaSmtp(options, config) {
  console.log('📧 Sending email via iCloud SMTP...\n');
  console.log(`   To: ${options.to}`);
  console.log(`   From: ${config.email}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   HTML: ${options.isHtml ? 'Yes' : 'No'}`);
  
  // Create email content
  const boundary = `----=_Part_${Date.now()}`;
  const date = new Date().toUTCString();
  
  let emailContent;
  if (options.isHtml) {
    // HTML email with plain text fallback
    const plainText = options.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    emailContent = [
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      plainText.substring(0, 500) + (plainText.length > 500 ? '...' : ''),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      options.body,
      ``,
      `--${boundary}--`
    ].join('\r\n');
  } else {
    emailContent = options.body;
  }
  
  // Build the full email with headers
  const fullEmail = [
    `From: "Marvin Maverick" <${config.email}>`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Date: ${date}`,
    `Message-Id: <${Date.now()}@icloud.com>`,
    emailContent
  ].join('\r\n');
  
  // Save email to temp file for curl
  const tempFile = path.join(DINNER_DATA_DIR, 'temp-email.eml');
  await fs.writeFile(tempFile, fullEmail);
  
  try {
    // Use curl to send via SMTP
    const curlCmd = [
      'curl',
      '-s', // silent
      '--url', 'smtp://smtp.mail.me.com:587',
      '--ssl-reqd',
      '--mail-from', config.email,
      '--mail-rcpt', options.to,
      '--upload-file', tempFile,
      '--user', `${config.email}:${config.app_specific_password}`,
      '--tlsv1.2'
    ];
    
    const result = execSync(curlCmd.join(' '), { 
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});
    
    console.log('\n✅ Email sent successfully!');
    return { success: true, method: 'smtp' };
    
  } catch (error) {
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});
    
    console.error('\n❌ Failed to send email:', error.message);
    if (error.stderr) {
      console.error('   Error details:', error.stderr);
    }
    return { success: false, method: 'smtp', error: error.message };
  }
}

/**
 * Save email record for tracking
 */
async function saveEmailRecord(options) {
  const emailRecordFile = path.join(DINNER_DATA_DIR, 'sent-emails.json');
  let sentEmails = [];
  
  try {
    const data = await fs.readFile(emailRecordFile, 'utf8');
    sentEmails = JSON.parse(data);
  } catch (e) {
    // File doesn't exist yet
  }
  
  sentEmails.push({
    to: options.to,
    from: options.from || 'MarvinMartian9@icloud.com',
    subject: options.subject,
    isHtml: options.isHtml || false,
    sentAt: new Date().toISOString()
  });
  
  await fs.writeFile(emailRecordFile, JSON.stringify(sentEmails, null, 2));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    to: '',
    from: 'MarvinMartian9@icloud.com',
    subject: '',
    body: '',
    isHtml: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--to':
        options.to = args[++i];
        break;
      case '--from':
        options.from = args[++i];
        break;
      case '--subject':
        options.subject = args[++i];
        break;
      case '--body':
        options.body = args[++i];
        break;
      case '--body-file':
        const bodyFile = args[++i];
        try {
          options.body = await fs.readFile(bodyFile, 'utf8');
        } catch (e) {
          console.error('❌ Could not read body file:', bodyFile);
          process.exit(1);
        }
        break;
      case '--html':
        options.isHtml = true;
        break;
    }
  }
  
  if (!options.to || !options.subject || !options.body) {
    console.log('Send Email via iCloud SMTP\n');
    console.log('Usage:');
    console.log('  node send-email.js --to alex@1v1a.com --subject "Test" --body "Hello"');
    console.log('  node send-email.js --to alex@1v1a.com --subject "Test" --body-file email.html --html');
    process.exit(1);
  }
  
  // Load SMTP config
  const config = await loadSmtpConfig();
  if (!config) {
    console.error('\n❌ SMTP configuration not found.');
    console.log('   Please ensure .secrets/icloud-smtp.json exists.');
    process.exit(1);
  }
  
  // Send email
  const result = await sendEmailViaSmtp(options, config);
  
  if (result.success) {
    // Save record
    await saveEmailRecord(options);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendEmailViaSmtp };
