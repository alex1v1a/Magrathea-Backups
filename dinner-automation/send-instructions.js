const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.me.com',
  port: 587,
  secure: false,
  auth: {
    user: 'MarvinMartian9@icloud.com',
    pass: 'jgdw-epfw-mspb-nihn'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const instructions = `🍽️ Dinner Plans Automation System - User Guide

Hi Alexander,

Your automated dinner planning system is now live! Here's everything you need to know:

📅 HOW IT WORKS

Every Sunday at 9:00 AM, the system will:
1. Generate a unique weekly meal plan ($200 budget, 7 different dinners)
2. Build an HEB.com shopping list with 110% ingredient buffer
3. Send you a detailed email with meals, recipes, and ingredients
4. Add the dinners to your iCloud "Dinner" calendar at 5:00 PM daily

🕐 DAILY SCHEDULE

• 1:00-9:00 PM (hourly): System checks for your email replies
• 5:00 PM: Dinner event synced to iCloud calendar
• 8:45 PM: Checks if you made the HEB purchase
• 9:00 PM: Updates spending tracker

✉️ HOW TO RESPOND

Reply to the weekly meal plan email with keywords:
• "approve", "looks good", "great" → Approves the plan
• "adjust", "change", "swap" → Requests changes
• "add [item]" → Adds items to the cart
• "remove [item]" → Removes items
• "too expensive" → Flags budget concern

🛒 APPROVAL PROCESS

The system auto-approves if:
• You purchase 80%+ of suggested items from HEB cart
• OR no reply within 3 days

📊 TRACKING

• Dashboard Food tab: View 6-month spending history
• iCloud Calendar: "Dinner" calendar shows all meals at 5:00 PM
• Email confirmations: Sent to both addresses

📋 FIRST MEAL PLAN

Your first automated meal plan arrives this Sunday at 9:00 AM CST!

Questions? Reply to any dinner plan email.

—
Marvin 🤖
Your AI Assistant`;

const mailOptions = {
  from: 'MarvinMartian9@icloud.com',
  to: 'alex@1v1a.com, sferrazzaa96@gmail.com',
  subject: '🍽️ Dinner Plans System - User Guide & Instructions',
  text: instructions
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
    process.exit(1);
  } else {
    console.log('Email sent successfully:', info.response);
    process.exit(0);
  }
});
