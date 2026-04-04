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
  subject: 'Vectarr Master Contractor Agreement - Complete (Machine Shop Partner Contract)',
  html: `<h2>Vectarr Master Contractor Agreement - Complete</h2>
<p>Attached is the <strong>complete, finalized</strong> Master Contractor Agreement for Vectarr's machine shop partners. This document governs the relationship between Vectarr and manufacturing contractors (machine shops) on the platform.</p>

<h3>Document Overview:</h3>
<p>This is the <strong>Contractor-side agreement</strong> (complementing the Customer-side MSA). It establishes terms for machine shops providing manufacturing services through the Vectarr platform.</p>

<h3>11 Core Sections Included:</h3><ul>
<li><strong>1. Definitions</strong> - Customer, Deliverables, Work Order, Specifications, Quality Standards</li>
<li><strong>2. Engagement & Services</strong> - Independent contractor status, non-exclusivity, subcontracting restrictions</li>
<li><strong>3. RFQ/Quote Process</strong> - Quote requirements, binding quotes, change orders, withdrawal rights</li>
<li><strong>4. Performance Obligations</strong> - Delivery timelines, shipping, inspection, non-conformance correction</li>
<li><strong>5. Pricing & Payment</strong> - 15-day payment terms, 1.5% late fee, setoff rights</li>
<li><strong>6. Warranties</strong> - 12-month quality warranty, material/workmanship guarantees</li>
<li><strong>7. Intellectual Property</strong> - Customer IP protection, custom tooling ownership, infringement indemnity</li>
<li><strong>8. Confidentiality</strong> - 5-year post-termination survival, strict confidentiality obligations</li>
<li><strong>9. Term & Termination</strong> - 1-year auto-renewal, 90-day convenience termination, 30-day cure period</li>
<li><strong>10. Indemnification & Liability</strong> - Contractor defends Vectarr, insurance requirements ($1M GL, $1M products), liability cap</li>
<li><strong>11. General Provisions</strong> - Texas law, Travis County courts, prevailing party attorneys' fees</li>
</ul>

<h3>4 Schedules Included:</h3><ul>
<li><strong>Schedule A (Quality Standards)</strong> - +/- 0.005" default tolerance, &2% non-conformance limit, corrective action requirements</li>
<li><strong>Schedule B (Fee Schedule)</strong> - 7.5% standard commission, 5% preferred partner rate, volume discounts</li>
<li><strong>Schedule C (Capabilities)</strong> - CNC machining, sheet metal, additive manufacturing, molding, casting, finishing</li>
<li><strong>Schedule D (Performance Metrics)</strong> - 95% on-time delivery target, 98% quality acceptance, &4.0/5.0 customer rating</li>
</ul>

<h3>Key Contractor Obligations:</h3><ul>
<li>Maintain $1M general liability + $1M products liability insurance</li>
<li>48-hour RFQ response requirement</li>
<li>Quotes are binding once accepted by Customer</li>
<li>No subcontracting without written consent</li>
<li>Repair/replace non-conforming parts at Contractor's expense</li>
<li>Indemnify Vectarr for IP infringement by Deliverables</li>
</ul>

<p><strong>Ready for:</strong> Onboarding machine shops, website upload, attorney review, immediate execution</p>
<p><strong>Format:</strong> DOCX, 14 pages, professional legal typography, signature blocks for both parties</p>
<p><strong>Note:</strong> This is the B2B contractor agreement. For the Customer-facing Terms of Service, see the previously sent MSA.</p>`,
  attachments: [
    {
      filename: 'Vectarr_Master_Contractor_Agreement.docx',
      path: 'Vectarr_Master_Contractor_Agreement.docx'
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
