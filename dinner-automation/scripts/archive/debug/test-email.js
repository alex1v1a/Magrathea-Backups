#!/usr/bin/env node
/**
 * Email Test Script for Dinner Plans Automation
 * Tests iCloud SMTP (sending) and IMAP (receiving) functionality
 * 
 * Usage:
 *   node test-email.js --send        # Send test email to both addresses
 *   node test-email.js --check       # Check inbox for unread messages
 *   node test-email.js --parse       # Test reply parsing with sample text
 *   node test-email.js --full        # Run all tests
 */

const { DinnerEmailClient } = require('./email-client');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function testSMTP() {
  console.log('\n========================================');
  console.log('TEST 1: SMTP (Sending) Configuration');
  console.log('========================================');
  console.log('Host: smtp.mail.me.com');
  console.log('Port: 587 (STARTTLS)');
  console.log('User: MarvinMartian9@icloud.com');
  console.log('Recipients: alex@1v1a.com, sferrazzaa96@gmail.com');
  console.log('----------------------------------------\n');
  
  const client = new DinnerEmailClient();
  
  try {
    console.log('Connecting to SMTP server...');
    await client.initSMTP();
    console.log('✓ SMTP connection verified\n');
    
    console.log('Sending test email to both recipients...');
    const result = await client.sendTestEmail();
    
    console.log('\n✓ Test email sent successfully!');
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Recipients: ${result.recipients.join(', ')}`);
    console.log(`  Timestamp: ${result.timestamp}`);
    
    // Save test result
    fs.writeFileSync(
      path.join(DATA_DIR, 'test-smtp-result.json'),
      JSON.stringify(result, null, 2)
    );
    
    return { success: true, result };
  } catch (error) {
    console.error('\n✗ SMTP Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await client.close();
  }
}

async function testIMAP() {
  console.log('\n========================================');
  console.log('TEST 2: IMAP (Receiving) Configuration');
  console.log('========================================');
  console.log('Host: imap.mail.me.com');
  console.log('Port: 993 (SSL)');
  console.log('User: MarvinMartian9@icloud.com');
  console.log('----------------------------------------\n');
  
  const client = new DinnerEmailClient();
  
  try {
    console.log('Connecting to IMAP server...');
    await client.initIMAP();
    console.log('✓ IMAP connection established\n');
    
    console.log('Checking for unread messages...');
    
    // Check for messages from the last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const replies = await client.checkForReplies(since);
    
    console.log(`\n✓ IMAP check completed`);
    console.log(`  Messages found: ${replies.length}`);
    
    if (replies.length > 0) {
      console.log('\n  Message Details:');
      replies.forEach((reply, i) => {
        console.log(`\n  [${i + 1}] From: ${reply.from}`);
        console.log(`      Subject: ${reply.subject}`);
        console.log(`      Date: ${reply.date}`);
        console.log(`      Actions: ${reply.parsed.actions.map(a => a.type).join(', ') || 'none'}`);
        console.log(`      Sentiment: ${reply.parsed.sentiment}`);
      });
    }
    
    // Save test result
    fs.writeFileSync(
      path.join(DATA_DIR, 'test-imap-result.json'),
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        messagesFound: replies.length,
        messages: replies.map(r => ({
          from: r.from,
          subject: r.subject,
          date: r.date,
          actions: r.parsed.actions,
          sentiment: r.parsed.sentiment
        }))
      }, null, 2)
    );
    
    return { success: true, messageCount: replies.length, messages: replies };
  } catch (error) {
    console.error('\n✗ IMAP Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await client.close();
  }
}

function testReplyParsing() {
  console.log('\n========================================');
  console.log('TEST 3: Reply Parsing');
  console.log('========================================');
  console.log('Testing keyword detection for dinner plan replies\n');
  
  const client = new DinnerEmailClient();
  
  const testCases = [
    {
      name: 'Approval',
      text: 'Looks good to me! Approved.',
      expected: ['approve']
    },
    {
      name: 'Rejection',
      text: 'I don\'t like these meals. Please change them.',
      expected: ['reject', 'adjust']
    },
    {
      name: 'Adjustment - Change Meal',
      text: 'Can we change Monday to Chicken Alfredo instead?',
      expected: ['adjust']
    },
    {
      name: 'Adjustment - Swap Days',
      text: 'Please swap Tuesday and Wednesday.',
      expected: ['adjust']
    },
    {
      name: 'Add to Cart',
      text: 'Add some ice cream to the cart, please. Also get bread.',
      expected: ['add_to_cart']
    },
    {
      name: 'Budget Concern',
      text: 'This looks too expensive. Can we reduce the cost?',
      expected: ['budget_concern']
    },
    {
      name: 'Mixed Request',
      text: 'The plan is good but please remove the shrimp. Add pasta instead.',
      expected: ['add_to_cart', 'remove_from_cart', 'approve']
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    const parsed = client.parseReplyContent(test.text);
    const detected = parsed.actions.map(a => a.type);
    const allExpected = test.expected.every(e => detected.includes(e));
    
    if (allExpected) {
      console.log(`✓ ${test.name}: ${detected.join(', ')}`);
      passed++;
    } else {
      console.log(`✗ ${test.name}`);
      console.log(`  Expected: ${test.expected.join(', ')}`);
      console.log(`  Got: ${detected.join(', ')}`);
      failed++;
    }
    
    if (parsed.sentiment) {
      console.log(`  Sentiment: ${parsed.sentiment}`);
    }
  }
  
  console.log(`\n----------------------------------------`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  return { success: failed === 0, passed, failed };
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     DINNER PLANS EMAIL AUTOMATION - FULL TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    timestamp: new Date().toISOString(),
    smtp: null,
    imap: null,
    parsing: null
  };
  
  // Test SMTP
  results.smtp = await testSMTP();
  
  // Wait a moment between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test IMAP
  results.imap = await testIMAP();
  
  // Test parsing
  results.parsing = testReplyParsing();
  
  // Summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`SMTP:     ${results.smtp.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`IMAP:     ${results.imap.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Parsing:  ${results.parsing.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log('----------------------------------------');
  
  const allPassed = results.smtp.success && results.imap.success && results.parsing.success;
  
  if (allPassed) {
    console.log('\n✓ ALL TESTS PASSED');
    console.log('Email automation is ready to use!');
  } else {
    console.log('\n✗ SOME TESTS FAILED');
    console.log('Please check the error messages above.');
  }
  
  // Save full results
  fs.writeFileSync(
    path.join(DATA_DIR, 'test-full-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  return results;
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--send') || args.includes('--smtp')) {
    const result = await testSMTP();
    process.exit(result.success ? 0 : 1);
  } else if (args.includes('--check') || args.includes('--imap')) {
    const result = await testIMAP();
    process.exit(result.success ? 0 : 1);
  } else if (args.includes('--parse')) {
    const result = testReplyParsing();
    process.exit(result.success ? 0 : 1);
  } else if (args.includes('--full') || args.length === 0) {
    const results = await runAllTests();
    const allPassed = results.smtp.success && results.imap.success && results.parsing.success;
    process.exit(allPassed ? 0 : 1);
  } else {
    console.log('Usage:');
    console.log('  node test-email.js --send      # Test SMTP (sending)');
    console.log('  node test-email.js --check     # Test IMAP (receiving)');
    console.log('  node test-email.js --parse     # Test reply parsing');
    console.log('  node test-email.js --full      # Run all tests (default)');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
