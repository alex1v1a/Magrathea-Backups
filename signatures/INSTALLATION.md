# Email Signatures for Vectarr

This folder contains email signature files for Vectarr team members.

## Signatures Included

### Alexander Sferrazza
- **Role:** Accounts Manager
- **Email:** alex@1v1a.com
- **Phone:** (808) 381-8835

### Marvin Maverick
- **Role:** AI Operations & Systems Coordinator
- **Email:** marvin@vectarr.com

## Files Included

### Alexander Sferrazza
| File | Description |
|------|-------------|
| `outlook_signature.html` | HTML signature for Microsoft Outlook (Windows/Mac) |
| `apple_mail_signature.html` | HTML signature for Apple Mail (HTML preview) |
| `alexander_sferrazza.mailsignature` | Native Apple Mail signature file (macOS) |
| `signature_plain_text.txt` | Plain text version for text-only emails |

### Marvin Maverick
| File | Description |
|------|-------------|
| `marvin_maverick_outlook.html` | HTML signature for Microsoft Outlook (Windows/Mac) |
| `marvin_maverick_apple.html` | HTML signature for Apple Mail (HTML preview) |
| `marvin_maverick.mailsignature` | Native Apple Mail signature file (macOS) |
| `marvin_maverick_plain.txt` | Plain text version for text-only emails |

### Documentation
| File | Description |
|------|-------------|
| `INSTALLATION.md` | This file |

---

## Installation Instructions

### Microsoft Outlook (Windows)

#### Method 1: Copy-Paste (Easiest)

1. Open `outlook_signature.html` in any web browser (Chrome, Edge, Firefox)
2. Press `Ctrl+A` to select all content
3. Press `Ctrl+C` to copy
4. Open Outlook
5. Go to **File** → **Options** → **Mail** → **Signatures**
6. Click **New** and name it "Alexander Sferrazza"
7. Click in the signature editor box
8. Press `Ctrl+V` to paste
9. Click **OK** to save

#### Method 2: Using HTML File (Advanced)

1. Navigate to: `C:\Users\[YourUsername]\AppData\Roaming\Microsoft\Signatures`
2. Copy the `outlook_signature.html` file to this folder
3. Rename it to `Alexander Sferrazza.htm`
4. Create a folder named `Alexander Sferrazza_files` in the same location
5. Place any images (logo) in that folder
6. Restart Outlook
7. Go to **File** → **Options** → **Mail** → **Signatures**
8. Select "Alexander Sferrazza" from the list

---

### Microsoft Outlook (Mac)

1. Open `outlook_signature.html` in Safari or Chrome
2. Press `Cmd+A` to select all
3. Press `Cmd+C` to copy
4. Open Outlook for Mac
5. Go to **Outlook** → **Preferences** → **Signatures**
7. Click the **+** button to add a new signature
8. Name it "Alexander Sferrazza"
9. Press `Cmd+V` to paste in the editor
10. Close the preferences window

---

### Apple Mail (macOS)

#### Method 1: Using the .mailsignature File (Recommended)

1. **Quit Apple Mail** completely (Cmd+Q)

2. Open Finder and navigate to:
   ```
   ~/Library/Mail/V10/MailData/Signatures/
   ```
   (Note: If you don't see the Library folder, press `Cmd+Shift+.` to show hidden files)

3. Copy `alexander_sferrazza.mailsignature` to this folder

4. Open Terminal and run:
   ```bash
   cd ~/Library/Mail/V10/MailData/Signatures/
   ls -la
   ```
   Note the filename of your new signature (e.g., `alexander_sferrazza.mailsignature`)

5. Open the file `AllSignatures.plist` in a text editor and add an entry for your new signature (this is optional - Mail will detect it)

6. **Important:** Lock the signature file to prevent Mail from overwriting it:
   ```bash
   cd ~/Library/Mail/V10/MailData/Signatures/
   chflags uchg alexander_sferrazza.mailsignature
   ```

7. Open Apple Mail
8. Go to **Mail** → **Preferences** → **Signatures**
9. Select the "Alexander Sferrazza" signature
10. Assign it to your email account

#### Method 2: Copy-Paste (Alternative)

1. Open `apple_mail_signature.html` in Safari
2. Press `Cmd+A` to select all
3. Press `Cmd+C` to copy
4. Open Apple Mail
5. Go to **Mail** → **Preferences** → **Signatures**
7. Click the **+** button
8. Name it "Alexander Sferrazza"
9. Uncheck "Always match my default message font"
10. Press `Cmd+V` to paste
11. Close preferences

---

### Apple Mail (iOS/iPhone/iPad)

**Note:** iOS doesn't support rich HTML signatures directly, but you can sync from Mac:

#### Method 1: Sync from Mac (Recommended)

1. Set up the signature on your Mac using the instructions above
2. Go to **System Preferences** → **Apple ID** → **iCloud**
3. Make sure **Mail** is enabled
4. The signature will sync to your iOS devices automatically

#### Method 2: Manual Setup on iOS

1. On your iPhone/iPad, compose a new email to yourself
2. On a computer, copy the signature content
3. Email it to yourself
4. Open the email on your iOS device
5. Copy the signature
6. Go to **Settings** → **Mail** → **Signature**
7. Paste the signature
8. Shake the device and tap **Undo** if formatting is lost (this sometimes preserves formatting)

---

## Marvin Maverick - Installation

Marvin Maverick's signature follows the same installation process as Alexander's, using these files:

- **Outlook:** `marvin_maverick_outlook.html`
- **Apple Mail:** `marvin_maverick.mailsignature` or `marvin_maverick_apple.html`
- **Plain Text:** `marvin_maverick_plain.txt`

### Setup Notes for Marvin's Signature

1. **Email Address:** marvin@vectarr.com (configure once domain is active)
2. **Title:** AI Operations & Systems Coordinator
3. **Same Address:** 5900 Balcones Drive, Suite 100, Austin, TX 78731

Follow the same installation steps outlined above for your email client of choice.

---

## Customization Notes

### Logo/Image

The signature references a logo image. For the signature to display properly:

- **Option 1:** Host the logo online and use a full URL (e.g., `https://vectarr.com/logo.png`)
- **Option 2:** Attach the image separately to emails
- **Option 3:** Use a base64-encoded image (included in the HTML)

To embed the logo directly, replace:
```html
<img src="vectarr-logo.png" ...
```

With a base64-encoded version or hosted URL.

### Colors

The signature uses these colors:
- **Black:** `#000000` (name, phone)
- **Gray:** `#666666` (title)
- **Blue:** `#0078D4` (Outlook) / `#007AFF` (Apple) - phone label
- **Light Gray:** `#cccccc` (divider line)

### Mobile Optimization

All signatures are mobile-responsive and will adapt to smaller screens on iPhone, iPad, and Android devices.

---

## Troubleshooting

### Images Not Showing

**Outlook:**
- Images may be blocked by default. Recipients need to click "Download pictures"
- To embed images: Use Insert → Picture in the signature editor instead of copy-paste

**Apple Mail:**
- Make sure images aren't being blocked in **Mail** → **Preferences** → **Viewing**

### Formatting Looks Wrong

- **Outlook:** Use the "HTML" version, not the plain text version
- **Apple Mail:** Uncheck "Always match my default message font" in signature preferences

### Signature Not Appearing

- Check that the signature is assigned to the correct email account
- In Outlook: Check **File** → **Options** → **Mail** → **Signatures** → Choose default signature
- In Apple Mail: Check **Preferences** → **Signatures** → Choose signature per account

---

## Contact

For questions about these signatures, contact:
- **Email:** alex@1v1a.com
- **Phone:** (808) 381-8835
