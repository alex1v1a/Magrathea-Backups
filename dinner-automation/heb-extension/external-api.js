// HEB Extension - External API
// This script allows external automation to communicate with the extension
// Usage: Run this in the context of a page that has the extension installed

const HEB_EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'; // Will be filled in after installation

/**
 * Update the meal plan in the HEB extension
 * @param {Array} items - Array of {name, searchTerm} objects
 * @returns {Promise}
 */
async function updateHEBMealPlan(items) {
  try {
    const response = await chrome.runtime.sendMessage(HEB_EXTENSION_ID, {
      action: 'updateMealPlan',
      items: items
    });
    return response;
  } catch (error) {
    console.error('Failed to update HEB meal plan:', error);
    throw error;
  }
}

/**
 * Trigger manual sync
 * @returns {Promise}
 */
async function triggerHEBSync() {
  try {
    const response = await chrome.runtime.sendMessage(HEB_EXTENSION_ID, {
      action: 'manualSync'
    });
    return response;
  } catch (error) {
    console.error('Failed to trigger HEB sync:', error);
    throw error;
  }
}

/**
 * Get current meal plan
 * @returns {Promise<Array>}
 */
async function getHEBMealPlan() {
  try {
    const response = await chrome.runtime.sendMessage(HEB_EXTENSION_ID, {
      action: 'getMealPlan'
    });
    return response.mealPlan;
  } catch (error) {
    console.error('Failed to get HEB meal plan:', error);
    throw error;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateHEBMealPlan, triggerHEBSync, getHEBMealPlan };
}

// Make available globally
window.hebExtensionAPI = { updateHEBMealPlan, triggerHEBSync, getHEBMealPlan };
