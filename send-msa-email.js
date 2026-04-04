const nodemailer = require('nodemailer');
const fs = require('fs');

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
  family: 4
});

const mailOptions = {
  from: config.email,
  to: 'alex@1v1a.com',
  subject: 'Vectarr Complete Master Service Agreement - Ready for Web',
  html: `<h2>Vectarr Master Service Agreement - Complete</h2>
<p>Attached is the <strong>complete, finalized</strong> Master Service Agreement for Vectarr LLC. This document is ready for immediate upload to your website and use with customers.</p>

<h3>Document Includes:</h3>
<ul>
<li><strong>11 Core Legal Sections</strong> - Fully written with professional legal language</li>
<li><strong>Penalty Clauses</strong> - Late fees (1.5%/month), collection costs, liquidated damages</li>
<li><strong>Liability Cap</strong> - $1,000 or 12-month fees, whichever is greater</li>
<li><strong>Vectarr-Specific Terms</strong> - Machine shop marketplace, RFQ/Quote process, payment flow</li>
<li><strong>IP Protections</strong> - Platform ownership, user content licensing, infringement handling</li>
<li><strong>Confidentiality</strong> - 5-year post-termination survival, breach notification</li>
<li><strong>Indemnification</strong> - Mutual indemnity with procedure requirements</li>
<li><strong>Dispute Resolution</strong> - Texas law, Travis County jurisdiction, mediation requirement</li>
<li><strong>3 Schedules</strong> - SLA (99.5% uptime), Fee Schedule, Data Processing Addendum</li>
<li><strong>Signature Blocks</strong> - Ready for execution with both parties</li>
</ul>

<h3>Key Protections Included:</h3>
<ul>
<li>Platform intermediary disclaimer (not liable for Machine Shop performance)</li>
<li>No warranty for manufacturing quality or delivery</li>
<li>Force majeure exclusion</li>
<li>Class action waiver</li>
<li>Prevailing party attorneys' fees</li>
<li>30-day cure period for material breach</li>
<li>Account suspension for non-payment</li>
</ul>

<p><strong>Ready for:</strong> Direct website upload, attorney review (if desired), customer execution</p>
<p><strong>Format:</strong> DOCX, 12 pages, professional legal typography (Calibri 11pt), clean formatting</p>`,
  attachments: [
    {
      filename: 'Vectarr_MSA_Complete.docx',
      path: 'Vectarr_MSA_Complete.docx'
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
