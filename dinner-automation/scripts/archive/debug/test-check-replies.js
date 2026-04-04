const { DinnerEmailClient } = require('./email-client');
const client = new DinnerEmailClient();

async function check() {
  try {
    await client.initIMAP();
    const replies = await client.checkForReplies(24); // Check last 24 hours
    console.log('Found', replies.length, 'replies');
    
    for (const reply of replies) {
      console.log('Reply from:', reply.from);
      console.log('Subject:', reply.subject);
      console.log('Body preview:', reply.body.substring(0, 500));
      console.log('---');
    }
    
    await client.closeIMAP();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
