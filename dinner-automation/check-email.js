const imaps = require('imap-simple');

const config = {
    imap: {
        user: 'MarvinMartian9@icloud.com',
        password: process.env.ICLOUD_APP_PASSWORD,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true,
        authTimeout: 3000
    }
};

async function getHEBVerificationCode() {
    try {
        console.log('Connecting to iCloud IMAP...');
        const connection = await imaps.connect(config);
        
        // Open INBOX
        await connection.openBox('INBOX');
        
        // Search for recent emails from HEB
        const searchCriteria = [
            'UNSEEN',
            ['FROM', 'noreply@heb.com'],
            ['SUBJECT', 'verification'],
            ['SINCE', new Date(Date.now() - 10 * 60 * 1000).toISOString().split('T')[0]] // Last 10 minutes
        ];
        
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false
        };
        
        console.log('Searching for HEB verification emails...');
        const messages = await connection.search(searchCriteria, fetchOptions);
        
        if (messages.length === 0) {
            console.log('No recent HEB verification emails found.');
            // Try broader search
            const broadSearch = [
                'UNSEEN',
                ['SINCE', new Date(Date.now() - 30 * 60 * 1000).toISOString().split('T')[0]]
            ];
            const allRecent = await connection.search(broadSearch, fetchOptions);
            console.log(`Total unread emails in last 30 min: ${allRecent.length}`);
            
            // Check subjects
            for (const msg of allRecent.slice(0, 5)) {
                const header = msg.parts.find(p => p.which === 'HEADER');
                if (header) {
                    console.log('Recent email:', header.body.subject?.[0], 'from:', header.body.from?.[0]);
                }
            }
            
            await connection.end();
            return null;
        }
        
        console.log(`Found ${messages.length} HEB verification email(s)`);
        
        // Get the most recent one
        const latest = messages[messages.length - 1];
        const textPart = latest.parts.find(p => p.which === 'TEXT');
        
        if (textPart) {
            const body = textPart.body;
            // Look for 6-digit code
            const codeMatch = body.match(/\b\d{6}\b/);
            if (codeMatch) {
                const code = codeMatch[0];
                console.log(`Found verification code: ${code}`);
                await connection.end();
                return code;
            }
        }
        
        await connection.end();
        return null;
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

getHEBVerificationCode();
