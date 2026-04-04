const { execSync } = require('child_process');

// Fetch full email with RFC822
const result = execSync(`curl.exe -s --url "imaps://imap.mail.me.com:993/INBOX" --user "MarvinMartian9@icloud.com:hazf-gpml-kpha-bqmu" --request "FETCH 11 RFC822"`, {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

// Parse the IMAP response to extract the actual email content
const lines = result.split('\r\n');
let inBody = false;
let bodyLines = [];
let contentLength = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Look for the length marker
  if (line.includes('RFC822') && line.includes('{')) {
    const match = line.match(/\{(\d+)\}/);
    if (match) {
      contentLength = parseInt(match[1]);
      inBody = true;
      continue;
    }
  }
  
  if (inBody) {
    // Stop at closing paren
    if (line === ')') break;
    bodyLines.push(line);
  }
}

const emailContent = bodyLines.join('\n');
console.log('=== FULL EMAIL ===');
console.log(emailContent);
console.log('\n=== END ===');
