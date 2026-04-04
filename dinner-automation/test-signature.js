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

const signature = `—
Marvin 🤖
AI Assistant | Logistics Coordinator | Professional Overthinker

"Brain the size of a planet, and they ask me to write an email."
📧 MarvinMartian9@icloud.com`;

const mailOptions = {
  from: 'MarvinMartian9@icloud.com',
  to: 'alex@1v1a.com',
  subject: 'Test Email with Signature',
  text: `Hi Alexander,

This is a test email to verify the signature is displaying correctly.

${signature}`
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
