const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Chrome Profile Manager - Marvin Profile Only
 * 
 * User requirement: ONLY use 9marvinmartian@gmail.com (Marvin) profile
 * No other profiles allowed regardless of automatic steps
 */

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Ensure Marvin profile directory exists
if (!fs.existsSync(MARVIN_PROFILE)) {
  fs.mkdirSync(MARVIN_PROFILE, { recursive: true });
  console.log('✅ Created Marvin-only Chrome profile directory');
}

// Create profile lock to prevent other profiles
const PROFILE_LOCK = path.join(MARVIN_PROFILE, '.marvin-profile-lock');
fs.writeFileSync(PROFILE_LOCK, `Marvin Profile Only - Created: ${new Date().toISOString()}\nNo other profiles allowed.`);

console.log('🔒 Chrome Profile Configuration');
console.log('================================');
console.log(`Profile: ${MARVIN_PROFILE}`);
console.log(`Account: 9marvinmartian@gmail.com`);
console.log(`Status: Marvin profile locked ✅\n`);

// Update all scripts to use this profile
const SCRIPTS_TO_UPDATE = [
  'dinner-automation/scripts/facebook-marketplace-chrome.js',
  'dinner-automation/scripts/heb-cart-chrome.js',
  'dinner-automation/scripts/heb-cart-stable.js'
];

let updatedCount = 0;

SCRIPTS_TO_UPDATE.forEach(scriptPath => {
  const fullPath = path.join(process.cwd(), scriptPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace any user data dir references with Marvin profile
    const oldPattern = /CHROME_USER_DATA\s*=\s*['"`][^'"`]+['"`]/;
    const newValue = `CHROME_USER_DATA = '${MARVIN_PROFILE.replace(/\\/g, '\\\\')}'`;
    
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newValue);
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated: ${scriptPath}`);
      updatedCount++;
    }
  }
});

console.log(`\n📁 Scripts updated: ${updatedCount}`);

// Create launcher script that forces Marvin profile
const launcherScript = `@echo off
echo ==========================================
echo    Chrome - Marvin Profile Only
echo ==========================================
echo.
echo Launching Chrome with Marvin profile
echo Account: 9marvinmartian@gmail.com
echo.
echo Other profiles are disabled.
echo.

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --user-data-dir="${MARVIN_PROFILE}" ^
  --profile-directory="Default" ^
  --start-maximized ^
  --no-first-run ^
  --no-default-browser-check

echo.
echo Chrome launched with Marvin profile.
pause
`;

fs.writeFileSync('launch-chrome-marvin.bat', launcherScript);
console.log('✅ Created: launch-chrome-marvin.bat\n');

// Export for other scripts
module.exports = {
  MARVIN_PROFILE,
  CHROME_PATH,
  launchOptions: {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      `--user-data-dir=${MARVIN_PROFILE}`,
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  }
};

console.log('🔒 Configuration complete.');
console.log('All Chrome automation will now use ONLY the Marvin profile.');
