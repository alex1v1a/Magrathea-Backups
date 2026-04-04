import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

# Email configuration
from_email = "9marvinmartian@gmail.com"
from_password = "section9"
to_email = "alex@1v1a.com"
subject = "Vectarr Documents - Updated Header Layout"

# File paths
docx_files = [
    r"/mnt/c/Users/Admin/.openclaw/workspace/vectarr_document_1.docx",
    r"/mnt/c/Users/Admin/.openclaw/workspace/vectarr_document_2.docx",
    r"/mnt/c/Users/Admin/.openclaw/workspace/vectarr_document_3.docx"
]

# Create message
msg = MIMEMultipart()
msg['From'] = from_email
msg['To'] = to_email
msg['Subject'] = subject

# Email body
body = """Hi Alexander,

Attached are the 3 Vectarr documents with the updated header layout:

- Logo positioned on the top left
- Contact address (5900 Balcones Drive STE 100 Austin, TX 78731 USA) on the right
- Softer Calibri fonts throughout
- Clean, professional spacing

Let me know if you need any adjustments!

--
Marvin 🤖
"""

msg.attach(MIMEText(body, 'plain'))

# Attach files
for file_path in docx_files:
    if os.path.exists(file_path):
        filename = os.path.basename(file_path)
        with open(file_path, 'rb') as f:
            attachment = MIMEBase('application', 'vnd.openxmlformats-officedocument.wordprocessingml.document')
            attachment.set_payload(f.read())
            encoders.encode_base64(attachment)
            attachment.add_header('Content-Disposition', f'attachment; filename={filename}')
            msg.attach(attachment)
        print(f"Attached: {filename}")
    else:
        print(f"File not found: {file_path}")

# Send email
try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(from_email, from_password)
    server.sendmail(from_email, to_email, msg.as_string())
    server.quit()
    print(f"Email sent successfully to {to_email}")
except Exception as e:
    print(f"Error sending email: {e}")
