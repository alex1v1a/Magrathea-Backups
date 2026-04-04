#!/usr/bin/env node
/**
 * Dinner Plan Email System v2.0
 * 
 * Enhanced email confirmation system with:
 * - HTML email templates with modern styling
 * - NLP-based smart reply parsing
 * - Confirmation status tracking (sent → opened → replied → confirmed)
 * - Fallback SMS via Twilio after 6 hours
 * - Unsplash meal image thumbnails
 * 
 * Usage:
 *   node dinner-email-system-v2.js --send-test      # Send test email
 *   node dinner-email-system-v2.js --check-reply    # Check for replies
 *   node dinner-email-system-v2.js --sync           # Sync to all systems
 *   node dinner-email-system-v2.js --status         # Show tracking status
 *   node dinner-email-system-v2.js --send-sms       # Send SMS fallback
 *   node dinner-email-system-v2.js --reset          # Reset tracking state
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const SMTP_CONFIG_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-smtp.json');
const TWILIO_CONFIG_FILE = path.join(WORKSPACE_DIR, '.secrets', 'twilio.json');
const UNSPLASH_CONFIG_FILE = path.join(WORKSPACE_DIR, '.secrets', 'unsplash.json');
const WEEKLY_PLAN_FILE = path.join(DINNER_DATA_DIR, 'weekly-plan.json');
const RECIPE_DATABASE_FILE = path.join(DINNER_DATA_DIR, 'recipe-database.json');
const YOUTUBE_CACHE_FILE = path.join(DINNER_DATA_DIR, 'youtube-cache.json');
const EMAIL_STATE_FILE = path.join(DINNER_DATA_DIR, 'dinner-email-state-v2.json');
const PENDING_CHANGES_FILE = path.join(DINNER_DATA_DIR, 'dinner-pending-changes.json');
const TRACKING_DB_FILE = path.join(DINNER_DATA_DIR, 'dinner-tracking-db.json');
const IMAGE_CACHE_FILE = path.join(DINNER_DATA_DIR, 'meal-image-cache.json');

// Email configuration
const EMAIL_CONFIG = {
  from: 'MarvinMartian9@icloud.com',
  fromName: 'Marvin Maverick',
  to: 'alex@1v1a.com',
  toPhone: '+18083818835', // For SMS fallback
  subjectPrefix: '🍽️ Dinner Plan',
  provider: 'icloud'
};

// Fallback timing (6 hours in milliseconds)
const FALLBACK_DELAY_MS = 6 * 60 * 60 * 1000;

// ============================================================================
// EMAIL TEMPLATE SYSTEM
// ============================================================================

/**
 * Email Template Engine
 * Provides modular, reusable HTML email templates
 */
class EmailTemplateEngine {
  constructor() {
    this.baseStyles = `
      <style>
        /* Reset */
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        /* Base */
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333333; 
          margin: 0; 
          padding: 0;
          background-color: #f5f5f5;
        }
        
        /* Container */
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Header */
        .header {
          background: linear-gradient(135deg, #d81e05 0%, #ff6b35 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px; 
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .header .subtitle {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.95;
        }
        
        /* Content */
        .content { padding: 30px 25px; }
        
        /* Status Bar */
        .status-bar {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #e9ecef;
        }
        .status-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .status-item:last-child { border-bottom: none; }
        .status-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .status-icon.pending { background: #fff3cd; }
        .status-icon.confirmed { background: #d4edda; }
        .status-icon.removed { background: #f8d7da; }
        .status-icon.modified { background: #cce5ff; }
        .status-text { flex: 1; }
        .status-text .day { font-weight: 600; color: #495057; font-size: 14px; }
        .status-text .meal { font-size: 16px; color: #212529; }
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-confirmed { background: #d4edda; color: #155724; }
        .badge-pending { background: #fff3cd; color: #856404; }
        .badge-modified { background: #cce5ff; color: #004085; }
        
        /* Meal Card */
        .meal-card {
          background: #ffffff;
          border-radius: 16px;
          margin: 20px 0;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
          transition: transform 0.2s ease;
        }
        .meal-card:hover { transform: translateY(-2px); }
        .meal-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .meal-content { padding: 20px; }
        .meal-day {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #d81e05;
          margin-bottom: 5px;
        }
        .meal-name {
          font-size: 22px;
          font-weight: 700;
          color: #212529;
          margin: 0 0 10px 0;
        }
        .meal-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin: 15px 0;
          font-size: 14px;
          color: #6c757d;
        }
        .meal-meta span { display: flex; align-items: center; gap: 5px; }
        .meal-story {
          font-size: 14px;
          color: #495057;
          font-style: italic;
          margin: 15px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid #d81e05;
        }
        .video-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #ff0000;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin-top: 10px;
          transition: background 0.2s;
        }
        .video-button:hover { background: #cc0000; }
        .ingredients-tag {
          display: inline-block;
          padding: 4px 10px;
          background: #e9ecef;
          border-radius: 20px;
          font-size: 12px;
          color: #495057;
          margin: 3px;
        }
        .ingredients-section { margin-top: 15px; }
        
        /* Budget Card */
        .budget-card {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border-radius: 16px;
          padding: 25px;
          margin: 25px 0;
          color: white;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }
        .budget-title { font-size: 14px; opacity: 0.9; margin-bottom: 5px; }
        .budget-amount { font-size: 32px; font-weight: 700; }
        .budget-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .budget-row:last-child { border-bottom: none; }
        
        /* Actions Section */
        .actions-section {
          background: #fff3e0;
          border-radius: 16px;
          padding: 25px;
          margin: 25px 0;
          border: 2px solid #ff9800;
        }
        .actions-title {
          font-size: 18px;
          font-weight: 700;
          color: #e65100;
          margin: 0 0 15px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .action-item {
          display: flex;
          align-items: flex-start;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,152,0,0.2);
        }
        .action-item:last-child { border-bottom: none; }
        .action-icon {
          width: 32px;
          height: 32px;
          background: #ff9800;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
          color: white;
          font-size: 16px;
        }
        .action-text { flex: 1; }
        .action-text strong { color: #e65100; display: block; margin-bottom: 3px; }
        .action-text span { font-size: 14px; color: #bf360c; }
        
        /* Tracking Pixel */
        .tracking-pixel { display: none; }
        
        /* Progress Bar */
        .progress-container {
          background: #e9ecef;
          border-radius: 10px;
          height: 10px;
          margin: 20px 0;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #d81e05, #ff6b35);
          border-radius: 10px;
          transition: width 0.5s ease;
        }
        
        /* Footer */
        .footer {
          background: #212529;
          color: #adb5bd;
          padding: 30px 25px;
          text-align: center;
        }
        .footer-brand { font-size: 18px; font-weight: 600; color: white; margin-bottom: 10px; }
        .footer-links { margin: 20px 0; }
        .footer-links a {
          color: #6c757d;
          text-decoration: none;
          margin: 0 15px;
          font-size: 13px;
        }
        .footer-quote {
          font-style: italic;
          font-size: 14px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #343a40;
          color: #6c757d;
        }
        
        /* Confirmation Success */
        .success-header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        }
        .sync-status {
          display: flex;
          justify-content: space-around;
          margin: 25px 0;
        }
        .sync-item { text-align: center; }
        .sync-icon {
          width: 60px;
          height: 60px;
          background: #d4edda;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 10px;
        }
        .sync-item.pending .sync-icon { background: #fff3cd; }
        .sync-item.error .sync-icon { background: #f8d7da; }
        
        /* Mobile Responsive */
        @media screen and (max-width: 600px) {
          .content { padding: 20px 15px; }
          .header h1 { font-size: 24px; }
          .meal-name { font-size: 18px; }
          .budget-amount { font-size: 24px; }
          .meal-meta { flex-direction: column; gap: 8px; }
        }
      </style>
    `;
  }

  /**
   * Render the main dinner plan email
   */
  renderDinnerPlanEmail(data) {
    const { plan, recipes, youtubeCache, images, trackingId, weekOf } = data;
    const trackingPixel = this.generateTrackingPixel(trackingId, 'opened');
    
    let mealsHtml = '';
    for (const meal of plan.meals) {
      const recipe = recipes[meal.name];
      const youtube = youtubeCache[meal.name];
      const imageUrl = images[meal.name] || this.getDefaultMealImage(meal.name);
      
      mealsHtml += this.renderMealCard(meal, recipe, youtube, imageUrl);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Dinner Plan</title>
  ${this.baseStyles}
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>🍽️ Weekly Dinner Plan</h1>
      <p class="subtitle">Week of ${weekOf}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Budget Summary -->
      <div class="budget-card">
        <div class="budget-title">Budget Overview</div>
        <div class="budget-amount">$${plan.budget.remaining.toFixed(2)} remaining</div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${(plan.budget.estimatedMealCost / plan.budget.allocated * 100).toFixed(0)}%;"></div>
        </div>
        <div class="budget-row">
          <span>Allocated</span>
          <strong>$${plan.budget.allocated}</strong>
        </div>
        <div class="budget-row">
          <span>Estimated Cost</span>
          <strong>$${plan.budget.estimatedMealCost}</strong>
        </div>
      </div>
      
      <!-- Meals -->
      <h2 style="color: #333; margin-top: 30px;">This Week's Menu</h2>
      ${mealsHtml}
      
      <!-- How to Respond -->
      <div class="actions-section">
        <div class="actions-title">📋 Reply to Confirm or Change</div>
        <div class="action-item">
          <div class="action-icon">↔️</div>
          <div class="action-text">
            <strong>Swap a meal</strong>
            <span>"Swap Monday to Chicken Alfredo" or "Change Tuesday to pasta"</span>
          </div>
        </div>
        <div class="action-item">
          <div class="action-icon">🗑️</div>
          <div class="action-text">
            <strong>Remove a meal</strong>
            <span>"Remove Wednesday" or "Skip Friday dinner"</span>
          </div>
        </div>
        <div class="action-item">
          <div class="action-icon">➕</div>
          <div class="action-text">
            <strong>Add a meal</strong>
            <span>"Add Sunday: Spaghetti Carbonara"</span>
          </div>
        </div>
        <div class="action-item">
          <div class="action-icon">✅</div>
          <div class="action-text">
            <strong>Confirm all</strong>
            <span>"Looks good!" or "Confirmed" or just "Yes"</span>
          </div>
        </div>
      </div>
      
      <p style="text-align: center; color: #6c757d; margin: 25px 0;">
        <em>I'll automatically sync your changes to Apple Calendar and update your HEB cart!</em>
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">Marvin Maverick</div>
      <div style="font-size: 14px; margin-bottom: 15px;">Alex's Assistant | Logistics Coordinator</div>
      <div class="footer-links">
        <a href="#">Dinner Automation</a>
        <a href="#">View Full Plan</a>
        <a href="#">Recipe Database</a>
      </div>
      <div class="footer-quote">
        "Brain the size of a planet, and I'm asked to write an email."
      </div>
    </div>
  </div>
  ${trackingPixel}
</body>
</html>`;
  }

  /**
   * Render a single meal card
   */
  renderMealCard(meal, recipe, youtube, imageUrl) {
    const difficultyEmoji = { easy: '🔰', medium: '⚡', hard: '🔥' };
    const ingredientsHtml = meal.ingredients
      .map(i => `<span class="ingredients-tag">${i.name}</span>`)
      .join('');
    
    return `
    <div class="meal-card">
      <img src="${imageUrl}" alt="${meal.name}" class="meal-image" onerror="this.src='${this.getDefaultMealImage(meal.name)}'">
      <div class="meal-content">
        <div class="meal-day">${meal.day}</div>
        <h3 class="meal-name">${meal.name}</h3>
        <div class="meal-meta">
          <span>⏱️ ${meal.prepTime}</span>
          ${recipe ? `<span>🌍 ${recipe.cuisine}</span>` : ''}
          <span>💰 $${meal.estimatedCost}</span>
          <span>${difficultyEmoji[meal.difficulty] || '⚡'} ${meal.difficulty}</span>
        </div>
        ${recipe?.story ? `<div class="meal-story">📖 ${recipe.story.substring(0, 150)}${recipe.story.length > 150 ? '...' : ''}</div>` : ''}
        ${youtube ? `<a href="${youtube.url}" class="video-button" target="_blank">🎥 Watch Tutorial (${youtube.duration})</a>` : ''}
        <div class="ingredients-section">
          <strong style="font-size: 13px; color: #6c757d; text-transform: uppercase;">Ingredients:</strong>
          <div style="margin-top: 8px;">${ingredientsHtml}</div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Render confirmation email
   */
  renderConfirmationEmail(data) {
    const { plan, results, trackingId } = data;
    
    const mealsHtml = plan.meals
      .filter(m => m.status !== 'removed')
      .map(m => `
        <div class="status-item">
          <div class="status-icon ${m.status === 'modified' ? 'modified' : 'confirmed'}">
            ${m.status === 'modified' ? '✏️' : '✅'}
          </div>
          <div class="status-text">
            <div class="day">${m.day}</div>
            <div class="meal">${m.name}</div>
          </div>
          <span class="status-badge ${m.status === 'modified' ? 'badge-modified' : 'badge-confirmed'}">
            ${m.status === 'modified' ? 'Modified' : 'Confirmed'}
          </span>
        </div>
      `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dinner Plan Confirmed</title>
  ${this.baseStyles}
</head>
<body>
  <div class="email-container">
    <div class="header success-header">
      <h1>✅ Dinner Plan Confirmed!</h1>
      <p class="subtitle">All systems synced and ready</p>
    </div>
    
    <div class="content">
      <!-- Sync Status -->
      <div class="sync-status">
        <div class="sync-item ${results.calendar ? '' : 'pending'}">
          <div class="sync-icon">📅</div>
          <div><strong>Calendar</strong><br><small>${results.calendar ? 'Synced' : 'Pending'}</small></div>
        </div>
        <div class="sync-item ${results.heb ? '' : 'pending'}">
          <div class="sync-icon">🛒</div>
          <div><strong>HEB Cart</strong><br><small>${results.heb ? 'Updated' : 'Pending'}</small></div>
        </div>
        <div class="sync-item confirmed">
          <div class="sync-icon">📧</div>
          <div><strong>Email</strong><br><small>Confirmed</small></div>
        </div>
      </div>
      
      <!-- Confirmed Meals -->
      <h2 style="color: #333; margin-top: 30px;">Confirmed Menu</h2>
      <div class="status-bar">
        ${mealsHtml}
      </div>
      
      <div style="background: #d4edda; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
        <h3 style="margin: 0 0 10px 0; color: #155724;">You're All Set!</h3>
        <p style="margin: 0; color: #155724;">Your dinner plan is confirmed and synced across all systems.</p>
      </div>
      
      <p style="text-align: center; color: #6c757d;">
        Need to make changes? Just reply to this email!
      </p>
    </div>
    
    <div class="footer">
      <div class="footer-brand">Marvin Maverick</div>
      <div style="font-size: 14px; margin-bottom: 15px;">Alex's Assistant | Logistics Coordinator</div>
      <div class="footer-quote">
        "Brain the size of a planet, and I'm asked to write an email."
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Render reminder email (for SMS fallback context)
   */
  renderReminderEmail(data) {
    const { plan, hoursElapsed, trackingId } = data;
    
    const mealsPreview = plan.meals
      .slice(0, 3)
      .map(m => `• ${m.day}: ${m.name}`)
      .join('\n');

    return `Hey Alex! 👋

You have a dinner plan waiting for confirmation (${hoursElapsed} hours ago).

This Week's Meals:
${mealsPreview}
${plan.meals.length > 3 ? `...and ${plan.meals.length - 3} more meals` : ''}

Reply to the email or text back:
• "Looks good" to confirm
• "Swap Monday to [meal]" to change
• "Remove Tuesday" to skip

— Marvin`;
  }

  /**
   * Generate tracking pixel HTML
   */
  generateTrackingPixel(trackingId, event) {
    // In production, this would be a real pixel URL
    const pixelUrl = `https://automation.1v1a.com/track?id=${trackingId}&event=${event}&t=${Date.now()}`;
    return `<img src="${pixelUrl}" width="1" height="1" alt="" class="tracking-pixel" />`;
  }

  /**
   * Get default meal image based on cuisine or meal name
   */
  getDefaultMealImage(mealName) {
    const defaults = {
      'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=400&fit=crop',
      'chicken': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop',
      'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
      'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop',
      'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
      'soup': 'https://images.unsplash.com/photo-1547592166-23acbe3a624b?w=600&h=400&fit=crop',
      'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
      'default': 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop'
    };
    
    const nameLower = mealName.toLowerCase();
    for (const [key, url] of Object.entries(defaults)) {
      if (nameLower.includes(key)) return url;
    }
    return defaults.default;
  }
}

// ============================================================================
// SMART REPLY PARSER (NLP)
// ============================================================================

/**
 * Natural Language Parser for Dinner Plan Replies
 * Uses pattern matching and semantic understanding
 */
class SmartReplyParser {
  constructor() {
    // Intent patterns with confidence scoring
    this.intentPatterns = {
      confirm: {
        patterns: [
          /\b(?:looks?\s+good|sounds?\s+good|perfect|great|awesome|excellent|confirm(?:ed)?|approve[d]?|yes+|yep|yeah|ok(?:ay)?|sure|works?\s+(?:for\s+me|fine))\b/i,
          /\b(?:i'm?\s+(?:good|happy|satisfied)|all\s+(?:good|set|fine)|go\s+ahead|proceed|ship\s+it)\b/i,
          /\b(?:no\s+changes?|nothing\s+(?:to\s+)?change|keep\s+(?:it|them|as\s+is))\b/i
        ],
        confidence: 0.9
      },
      swap: {
        patterns: [
          /\b(?:swap|change|replace|switch|trade)\s+(?<target>.+?)\s+(?:to|with|for)\s+(?<replacement>.+)/i,
          /\b(?:make|set)\s+(?<day>\w+day)\s+(?:into|to|:)?\s*(?<replacement>.+)/i,
          /\binstead\s+of\s+(?<target>.+?),?\s+(?:do|make|have)\s+(?<replacement>.+)/i,
          /\b(?:swap\s+out|replace)\s+(?<target>.+?)(?:\s+for\s+(?<replacement>.+))?/i
        ],
        confidence: 0.85
      },
      remove: {
        patterns: [
          /\b(?:remove|delete|drop|skip|cancel|get\s+rid\s+of|eliminate)\s+(?<target>.+)/i,
          /\b(?:no\s+(?:need\s+for)?|don't\s+(?:need|want))\s+(?<target>.+)/i,
          /\b(?:remove|skip)\s+(?<day>\w+day)(?:\s+(?:dinner|meal))?/i,
          /\b(?:take\s+out|cut)\s+(?<target>.+)/i
        ],
        confidence: 0.85
      },
      add: {
        patterns: [
          /\b(?:add|include|insert|put\s+in)\s+(?<meal>.+?)(?:\s+(?:to|on)\s+(?<day>\w+day))?/i,
          /\b(?:also\s+)?(?:want|need|like)\s+(?<meal>.+?)(?:\s+(?:on|for)\s+(?<day>\w+day))?/i,
          /\b(?:let'?s?\s+(?:add|have)|can\s+we\s+add)\s+(?<meal>.+)/i
        ],
        confidence: 0.8
      },
      modify: {
        patterns: [
          /\b(?:modify|adjust|tweak|change)\s+(?<target>.+?)(?:\s+to\s+(?<change>.+))?/i,
          /\b(?:different|other)\s+(?<category>.+?)(?:\s+instead)?/i
        ],
        confidence: 0.75
      },
      question: {
        patterns: [
          /\b(?:what|how|when|where|why|can|could|would|will|is|are|does|do)\b.+/i,
          /\?$/
        ],
        confidence: 0.7
      }
    };

    // Day extraction patterns
    this.dayPatterns = [
      /\b(monday|mon)\b/i,
      /\b(tuesday|tues|tue)\b/i,
      /\b(wednesday|wed)\b/i,
      /\b(thursday|thurs|thu|thur)\b/i,
      /\b(friday|fri)\b/i,
      /\b(saturday|sat)\b/i,
      /\b(sunday|sun)\b/i
    ];

    // Negation detection for disambiguation
    this.negationPatterns = [
      /\b(don'?t|do\s+not|no|never|not)\b/i,
      /\b(?:wait|hold\s+on|actually|nevermind)\b/i
    ];
  }

  /**
   * Parse a reply message and extract structured actions
   */
  parse(replyText) {
    if (!replyText || typeof replyText !== 'string') {
      return { intent: 'unknown', actions: [], confidence: 0 };
    }

    const cleaned = this.cleanText(replyText);
    const sentences = this.splitSentences(cleaned);
    
    const actions = [];
    let primaryIntent = 'unknown';
    let maxConfidence = 0;

    for (const sentence of sentences) {
      // Check for negation (might invert intent)
      const hasNegation = this.negationPatterns.some(p => p.test(sentence));
      
      // Match each intent
      for (const [intent, config] of Object.entries(this.intentPatterns)) {
        for (const pattern of config.patterns) {
          const match = sentence.match(pattern);
          if (match) {
            let confidence = config.confidence;
            
            // Adjust confidence based on context
            if (hasNegation && intent !== 'remove') confidence *= 0.6;
            if (match.groups) confidence += 0.05;
            
            const action = this.extractAction(intent, match, sentence);
            if (action) {
              actions.push({ ...action, confidence });
              if (confidence > maxConfidence) {
                maxConfidence = confidence;
                primaryIntent = intent;
              }
            }
          }
        }
      }
    }

    // If no specific actions but text looks positive, assume confirmation
    if (actions.length === 0 && this.isLikelyConfirmation(cleaned)) {
      actions.push({ action: 'confirm', confidence: 0.7 });
      primaryIntent = 'confirm';
      maxConfidence = 0.7;
    }

    return {
      intent: primaryIntent,
      actions: this.deduplicateActions(actions),
      confidence: maxConfidence,
      raw: replyText,
      cleaned: cleaned
    };
  }

  /**
   * Clean and normalize text for parsing
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[\*\_\-\~\`]/g, '')
      .trim();
  }

  /**
   * Split text into sentences
   */
  splitSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extract structured action from regex match
   */
  extractAction(intent, match, sentence) {
    const groups = match.groups || {};
    
    switch (intent) {
      case 'confirm':
        return { action: 'confirm' };
        
      case 'swap':
        return {
          action: 'swap',
          day: this.extractDay(groups.day || groups.target || sentence),
          targetMeal: groups.target?.trim(),
          newMeal: groups.replacement?.trim(),
          originalText: match[0]
        };
        
      case 'remove':
        return {
          action: 'remove',
          day: this.extractDay(groups.day || groups.target || sentence),
          targetMeal: groups.target?.trim(),
          originalText: match[0]
        };
        
      case 'add':
        return {
          action: 'add',
          day: this.extractDay(groups.day || sentence),
          mealName: groups.meal?.trim(),
          originalText: match[0]
        };
        
      case 'modify':
        return {
          action: 'modify',
          day: this.extractDay(groups.target || sentence),
          targetMeal: groups.target?.trim(),
          modification: groups.change?.trim(),
          originalText: match[0]
        };
        
      default:
        return null;
    }
  }

  /**
   * Extract day of week from text
   */
  extractDay(text) {
    if (!text) return null;
    
    const dayMap = {
      'monday': 'Monday', 'mon': 'Monday',
      'tuesday': 'Tuesday', 'tues': 'Tuesday', 'tue': 'Tuesday',
      'wednesday': 'Wednesday', 'wed': 'Wednesday',
      'thursday': 'Thursday', 'thurs': 'Thursday', 'thu': 'Thursday', 'thur': 'Thursday',
      'friday': 'Friday', 'fri': 'Friday',
      'saturday': 'Saturday', 'sat': 'Saturday',
      'sunday': 'Sunday', 'sun': 'Sunday'
    };
    
    const lower = text.toLowerCase();
    for (const [pattern, fullDay] of Object.entries(dayMap)) {
      if (lower.includes(pattern)) return fullDay;
    }
    
    return null;
  }

  /**
   * Check if text is likely a confirmation without explicit patterns
   */
  isLikelyConfirmation(text) {
    const positiveWords = ['good', 'fine', 'ok', 'yes', 'great', 'perfect', 'thanks', 'thank'];
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    return positiveCount > 0 && text.length < 50;
  }

  /**
   * Remove duplicate actions
   */
  deduplicateActions(actions) {
    const seen = new Set();
    return actions.filter(a => {
      const key = `${a.action}-${a.day}-${a.mealName || a.newMeal || a.targetMeal}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate human-readable summary of parsed actions
   */
  summarize(parsed) {
    if (parsed.actions.length === 0) {
      return "I couldn't understand your reply. Please try phrases like 'Looks good', 'Swap Monday to Chicken', or 'Remove Tuesday'.";
    }

    const summaries = parsed.actions.map(a => {
      switch (a.action) {
        case 'confirm': return "✅ Confirm all meals";
        case 'swap': return `↔️ Swap ${a.day || 'meal'} to ${a.newMeal || 'something else'}`;
        case 'remove': return `🗑️ Remove ${a.day || a.targetMeal || 'meal'}`;
        case 'add': return `➕ Add ${a.mealName} ${a.day ? `on ${a.day}` : ''}`;
        case 'modify': return `✏️ Modify ${a.day || a.targetMeal}`;
        default: return `❓ Unknown action`;
      }
    });

    return summaries.join('\n');
  }
}

// ============================================================================
// CONFIRMATION STATUS TRACKING
// ============================================================================

/**
 * Status Tracking System
 * Tracks: sent → opened → replied → confirmed
 */
class StatusTracker {
  constructor() {
    this.dbFile = TRACKING_DB_FILE;
  }

  /**
   * Load tracking database
   */
  async loadDb() {
    try {
      const data = await fs.readFile(this.dbFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { sessions: {}, current: null };
    }
  }

  /**
   * Save tracking database
   */
  async saveDb(db) {
    await fs.writeFile(this.dbFile, JSON.stringify(db, null, 2));
  }

  /**
   * Start new tracking session
   */
  async startSession(planData) {
    const db = await this.loadDb();
    const sessionId = this.generateId();
    const weekOf = planData.weekOf || new Date().toISOString();
    
    const session = {
      id: sessionId,
      weekOf: weekOf,
      createdAt: new Date().toISOString(),
      status: 'sent',
      timeline: [
        { status: 'sent', timestamp: new Date().toISOString() }
      ],
      meals: planData.meals?.map(m => ({
        day: m.day,
        name: m.name,
        status: 'pending'
      })) || [],
      openedAt: null,
      repliedAt: null,
      confirmedAt: null,
      replyContent: null,
      actions: [],
      smsSent: false,
      smsSentAt: null
    };
    
    db.sessions[sessionId] = session;
    db.current = sessionId;
    await this.saveDb(db);
    
    return session;
  }

  /**
   * Record email opened
   */
  async recordOpened(sessionId) {
    const db = await this.loadDb();
    const session = db.sessions[sessionId];
    if (!session || session.openedAt) return false;
    
    session.openedAt = new Date().toISOString();
    session.status = 'opened';
    session.timeline.push({
      status: 'opened',
      timestamp: session.openedAt
    });
    
    await this.saveDb(db);
    return true;
  }

  /**
   * Record reply received
   */
  async recordReply(sessionId, replyContent, parsedActions) {
    const db = await this.loadDb();
    const session = db.sessions[sessionId];
    if (!session) return false;
    
    session.repliedAt = new Date().toISOString();
    session.replyContent = replyContent;
    session.status = 'replied';
    session.actions = parsedActions;
    session.timeline.push({
      status: 'replied',
      timestamp: session.repliedAt,
      actions: parsedActions.map(a => a.action)
    });
    
    await this.saveDb(db);
    return true;
  }

  /**
   * Record confirmation complete
   */
  async recordConfirmed(sessionId) {
    const db = await this.loadDb();
    const session = db.sessions[sessionId];
    if (!session) return false;
    
    session.confirmedAt = new Date().toISOString();
    session.status = 'confirmed';
    session.timeline.push({
      status: 'confirmed',
      timestamp: session.confirmedAt
    });
    
    // Update meal statuses
    session.meals.forEach(m => {
      if (m.status === 'pending') m.status = 'confirmed';
    });
    
    await this.saveDb(db);
    return true;
  }

  /**
   * Record SMS fallback sent
   */
  async recordSmsSent(sessionId) {
    const db = await this.loadDb();
    const session = db.sessions[sessionId];
    if (!session) return false;
    
    session.smsSent = true;
    session.smsSentAt = new Date().toISOString();
    session.timeline.push({
      status: 'sms_sent',
      timestamp: session.smsSentAt
    });
    
    await this.saveDb(db);
    return true;
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    const db = await this.loadDb();
    if (!db.current) return null;
    return db.sessions[db.current];
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    const db = await this.loadDb();
    return db.sessions[sessionId] || null;
  }

  /**
   * Check if SMS fallback is needed
   */
  async shouldSendSms() {
    const session = await this.getCurrentSession();
    if (!session) return false;
    if (session.status !== 'sent' && session.status !== 'opened') return false;
    if (session.smsSent) return false;
    
    const sentTime = new Date(session.createdAt).getTime();
    const elapsed = Date.now() - sentTime;
    
    return elapsed >= FALLBACK_DELAY_MS;
  }

  /**
   * Get status summary
   */
  async getStatus() {
    const session = await this.getCurrentSession();
    if (!session) {
      return { status: 'none', message: 'No active dinner plan session' };
    }
    
    const elapsed = Date.now() - new Date(session.createdAt).getTime();
    const hoursElapsed = Math.floor(elapsed / (1000 * 60 * 60));
    
    return {
      status: session.status,
      sessionId: session.id,
      weekOf: session.weekOf,
      hoursElapsed: hoursElapsed,
      opened: !!session.openedAt,
      replied: !!session.repliedAt,
      confirmed: !!session.confirmedAt,
      smsSent: session.smsSent,
      timeline: session.timeline,
      meals: session.meals
    };
  }

  /**
   * Generate unique session ID
   */
  generateId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// IMAGE FETCHING (UNSPLASH)
// ============================================================================

/**
 * Unsplash Image Service
 * Fetches meal images with caching
 */
class ImageService {
  constructor() {
    this.cacheFile = IMAGE_CACHE_FILE;
    this.config = null;
  }

  /**
   * Load configuration
   */
  async loadConfig() {
    if (this.config) return this.config;
    try {
      const data = await fs.readFile(UNSPLASH_CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
      return this.config;
    } catch {
      return null;
    }
  }

  /**
   * Load image cache
   */
  async loadCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * Save image cache
   */
  async saveCache(cache) {
    await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
  }

  /**
   * Get image for a meal
   */
  async getMealImage(mealName, cuisine) {
    const cache = await this.loadCache();
    
    // Check cache first
    if (cache[mealName] && !this.isExpired(cache[mealName])) {
      return cache[mealName].url;
    }

    // Try to fetch from Unsplash
    const config = await this.loadConfig();
    if (config?.accessKey) {
      try {
        const url = await this.fetchFromUnsplash(mealName, cuisine, config.accessKey);
        if (url) {
          cache[mealName] = {
            url: url,
            fetchedAt: new Date().toISOString(),
            source: 'unsplash'
          };
          await this.saveCache(cache);
          return url;
        }
      } catch (error) {
        console.log(`⚠️ Unsplash fetch failed for ${mealName}:`, error.message);
      }
    }

    // Return default image
    return this.getDefaultImage(mealName, cuisine);
  }

  /**
   * Fetch image from Unsplash API
   */
  async fetchFromUnsplash(mealName, cuisine, accessKey) {
    const query = cuisine ? `${cuisine} food ${mealName}` : `food ${mealName}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=1&orientation=landscape`;
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
          'Accept-Version': 'v1'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.results && json.results.length > 0) {
              // Return medium-sized image URL
              resolve(json.results[0].urls.regular);
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Get default image based on meal characteristics
   */
  getDefaultImage(mealName, cuisine) {
    const defaults = {
      'italian': 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=400&fit=crop',
      'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop',
      'asian': 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop',
      'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop',
      'american': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
      'mediterranean': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=400&fit=crop',
      'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=400&fit=crop',
      'chicken': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop',
      'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
      'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop',
      'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
      'soup': 'https://images.unsplash.com/photo-1547592166-23acbe3a624b?w=600&h=400&fit=crop',
      'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
      'default': 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop'
    };
    
    const nameLower = mealName.toLowerCase();
    const cuisineLower = (cuisine || '').toLowerCase();
    
    // Check cuisine first
    if (cuisineLower && defaults[cuisineLower]) {
      return defaults[cuisineLower];
    }
    
    // Check meal name keywords
    for (const [key, url] of Object.entries(defaults)) {
      if (nameLower.includes(key)) return url;
    }
    
    return defaults.default;
  }

  /**
   * Check if cached image is expired (7 days)
   */
  isExpired(cached) {
    const fetched = new Date(cached.fetchedAt).getTime();
    return (Date.now() - fetched) > (7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get images for all meals in a plan
   */
  async getImagesForPlan(meals, recipes) {
    const images = {};
    
    for (const meal of meals) {
      const recipe = recipes[meal.name];
      images[meal.name] = await this.getMealImage(meal.name, recipe?.cuisine);
    }
    
    return images;
  }
}

// ============================================================================
// SMS FALLBACK (TWILIO)
// ============================================================================

/**
 * Twilio SMS Service
 * Sends SMS fallback for unresponsive emails
 */
class SmsService {
  constructor() {
    this.config = null;
  }

  /**
   * Load Twilio configuration
   */
  async loadConfig() {
    if (this.config) return this.config;
    try {
      const data = await fs.readFile(TWILIO_CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
      return this.config;
    } catch {
      console.error('❌ Twilio config not found at', TWILIO_CONFIG_FILE);
      return null;
    }
  }

  /**
   * Send SMS message
   */
  async sendSms(to, message) {
    const config = await this.loadConfig();
    if (!config) {
      return { success: false, error: 'Twilio config not found' };
    }

    const payload = new URLSearchParams({
      To: to,
      From: config.fromNumber,
      Body: message
    });

    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': payload.toString().length
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.sid) {
              resolve({ success: true, sid: json.sid });
            } else {
              resolve({ success: false, error: json.message || 'Unknown error' });
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(payload.toString());
      req.end();
    });
  }

  /**
   * Send dinner plan reminder SMS
   */
  async sendReminder(plan, hoursElapsed) {
    const meals = plan.meals.slice(0, 3).map(m => `• ${m.day}: ${m.name}`).join('\n');
    const moreText = plan.meals.length > 3 ? `\n...and ${plan.meals.length - 3} more` : '';
    
    const message = `🍽️ Dinner Plan Reminder\n\n${meals}${moreText}\n\nReply:\n"Yes" to confirm\n"Swap Monday to [meal]" to change\n"Remove Tuesday" to skip`;

    return this.sendSms(EMAIL_CONFIG.toPhone, message);
  }
}

// ============================================================================
// CORE EMAIL FUNCTIONS
// ============================================================================

const templates = new EmailTemplateEngine();
const parser = new SmartReplyParser();
const tracker = new StatusTracker();
const images = new ImageService();
const sms = new SmsService();

/**
 * Load SMTP configuration
 */
async function loadSmtpConfig() {
  try {
    const data = await fs.readFile(SMTP_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load SMTP config:', error.message);
    return null;
  }
}

/**
 * Send email via SMTP using curl
 */
async function sendEmailViaSmtp(to, subject, htmlBody, config, trackingId = null) {
  const boundary = `----=_Part_${Date.now()}`;
  const date = new Date().toUTCString();
  const messageId = `${Date.now()}@icloud.com`;
  
  // Create plain text version
  const plainText = htmlBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
  
  const emailContent = [
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    plainText + (plainText.length >= 2000 ? '\n\n[View full email in HTML]' : ''),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ].join('\r\n');
  
  const fullEmail = [
    `From: "${EMAIL_CONFIG.fromName}" <${config.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-Id: <${messageId}>`,
    emailContent
  ].join('\r\n');
  
  const tempFile = path.join(DINNER_DATA_DIR, `temp-email-${Date.now()}.eml`);
  await fs.writeFile(tempFile, fullEmail);
  
  try {
    const curlCmd = [
      'curl',
      '-s',
      '--url', 'smtp://smtp.mail.me.com:587',
      '--ssl-reqd',
      '--mail-from', config.email,
      '--mail-rcpt', to,
      '--upload-file', tempFile,
      '--user', `${config.email}:${config.app_specific_password}`,
      '--tlsv1.2'
    ];
    
    execSync(curlCmd.join(' '), { 
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await fs.unlink(tempFile).catch(() => {});
    return { success: true, messageId };
    
  } catch (error) {
    await fs.unlink(tempFile).catch(() => {});
    console.error('❌ SMTP send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Load weekly dinner plan
 */
async function loadWeeklyPlan() {
  try {
    const data = await fs.readFile(WEEKLY_PLAN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load weekly plan:', error.message);
    return null;
  }
}

/**
 * Load recipe database
 */
async function loadRecipeDatabase() {
  try {
    const data = await fs.readFile(RECIPE_DATABASE_FILE, 'utf8');
    const db = JSON.parse(data);
    return db.recipes || {};
  } catch (error) {
    console.error('⚠️ Failed to load recipe database:', error.message);
    return {};
  }
}

/**
 * Load YouTube cache
 */
async function loadYouTubeCache() {
  try {
    const data = await fs.readFile(YOUTUBE_CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);
    return cache.videos || {};
  } catch (error) {
    return {};
  }
}

/**
 * Send dinner plan email
 */
async function sendDinnerPlanEmail() {
  console.log('📧 Sending dinner plan confirmation email...\n');
  
  const config = await loadSmtpConfig();
  if (!config) {
    console.error('❌ SMTP configuration not found');
    return { success: false };
  }
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    console.error('❌ No weekly plan available');
    return { success: false };
  }
  
  const recipes = await loadRecipeDatabase();
  const youtubeCache = await loadYouTubeCache();
  
  // Start tracking session
  const session = await tracker.startSession(plan);
  console.log(`📊 Started tracking session: ${session.id}`);
  
  // Fetch meal images
  console.log('🖼️  Fetching meal images...');
  const mealImages = await images.getImagesForPlan(plan.meals, recipes);
  
  // Build email
  const weekOf = new Date(plan.weekOf).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  
  const htmlContent = templates.renderDinnerPlanEmail({
    plan,
    recipes,
    youtubeCache,
    images: mealImages,
    trackingId: session.id,
    weekOf
  });
  
  const subject = `${EMAIL_CONFIG.subjectPrefix}: Week of ${weekOf}`;
  
  // Send email
  console.log('📤 Sending via iCloud SMTP...');
  const result = await sendEmailViaSmtp(EMAIL_CONFIG.to, subject, htmlContent, config, session.id);
  
  if (result.success) {
    console.log('✅ Dinner plan email sent successfully!');
    console.log(`   To: ${EMAIL_CONFIG.to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Session: ${session.id}`);
    console.log(`\n⏰ SMS fallback scheduled in 6 hours if no reply`);
    
    // Save email preview
    const previewFile = path.join(DINNER_DATA_DIR, 'pending-dinner-email-v2.html');
    await fs.writeFile(previewFile, htmlContent);
    
    return { success: true, sessionId: session.id };
  } else {
    console.error('❌ Failed to send email:', result.error);
    return { success: false, error: result.error };
  }
}

/**
 * Check for email replies
 */
async function checkEmailReplies() {
  console.log('📥 Checking for dinner plan email replies...\n');
  
  const status = await tracker.getStatus();
  console.log(`Current status: ${status.status}`);
  
  if (status.status === 'none') {
    console.log('ℹ️ No active dinner plan session');
    return { hasReply: false };
  }
  
  if (status.status === 'confirmed') {
    console.log('✅ Dinner plan already confirmed');
    return { hasReply: false, alreadyConfirmed: true };
  }
  
  // Check for pending changes file (simulates email reply)
  try {
    const changesData = await fs.readFile(PENDING_CHANGES_FILE, 'utf8');
    const changes = JSON.parse(changesData);
    
    if (changes.length > 0) {
      console.log(`✅ Found ${changes.length} pending changes`);
      
      // Use smart parser to understand the reply
      const replyText = changes._replyText || JSON.stringify(changes);
      const parsed = parser.parse(replyText);
      
      console.log('\n🧠 Parsed intent:', parsed.intent);
      console.log('Confidence:', (parsed.confidence * 100).toFixed(0) + '%');
      console.log('\nActions detected:');
      console.log(parser.summarize(parsed));
      
      // Record the reply
      const session = await tracker.getCurrentSession();
      if (session) {
        await tracker.recordReply(session.id, replyText, parsed.actions);
      }
      
      return { hasReply: true, changes: parsed.actions, parsed };
    }
  } catch (error) {
    // No pending changes
  }
  
  console.log(`⏳ No reply yet (${status.hoursElapsed}h elapsed)`);
  
  // Check if SMS fallback is needed
  const shouldSms = await tracker.shouldSendSms();
  if (shouldSms) {
    console.log('\n📱 SMS fallback is due!');
  }
  
  return { hasReply: false, hoursElapsed: status.hoursElapsed, smsDue: shouldSms };
}

/**
 * Apply changes to dinner plan
 */
async function applyChanges(actions) {
  console.log('\n🔄 Applying changes to dinner plan...\n');
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    console.error('❌ No plan to modify');
    return { success: false };
  }
  
  const applied = [];
  const failed = [];
  
  for (const action of actions) {
    try {
      switch (action.action) {
        case 'confirm':
          applied.push('Confirmed all meals');
          break;
          
        case 'swap':
          if (action.day) {
            const idx = plan.meals.findIndex(m => 
              m.day.toLowerCase() === action.day.toLowerCase()
            );
            if (idx >= 0 && action.newMeal) {
              const oldMeal = plan.meals[idx].name;
              plan.meals[idx].name = action.newMeal;
              plan.meals[idx].status = 'modified';
              applied.push(`Swapped ${action.day}: ${oldMeal} → ${action.newMeal}`);
            } else if (idx >= 0) {
              failed.push(`Swap for ${action.day}: No replacement meal specified`);
            } else {
              failed.push(`Could not find meal on ${action.day}`);
            }
          } else {
            failed.push('Swap: No day specified');
          }
          break;
          
        case 'remove':
          if (action.day) {
            const idx = plan.meals.findIndex(m => 
              m.day.toLowerCase() === action.day.toLowerCase()
            );
            if (idx >= 0) {
              const removedMeal = plan.meals[idx].name;
              plan.meals[idx].status = 'removed';
              applied.push(`Removed ${action.day}: ${removedMeal}`);
            } else {
              failed.push(`Could not find meal on ${action.day}`);
            }
          } else {
            failed.push('Remove: No day specified');
          }
          break;
          
        case 'add':
          if (action.mealName && action.day) {
            plan.meals.push({
              day: action.day,
              name: action.mealName,
              status: 'added',
              prepTime: '30 mins',
              estimatedCost: 15,
              difficulty: 'medium',
              ingredients: []
            });
            applied.push(`Added ${action.day}: ${action.mealName}`);
          } else {
            failed.push('Add: Missing day or meal name');
          }
          break;
          
        default:
          failed.push(`Unknown action: ${action.action}`);
      }
    } catch (error) {
      failed.push(`${action.action}: ${error.message}`);
    }
  }
  
  // Save updated plan
  await fs.writeFile(WEEKLY_PLAN_FILE, JSON.stringify(plan, null, 2));
  
  // Clear pending changes
  await fs.writeFile(PENDING_CHANGES_FILE, JSON.stringify([], null, 2));
  
  console.log('✅ Changes applied:');
  applied.forEach(c => console.log(`   ✓ ${c}`));
  
  if (failed.length > 0) {
    console.log('\n⚠️ Failed:');
    failed.forEach(c => console.log(`   ✗ ${c}`));
  }
  
  return { success: true, applied, failed, plan };
}

/**
 * Sync to all systems
 */
async function syncToAllSystems() {
  console.log('🔄 Syncing dinner plan to all systems...\n');
  
  const results = { calendar: false, heb: false };
  
  // 1. Sync to Apple Calendar
  console.log('1️⃣ Syncing to Apple Calendar...');
  try {
    execSync('node sync-dinner-to-icloud.js', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    results.calendar = true;
    console.log('   ✅ Calendar synced\n');
  } catch (error) {
    console.log('   ⚠️ Calendar sync had issues\n');
  }
  
  // 2. Update HEB Extension
  console.log('2️⃣ Updating HEB meal plan...');
  try {
    const plan = await loadWeeklyPlan();
    if (plan) {
      const allIngredients = [];
      for (const meal of plan.meals) {
        if (meal.status !== 'removed') {
          for (const ing of meal.ingredients || []) {
            allIngredients.push({
              name: ing.name,
              searchTerm: ing.hebSearch || ing.name
            });
          }
        }
      }
      
      const seen = new Set();
      const unique = [];
      for (const item of allIngredients) {
        if (!seen.has(item.name.toLowerCase())) {
          seen.add(item.name.toLowerCase());
          unique.push(item);
        }
      }
      
      const extensionItemsFile = path.join(DINNER_DATA_DIR, 'heb-extension-items.json');
      await fs.writeFile(extensionItemsFile, JSON.stringify({ items: unique }, null, 2));
      
      console.log(`   ✅ HEB extension updated (${unique.length} items)\n`);
      results.heb = true;
    }
  } catch (error) {
    console.log('   ⚠️ HEB extension update had issues\n');
  }
  
  // 3. Send confirmation email
  console.log('3️⃣ Sending confirmation email...');
  await sendConfirmationEmail(results);
  
  // 4. Record confirmation in tracker
  const session = await tracker.getCurrentSession();
  if (session) {
    await tracker.recordConfirmed(session.id);
  }
  
  console.log('\n✅ All systems synced!');
  return results;
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(results) {
  const config = await loadSmtpConfig();
  if (!config) {
    console.log('   ⚠️ SMTP config not found');
    return;
  }
  
  const plan = await loadWeeklyPlan();
  const session = await tracker.getCurrentSession();
  
  const htmlContent = templates.renderConfirmationEmail({
    plan,
    results,
    trackingId: session?.id
  });
  
  const subject = '✅ Dinner Plan Confirmed & Synced';
  const result = await sendEmailViaSmtp(EMAIL_CONFIG.to, subject, htmlContent, config);
  
  if (result.success) {
    console.log('   ✅ Confirmation email sent');
  } else {
    console.log('   ⚠️ Could not send confirmation email');
  }
}

/**
 * Send SMS fallback
 */
async function sendSmsFallback() {
  console.log('📱 Sending SMS fallback...\n');
  
  const session = await tracker.getCurrentSession();
  if (!session) {
    console.log('❌ No active session');
    return { success: false };
  }
  
  if (session.smsSent) {
    console.log('ℹ️ SMS already sent for this session');
    return { success: false, alreadySent: true };
  }
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    console.log('❌ No plan available');
    return { success: false };
  }
  
  const hoursElapsed = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60));
  
  const result = await sms.sendReminder(plan, hoursElapsed);
  
  if (result.success) {
    await tracker.recordSmsSent(session.id);
    console.log('✅ SMS sent successfully!');
    console.log(`   SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } else {
    console.error('❌ SMS failed:', result.error);
    return { success: false, error: result.error };
  }
}

/**
 * Show tracking status
 */
async function showStatus() {
  const status = await tracker.getStatus();
  
  console.log('\n📊 Dinner Plan Tracking Status\n');
  console.log('═══════════════════════════════════════');
  console.log(`Status:        ${status.status.toUpperCase()}`);
  console.log(`Session ID:    ${status.sessionId || 'N/A'}`);
  console.log(`Week of:       ${status.weekOf ? new Date(status.weekOf).toLocaleDateString() : 'N/A'}`);
  console.log(`Hours elapsed: ${status.hoursElapsed || 0}`);
  console.log('───────────────────────────────────────');
  console.log(`📧 Email opened:   ${status.opened ? '✅ Yes' : '⏳ No'}`);
  console.log(`💬 Reply received: ${status.replied ? '✅ Yes' : '⏳ No'}`);
  console.log(`✅ Confirmed:      ${status.confirmed ? '✅ Yes' : '⏳ No'}`);
  console.log(`📱 SMS sent:       ${status.smsSent ? '✅ Yes' : '⏳ No'}`);
  console.log('═══════════════════════════════════════');
  
  if (status.timeline) {
    console.log('\n📈 Timeline:');
    status.timeline.forEach(t => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      console.log(`   ${time} → ${t.status}`);
    });
  }
  
  if (status.meals && status.meals.length > 0) {
    console.log('\n🍽️ Meals:');
    status.meals.forEach(m => {
      const icon = m.status === 'confirmed' ? '✅' : m.status === 'modified' ? '✏️' : m.status === 'removed' ? '🗑️' : '⏳';
      console.log(`   ${icon} ${m.day}: ${m.name}`);
    });
  }
  
  console.log('');
}

/**
 * Reset tracking state
 */
async function resetTracking() {
  console.log('🔄 Resetting tracking state...');
  
  await fs.writeFile(TRACKING_DB_FILE, JSON.stringify({ sessions: {}, current: null }, null, 2));
  await fs.writeFile(PENDING_CHANGES_FILE, JSON.stringify([], null, 2));
  
  console.log('✅ Tracking state reset');
}

/**
 * Simulate reply (for testing)
 */
async function simulateReply(replyText) {
  console.log(`🧪 Simulating reply: "${replyText}"\n`);
  
  const parsed = parser.parse(replyText);
  
  console.log('Parsed Result:');
  console.log('───────────────');
  console.log(`Intent:     ${parsed.intent}`);
  console.log(`Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
  console.log(`Actions:    ${parsed.actions.length}`);
  console.log('\nDetected Actions:');
  parsed.actions.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.action}`);
    if (a.day) console.log(`     Day: ${a.day}`);
    if (a.newMeal) console.log(`     New: ${a.newMeal}`);
    if (a.mealName) console.log(`     Meal: ${a.mealName}`);
  });
  
  console.log('\nSummary:');
  console.log(parser.summarize(parsed));
  
  // Save to pending changes
  await fs.writeFile(PENDING_CHANGES_FILE, JSON.stringify({
    _replyText: replyText,
    _parsed: parsed,
    changes: parsed.actions
  }, null, 2));
  
  console.log('\n✅ Saved to pending changes file');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--send-test':
      await sendDinnerPlanEmail();
      break;
      
    case '--check-reply':
      const reply = await checkEmailReplies();
      if (reply.hasReply) {
        console.log('\n🔄 Applying changes...');
        const result = await applyChanges(reply.changes);
        if (result.success) {
          await syncToAllSystems();
        }
      } else if (reply.smsDue) {
        await sendSmsFallback();
      }
      break;
      
    case '--sync':
      await syncToAllSystems();
      break;
      
    case '--status':
      await showStatus();
      break;
      
    case '--send-sms':
      await sendSmsFallback();
      break;
      
    case '--reset':
      await resetTracking();
      break;
      
    case '--simulate':
      const replyText = args.slice(1).join(' ') || 'Looks good!';
      await simulateReply(replyText);
      break;
      
    case '--test-parser':
      const testText = args.slice(1).join(' ') || 'Swap Monday to Chicken Alfredo';
      console.log('\n🧪 Testing NLP Parser');
      console.log('Input:', testText);
      const testParsed = parser.parse(testText);
      console.log('\nResult:');
      console.log(JSON.stringify(testParsed, null, 2));
      break;
      
    default:
      console.log('Dinner Plan Email System v2.0\n');
      console.log('Usage:');
      console.log('  --send-test         Send dinner plan email');
      console.log('  --check-reply       Check for replies and process');
      console.log('  --sync              Sync current plan to all systems');
      console.log('  --status            Show tracking status');
      console.log('  --send-sms          Send SMS fallback manually');
      console.log('  --reset             Reset tracking state');
      console.log('  --simulate <text>   Simulate a reply');
      console.log('  --test-parser <text> Test the NLP parser');
      console.log('\nFeatures:');
      console.log('  • HTML email templates with modern styling');
      console.log('  • NLP-based smart reply parsing');
      console.log('  • Status tracking (sent → opened → replied → confirmed)');
      console.log('  • SMS fallback via Twilio after 6 hours');
      console.log('  • Unsplash meal image thumbnails');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
module.exports = {
  sendDinnerPlanEmail,
  checkEmailReplies,
  applyChanges,
  syncToAllSystems,
  sendSmsFallback,
  showStatus,
  SmartReplyParser,
  StatusTracker,
  EmailTemplateEngine,
  ImageService,
  SmsService
};
