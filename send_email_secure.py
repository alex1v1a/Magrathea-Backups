#!/usr/bin/env python3
"""
Send Email via Apple iCloud (Secure Version)
Uses environment variables for credentials
"""

import smtplib
import os
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment
FROM_EMAIL = os.getenv('ICLOUD_EMAIL', 'MarvinMartian9@icloud.com')
FROM_PASSWORD = os.getenv('ICLOUD_APP_PASSWORD')
SMTP_HOST = 'smtp.mail.me.com'
SMTP_PORT = 587

DEFAULT_TO = 'alex@1v1a.com'
DEFAULT_SUBJECT = 'Message from Marvin'


def check_credentials():
    """Verify credentials are available"""
    if not FROM_PASSWORD:
        print("❌ Error: ICLOUD_APP_PASSWORD environment variable not set")
        print("   Set it in your .env file or environment")
        return False
    return True


def create_message(to_email, subject, body, html_body=None):
    """Create email message"""
    msg = MIMEMultipart()
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject
    
    # Attach body
    if html_body:
        msg.attach(MIMEText(body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
    else:
        msg.attach(MIMEText(body, 'plain'))
    
    return msg


def attach_file(msg, file_path):
    """Attach a file to the message"""
    if not os.path.exists(file_path):
        print(f"⚠️  File not found: {file_path}")
        return False
    
    filename = os.path.basename(file_path)
    
    # Detect content type
    if file_path.endswith('.docx'):
        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    elif file_path.endswith('.pdf'):
        content_type = 'application/pdf'
    elif file_path.endswith('.png'):
        content_type = 'image/png'
    elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
        content_type = 'image/jpeg'
    else:
        content_type = 'application/octet-stream'
    
    with open(file_path, 'rb') as f:
        attachment = MIMEBase(*content_type.split('/'))
        attachment.set_payload(f.read())
        encoders.encode_base64(attachment)
        attachment.add_header('Content-Disposition', f'attachment; filename={filename}')
        msg.attach(attachment)
    
    print(f"📎 Attached: {filename}")
    return True


def send_email(to_email, subject, body, attachments=None, html_body=None):
    """
    Send email via Apple iCloud SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        attachments: List of file paths to attach
        html_body: Optional HTML body
    
    Returns:
        bool: True if sent successfully
    """
    if not check_credentials():
        return False
    
    # Create message
    msg = create_message(to_email, subject, body, html_body)
    
    # Attach files
    if attachments:
        if isinstance(attachments, str):
            attachments = [attachments]
        for file_path in attachments:
            attach_file(msg, file_path)
    
    # Send via SMTP
    try:
        print(f"📤 Connecting to {SMTP_HOST}...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(FROM_EMAIL, FROM_PASSWORD)
        
        print(f"📧 Sending to {to_email}...")
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        
        print(f"✅ Email sent successfully!")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed. Check your ICLOUD_APP_PASSWORD.")
        return False
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return False


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Send email via Apple iCloud')
    parser.add_argument('--to', default=DEFAULT_TO, help='Recipient email')
    parser.add_argument('--subject', default=DEFAULT_SUBJECT, help='Email subject')
    parser.add_argument('--body', help='Email body (or read from stdin)')
    parser.add_argument('--file', '-f', action='append', help='Files to attach')
    parser.add_argument('--check', action='store_true', help='Check credentials only')
    
    args = parser.parse_args()
    
    if args.check:
        if check_credentials():
            print("✅ Credentials configured correctly")
            print(f"   From: {FROM_EMAIL}")
            sys.exit(0)
        else:
            sys.exit(1)
    
    # Read body from stdin if not provided
    body = args.body
    if not body:
        print("Enter email body (Ctrl+D to finish):")
        body = sys.stdin.read()
    
    success = send_email(args.to, args.subject, body, args.file)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
