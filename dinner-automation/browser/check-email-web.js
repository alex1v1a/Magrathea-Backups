const { StealthBrowser } = require('./src/StealthBrowser');
const fs = require('fs');
const path = require('path');

async function checkEmailForHEBCode() {
  const browser = new StealthBrowser({
    profile: 'email-check',
    headless: false,
    slowMo: 100
  });
  
  try {
    await browser.launch();
    
    // Navigate to iCloud mail
    await browser.navigate('https://www.icloud.com/mail');
    await browser.randomDelay(3000, 5000);
    
    // Check if already logged in
    const needsLogin = await browser.elementExists('input[type="email"], #account_name_text_field, input[name="appleId"]');
    
    if (needsLogin) {
      console.log('Need to log in to iCloud');
      
      // Fill Apple ID (email)
      await browser.type('input[type="email"], #account_name_text_field, input[name="appleId"]', 'alex@1v1a.com');
      await browser.randomDelay(1000, 2000);
      
      // Click continue
      await browser.click('button[type="submit"], .continue, #sign-in');
      await browser.randomDelay(2000, 3000);
      
      // Enter password
      await browser.type('input[type="password"], #password_text_field', process.env.ICLOUD_APP_PASSWORD || '');
      await browser.randomDelay(1000, 2000);
      
      // Click sign in
      await browser.click('button[type="submit"], #sign-in');
      await browser.randomDelay(5000, 8000);
    }
    
    // Wait for mail to load
    await browser.randomDelay(3000, 5000);
    
    // Search for HEB emails
    const searchBox = 'input[placeholder*="Search"], .search-input, input[type="search"]';
    if (await browser.elementExists(searchBox)) {
      await browser.type(searchBox, 'HEB verification');
      await browser.randomDelay(2000, 3000);
      await browser.page.keyboard.press('Enter');
      await browser.randomDelay(3000, 5000);
    }
    
    // Extract email subjects and look for verification code
    const emails = await browser.evaluate(() => {
      const rows = document.querySelectorAll('.message-row, .mail-row, [data-testid="message-list"] > div');
      const results = [];
      rows.forEach(row => {
        const subject = row.querySelector('.subject, .message-subject, h3');
        const preview = row.querySelector('.preview, .snippet, p');
        if (subject || preview) {
          results.push({
            subject: subject ? subject.textContent.trim() : '',
            preview: preview ? preview.textContent.trim() : ''
          });
        }
      });
      return results;
    });
    
    console.log('Found emails:', emails);
    
    // Look for verification code pattern
    let verificationCode = null;
    for (const email of emails) {
      const combined = (email.subject + ' ' + email.preview);
      const match = combined.match(/\b(\d{6})\b/);
      if (match && combined.toLowerCase().includes('heb')) {
        verificationCode = match[1];
        break;
      }
    }
    
    await browser.screenshot({ filename: 'email-check.png' });
    await browser.close();
    
    return { success: true, code: verificationCode };
    
  } catch (error) {
    console.error('Error checking email:', error);
    await browser.close();
    return { success: false, error: error.message };
  }
}

checkEmailForHEBCode().then(result => {
  console.log('Result:', result);
  process.exit(result.code ? 0 : 1);
});
