// Save this as export-heb-cookies.js and run in Edge console (F12)
// 1. Go to heb.com and login
// 2. Press F12, go to Console tab
// 3. Paste this code and press Enter
// 4. Copy the output and save as heb-cookies.json

(function() {
  const cookies = document.cookie.split(';').map(c => {
    const [name, value] = c.trim().split('=');
    return { name, value, domain: '.heb.com', path: '/' };
  });
  
  const storage = {
    cookies: cookies,
    origins: [{
      origin: 'https://www.heb.com',
      localStorage: Object.entries(localStorage).map(([k,v]) => ({name: k, value: v}))
    }]
  };
  
  console.log('=== COPY EVERYTHING BELOW THIS LINE ===');
  console.log(JSON.stringify(storage, null, 2));
  console.log('=== COPY EVERYTHING ABOVE THIS LINE ===');
  console.log('Now save this to: C:\\Users\\Admin\\Downloads\\heb-cookies.json');
})();
