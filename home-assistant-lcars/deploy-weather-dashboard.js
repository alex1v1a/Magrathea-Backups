#!/usr/bin/env node
/**
 * Weather Command Dashboard Deployer
 * Installs the Starfleet Weather Command LCARS dashboard
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_SOURCE = path.join(__dirname, 'weather-command-dashboard.json');
const README_SOURCE = path.join(__dirname, 'weather-dashboard-readme.md');

async function deploy() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  STARFLEET WEATHER COMMAND DASHBOARD DEPLOYER             ║');
  console.log('║  LCARS Meteorological Station Configuration               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check if config exists
  try {
    await fs.access(CONFIG_SOURCE);
  } catch {
    console.error('❌ Dashboard config not found:', CONFIG_SOURCE);
    process.exit(1);
  }

  console.log('📋 Dashboard files found:\n');
  console.log('  ✅ weather-command-dashboard.json');
  console.log('  ✅ weather-dashboard-readme.md\n');

  console.log('════════════════════════════════════════════════════════════\n');
  console.log('📖 INSTALLATION INSTRUCTIONS:\n');
  
  console.log('1. PREREQUISITES (Install via HACS):');
  console.log('   • card-mod (CSS injection)');
  console.log('   • cb-lcards (LCARS card framework)');
  console.log('   • Add Antonio font resource:\n');
  console.log('     https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap\n');

  console.log('2. DASHBOARD SETUP:');
  console.log('   • Copy weather-command-dashboard.json to your HA config');
  console.log('   • Or import via Settings → Dashboards → Add Dashboard → Raw Config\n');

  console.log('3. ENTITY CONFIGURATION:');
  console.log('   Edit the dashboard JSON and update these entity IDs:\n');
  console.log('   Required:');
  console.log('   • weather.home (your weather entity)\n');
  console.log('   Sensors (update to match your entities):');
  console.log('   • sensor.outdoor_temperature');
  console.log('   • sensor.outdoor_humidity');
  console.log('   • sensor.barometric_pressure');
  console.log('   • sensor.wind_speed');
  console.log('   • sensor.uv_index');
  console.log('   • sensor.air_quality_index\n');
  console.log('   Climate:');
  console.log('   • climate.living_room');
  console.log('   • climate.bedroom\n');

  console.log('4. THEME SETUP:');
  console.log('   • Apply cb-lcars or LCARS theme in your profile\n');

  console.log('════════════════════════════════════════════════════════════\n');
  console.log('📊 DASHBOARD FEATURES:\n');
  console.log('  🌤️  Weather Operations View');
  console.log('     • Current conditions with LCARS styling');
  console.log('     • 6 environmental sensors (temp, humidity, pressure, etc.)');
  console.log('     • 7-day forecast');
  console.log('     • Climate control thermostats');
  console.log('     • Weather alert status\n');
  console.log('  🏠 Indoor Climate View');
  console.log('     • Room temperature gauges');
  console.log('     • Indoor air quality monitoring');
  console.log('     • Humidity controls\n');

  console.log('════════════════════════════════════════════════════════════\n');
  console.log('🎨 DESIGN HIGHLIGHTS:\n');
  console.log('  • Picard-era LCARS aesthetic (modern Star Trek)');
  console.log('  • Orange/Blue color scheme');
  console.log('  • Deep space black backgrounds');
  console.log('  • Antonio font (authentic Star Trek typography)');
  console.log('  • Rounded pill buttons and elbow connectors');
  console.log('  • Grouped by function: Weather / Sensors / Climate / Forecast\n');

  console.log('════════════════════════════════════════════════════════════\n');
  console.log('📁 Files ready for deployment:\n');
  console.log(`  Source: ${CONFIG_SOURCE}`);
  console.log(`  Guide:  ${README_SOURCE}\n`);

  console.log('Next steps:');
  console.log('  1. Install prerequisites (card-mod, cb-lcars) via HACS');
  console.log('  2. Add Antonio font to dashboard resources');
  console.log('  3. Copy dashboard JSON to Home Assistant');
  console.log('  4. Update entity IDs to match your setup');
  console.log('  5. Apply LCARS theme\n');

  console.log('Live long and prosper! 🖖\n');
}

deploy().catch(console.error);
