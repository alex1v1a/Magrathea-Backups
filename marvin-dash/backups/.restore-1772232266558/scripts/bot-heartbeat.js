#!/usr/bin/env node
/**
 * Bot Mesh Heartbeat Monitor
 * Checks SSH connectivity to all team members
 * Runs via cron every 5 minutes
 */

const { execSync } = require('child_process');

const TEAM = {
  marvin: { ip: '100.126.151.25', user: 'admin' },
  bistromath: { ip: '100.97.122.5', user: 'admin' },
  deepthought: { ip: '100.91.198.42', user: 'admin' },
  trillian: { ip: '100.122.231.21', user: 'hanka' }
};

function checkSSH(name, config) {
  try {
    execSync(
      `ssh -o ConnectTimeout=5 -o BatchMode=yes ${config.user}@${config.ip} "echo 'OK'"`,
      { stdio: 'pipe', timeout: 10000 }
    );
    return { name, status: 'ONLINE', timestamp: new Date().toISOString() };
  } catch (err) {
    return { 
      name, 
      status: 'OFFLINE', 
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

function runHeartbeat() {
  console.log(`[${new Date().toISOString()}] Starting bot mesh heartbeat...`);
  
  const results = Object.entries(TEAM).map(([name, config]) => {
    return checkSSH(name, config);
  });
  
  console.log(JSON.stringify(results, null, 2));
  
  // Alert if any bot is offline
  const offline = results.filter(r => r.status === 'OFFLINE');
  if (offline.length > 0) {
    console.error(`⚠️ ALERT: ${offline.length} bot(s) offline!`);
    offline.forEach(b => console.error(`  - ${b.name}: ${b.error}`));
  }
  
  return results;
}

// Run if called directly
if (require.main === module) {
  runHeartbeat();
}

module.exports = { runHeartbeat, checkSSH };
