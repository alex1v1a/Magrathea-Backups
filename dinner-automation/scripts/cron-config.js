/**
 * Cron Job Configuration for Dinner Plans Automation
 * 
 * Install on Windows using Task Scheduler or WSL cron
 * 
 * WSL CRON SETUP:
 * 1. Open WSL: wsl
 * 2. Edit crontab: crontab -e
 * 3. Add lines below
 * 4. Ensure Node.js is available in WSL
 * 
 * WINDOWS TASK SCHEDULER:
 * 1. Open Task Scheduler
 * 2. Create Basic Task
 * 3. Trigger: Weekly, Sunday at 9:00 AM
 * 4. Action: Start Program
 * 5. Program: node
 * 6. Arguments: "C:\Users\Admin\.openclaw\workspace\dinner-automation\scripts\dinner-automation.js"
 */

// WSL/Unix Cron Format:
const CRON_SCHEDULES = {
  // Main automation: Every Sunday at 9:00 AM CST
  mainAutomation: {
    cron: '0 9 * * 0',
    command: 'cd /mnt/c/Users/Admin/.openclaw/workspace && /usr/bin/node dinner-automation/scripts/dinner-automation.js >> dinner-automation/logs/cron.log 2>&1',
    description: 'Generate weekly meal plan and setup monitoring'
  },
  
  // Email reply monitoring: Every hour from 1pm-9pm
  emailReplyCheck: {
    cron: '0 13-21 * * *',
    command: 'cd /mnt/c/Users/Admin/.openclaw/workspace && /usr/bin/node dinner-automation/scripts/monitor-email.js >> dinner-automation/logs/monitor.log 2>&1',
    description: 'Check for email replies to dinner plan'
  },
  
  // Purchase confirmation check: Daily at 8:45pm
  purchaseConfirmCheck: {
    cron: '45 20 * * *',
    command: 'cd /mnt/c/Users/Admin/.openclaw/workspace && /usr/bin/node dinner-automation/scripts/monitor-purchase.js >> dinner-automation/logs/monitor.log 2>&1',
    description: 'Check for HEB purchase confirmation'
  },
  
  // HEB cart monitoring: Daily at 9:00pm
  hebCartCheck: {
    cron: '0 21 * * *',
    command: 'cd /mnt/c/Users/Admin/.openclaw/workspace && /usr/bin/node dinner-automation/scripts/monitor-cart.js >> dinner-automation/logs/monitor.log 2>&1',
    description: 'Verify HEB cart status'
  },
  
  // Calendar update: Daily at 5:00pm
  calendarUpdate: {
    cron: '0 17 * * *',
    command: 'cd /mnt/c/Users/Admin/.openclaw/workspace && /usr/bin/node dinner-automation/scripts/update-calendar.js >> dinner-automation/logs/calendar.log 2>&1',
    description: 'Update iCloud Dinner calendar'
  }
};

// Windows Task Scheduler XML Template
const WINDOWS_TASK_XML = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>${new Date().toISOString()}</Date>
    <Author>Marvin</Author>
    <Description>Dinner Plans Weekly Automation - Generate meal plan every Sunday at 9:00 AM CST</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>${new Date().toISOString().split('T')[0]}T09:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByWeek>
        <DaysOfWeek>
          <Sunday />
        </DaysOfWeek>
        <WeeksInterval>1</WeeksInterval>
      </ScheduleByWeek>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>C:\\Program Files\\nodejs\\node.exe</Command>
      <Arguments>"C:\\Users\\Admin\\.openclaw\\workspace\\dinner-automation\\scripts\\dinner-automation.js"</Arguments>
      <WorkingDirectory>C:\\Users\\Admin\\.openclaw\\workspace</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;

module.exports = { CRON_SCHEDULES, WINDOWS_TASK_XML };

// Print crontab entries if run directly
if (require.main === module) {
  console.log('=== WSL/Ubuntu Crontab Entries ===\n');
  Object.entries(CRON_SCHEDULES).forEach(([name, config]) => {
    console.log(`# ${config.description}`);
    console.log(`${config.cron} ${config.command}`);
    console.log();
  });
  
  console.log('\n=== Windows Task Scheduler Setup ===\n');
  console.log('1. Open Task Scheduler (taskschd.msc)');
  console.log('2. Action → Create Task');
  console.log('3. General Tab:');
  console.log('   - Name: Dinner Plans Weekly Automation');
  console.log('   - Run whether user is logged on or not: [CHECKED]');
  console.log('4. Triggers Tab → New:');
  console.log('   - Begin the task: On a schedule');
  console.log('   - Settings: Weekly');
  console.log('   - Recur every: 1 weeks');
  console.log('   - On: Sunday');
  console.log('   - Start at: 9:00:00 AM');
  console.log('5. Actions Tab → New:');
  console.log('   - Action: Start a program');
  console.log('   - Program/script: node');
  console.log('   - Arguments: dinner-automation/scripts/dinner-automation.js');
  console.log('   - Start in: C:\\Users\\Admin\\.openclaw\\workspace');
}
