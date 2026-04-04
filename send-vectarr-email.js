const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendEmail() {
    const smtpConfig = JSON.parse(fs.readFileSync('.secrets/icloud-smtp.json', 'utf8'));
    
    const transporter = nodemailer.createTransport({
        host: smtpConfig.smtp_server,
        port: smtpConfig.smtp_port,
        secure: false,
        requireTLS: true,
        auth: {
            user: smtpConfig.email,
            pass: smtpConfig.app_specific_password
        }
    });
    
    const pdfPath = 'vectarr-master-contractor-agreement.pdf';
    const htmlPath = 'vectarr-master-contractor-agreement.html';
    
    const emailBody = `
<h2>Vectarr Master Contractor & Subcontractor Agreement</h2>
<p>Alexander,</p>
<p>I've compiled, restructured, and legalized the Vectarr documents into a single professional legal framework.</p>
<h3>What I Consolidated:</h3>
<ul>
    <li>✅ Short-Form Freelancer NDA</li>
    <li>✅ Back-to-Back Subcontractor NDA</li>
    <li>✅ Master Subcontractor Agreement</li>
    <li>✅ Authorization Letter (Marc Alexander Sferrazza)</li>
</ul>
<h3>Key Enhancements:</h3>
<ul>
    <li><strong>Firm Legal Language:</strong> No draft markers, final-copy quality</li>
    <li><strong>Penalty Clauses:</strong> Liquidated damages ($50K-$100K per violation)</li>
    <li><strong>Export Control Emphasis:</strong> ITAR/EAR compliance with clear consequences</li>
    <li><strong>Document Selector:</strong> Clear guidance on which agreement applies</li>
    <li><strong>Quick Reference Tables:</strong> Penalty schedule and contractor classifications</li>
    <li><strong>Vectarr Branding:</strong> Professional header, typography, and formatting</li>
</ul>
<p><strong>Note:</strong> You mentioned 6 documents but I found 4 in the workspace. Let me know if there are additional files to include.</p>
<p>Both PDF (print-ready) and HTML (editable) versions are attached.</p>
<p>— Marvin</p>
<hr>
<p style="font-size: 9pt; color: #666;">Vectarr LLC Legal Documentation | Document Version 2.0 — February 2026</p>
`;
    
    const info = await transporter.sendMail({
        from: '"Marvin (Vectarr Legal)" <MarvinMartian9@icloud.com>',
        to: 'alex@1v1a.com',
        subject: 'Vectarr LLC — Master Contractor Agreement Framework (Consolidated)',
        html: emailBody,
        attachments: [
            {
                filename: 'Vectarr-Master-Contractor-Agreement.pdf',
                path: pdfPath
            },
            {
                filename: 'Vectarr-Master-Contractor-Agreement.html',
                path: htmlPath
            }
        ]
    });
    
    console.log('Email sent:', info.messageId);
    console.log('Attachments: PDF (630 KB), HTML (49 KB)');
}

sendEmail().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
