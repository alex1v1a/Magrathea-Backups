const { chromium } = require('playwright');

async function checkFacebookMarketplace() {
  console.log('🔌 Connecting to Marvin Chrome on port 9224...');
  
  try {
    // Connect to Marvin Chrome profile
    const browser = await chromium.connectOverCDP('http://localhost:9224');
    console.log('✅ Connected to Marvin Chrome');
    
    const context = browser.contexts()[0];
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }
    
    // Check if logged in
    console.log('🔍 Checking Facebook login status...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    const isLoggedIn = pageContent.includes('Log Out') || 
                       pageContent.includes('Create post') ||
                       pageContent.includes('News Feed') ||
                       pageContent.includes('Marketplace');
    
    if (!isLoggedIn) {
      console.log('❌ Not logged in to Facebook');
      console.log('   Please run: node facebook-marketplace-automation.js --login-only');
      await browser.close();
      process.exit(1);
    }
    
    console.log('✅ Facebook login verified');
    console.log('');
    console.log('📨 Checking Marketplace Messages...');
    console.log('====================================');
    
    // Navigate to Marketplace inbox
    await page.goto('https://www.facebook.com/marketplace/inbox/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'fb-marketplace-inbox.png', fullPage: true });
    console.log('📸 Screenshot saved: fb-marketplace-inbox.png');
    
    // Look for conversation threads
    const conversationSelectors = [
      '[role="listitem"]',
      '[data-testid="messenger-list-item"]',
      'div[role="button"][tabindex="0"]',
      '[data-pagelet="MWInboxList"] div[role="button"]'
    ];
    
    let conversations = [];
    for (const selector of conversationSelectors) {
      try {
        conversations = await page.$$(selector);
        if (conversations.length > 0) {
          console.log(`Found ${conversations.length} items with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    console.log(`Found ${conversations.length} conversation threads`);
    console.log('');
    
    // Keywords to monitor for
    const keywords = ['f-150', 'f150', 'truck', 'thule', 'box', 'cargo', 'rack', 'buy', 'interested', 'available', 'price', 'offer', 'still', 'have'];
    const actionableMessages = [];
    
    for (let i = 0; i < Math.min(conversations.length, 15); i++) {
      try {
        const conv = conversations[i];
        const text = await conv.textContent().catch(() => '');
        
        if (!text || text.length < 5) continue;
        
        // Skip if it looks like UI text
        if (text.includes('Marketplace') && text.length < 50) continue;
        
        // Check if message contains relevant keywords
        const lowerText = text.toLowerCase();
        const matchedKeywords = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
        
        // Extract sender name and preview
        const lines = text.split('\n').filter(l => l.trim());
        const sender = lines[0]?.trim() || 'Unknown';
        const preview = lines.slice(1, 4).join(' ').trim() || text.slice(0, 150);
        
        if (matchedKeywords.length > 0) {
          actionableMessages.push({
            sender,
            preview: preview.slice(0, 200),
            keywords: matchedKeywords,
            fullText: text.slice(0, 500)
          });
          
          console.log(`🎯 POTENTIAL BUYER: ${sender}`);
          console.log(`   Keywords: ${matchedKeywords.join(', ')}`);
          console.log(`   Preview: "${preview.slice(0, 120)}..."`);
          console.log('');
        } else if (lines.length > 1 && !text.includes('Create New Listing')) {
          // Show other messages for context
          console.log(`💬 ${sender}: ${preview.slice(0, 80)}...`);
        }
      } catch (e) {
        // Skip problematic conversations
      }
    }
    
    console.log('');
    console.log('====================================');
    console.log(`Found ${actionableMessages.length} messages matching F-150/Thule keywords`);
    
    if (actionableMessages.length === 0) {
      console.log('');
      console.log('📋 All Recent Messages:');
      console.log('------------------------------------');
      // Show all messages for review
      for (let i = 0; i < Math.min(conversations.length, 10); i++) {
        try {
          const conv = conversations[i];
          const text = await conv.textContent().catch(() => '');
          if (!text || text.length < 10) continue;
          
          const lines = text.split('\n').filter(l => l.trim());
          const sender = lines[0]?.trim() || 'Unknown';
          if (sender === 'Marketplace' || sender === 'Inbox') continue;
          
          const preview = lines.slice(1, 3).join(' ').trim();
          if (preview) {
            console.log(`${i+1}. ${sender}: ${preview.slice(0, 100)}`);
          }
        } catch (e) {}
      }
    }
    
    await browser.close();
    
    // Return results
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFacebookMarketplace();
