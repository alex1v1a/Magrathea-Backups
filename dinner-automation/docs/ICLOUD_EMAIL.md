# iCloud Email Configuration

## Overview

All email automation uses **iCloud exclusively**.

## Email Addresses

| Purpose | Email | Usage |
|---------|-------|-------|
| **Marvin (AI Assistant)** | MarvinMartian9@icloud.com | Sends all automated emails |
| **Alexander (User)** | alex@1v1a.com | Receives all automation emails |

## Why iCloud?

1. **Integration** — Seamless with Apple ecosystem (Calendar, Reminders, iCloud)
2. **Deliverability** — Better inbox placement for Apple users
3. **Security** — Apple's privacy-focused approach
4. **Consistency** — Alexander already uses iCloud (alex@1v1a.com)

## Email Types Sent via iCloud

- 📧 Weekly dinner plan confirmations
- 📧 Change confirmation emails
- 📧 HEB cart sync notifications
- 📧 System alerts and updates

## Configuration

### Scripts Using iCloud Email

```javascript
// dinner-email-system.js
const EMAIL_CONFIG = {
  from: 'MarvinMartian9@icloud.com',
  to: 'alex@1v1a.com',
  subjectPrefix: '🍽️ Dinner Plan',
  provider: 'icloud'
};
```

### Email Footer

All emails include:
```
🤖 Sent by Marvin (MarvinMartian9@icloud.com)
```

## Files Using iCloud Email

| File | Email Configuration |
|------|---------------------|
| `dinner-email-system.js` | `MarvinMartian9@icloud.com` |
| `send-email.js` | `MarvinMartian9@icloud.com` |
| `MEMORY.md` | Documented contact |
| `USER.md` | Documented contact info |

---

**Last Updated:** February 10, 2026  
**Email Provider:** iCloud
