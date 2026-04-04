// HEB Shopping Helper - Content Script
// This script is minimal as HEB blocks automation attempts

console.log('HEB Shopping Helper loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'ok', version: '1.0' });
  }
  return true;
});
