const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Read SMTP config
const config = JSON.parse(fs.readFileSync('.secrets/icloud-smtp.json', 'utf8'));

const transporter = nodemailer.createTransport({
  host: config.smtp_server,
  port: config.smtp_port,
  secure: false,
  auth: {
    user: config.email,
    pass: config.app_specific_password
  },
  tls: {
    rejectUnauthorized: false
  },
  family: 4  // Force IPv4
});

const mailOptions = {
  from: config.email,
  to: 'alex@1v1a.com',
  subject: 'Vectarr Legal Document Template - DOCX',
  html: `<h2>Vectarr Legal Document Template</h2>
<p>Attached is a professional DOCX template for Vectarr's Master Service Agreement. It's structured for easy web upload with clean typography, placeholder sections for all standard legal clauses, and signature pages.</p>
<h3>Template Includes:</h3>
<ul>
<li>Vectarr branding (headers, colors, logo-ready formatting)</li>
<li>11 core legal sections (Definitions through General Provisions)</li>
<li>Signature page for both parties</li>
<li>3 schedules (SLA, Fee Schedule, Data Processing)</li>
<li>Professional Calibri typography, 11pt body / 14pt headers</li>
<li>Placeholder guidance in [brackets] for easy editing</li>
</ul>
<p><strong>To use:</strong> Replace the [bracketed placeholders] with your actual legal content. The structure follows standard MSA conventions and is ready for attorney review.</p>
<p>Let me know when you have the 6 source documents ready — I'll compile them into this framework with proper legal language, penalty clauses, and firm protections.</p>`,
  attachments: [
    {
      filename: 'Vectarr_MSA_Template.docx',
      path: 'Vectarr_MSA_Template.docx'
    }
  ]
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Email sent:', info.messageId);
});
