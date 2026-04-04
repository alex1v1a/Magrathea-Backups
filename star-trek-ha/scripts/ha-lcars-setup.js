#!/usr/bin/env node
/**
 * Star Trek LCARS Home Assistant Setup Helper
 * 
 * This script helps you implement the LCARS theme in your Home Assistant instance
 * 
 * Usage:
 *   node ha-lcars-setup.js --check      # Check prerequisites
 *   node ha-lcars-setup.js --install    # Generate installation commands
 *   node ha-lcars-setup.js --entities   # Create helper entities YAML
 */

const fs = require('fs').promises;
const path = require('path');

const COLORS = {
  orange: '#FF9900',
  peach: '#FFAA90',
  purple: '#CC99FF',
  blue: '#8899FF',
  red: '#CC4444',
  black: '#000000',
  white: '#F5F6FA'
};

async function checkPrerequisites() {
  console.log('\n🖖 Star Trek LCARS Home Assistant Setup Checker\n');
  console.log('==============================================\n');
  
  console.log('📋 Prerequisites Checklist:\n');
  
  const checks = [
    {
      name: 'Home Assistant Instance',
      description: 'HA running and accessible',
      url: 'http://homeassistant.local:8123 or http://10.0.1.90:8123',
      required: true
    },
    {
      name: 'HACS (Home Assistant Community Store)',
      description: 'Required for card-mod and themes',
      install: 'https://hacs.xyz/docs/setup/download',
      required: true
    },
    {
      name: 'card-mod (via HACS)',
      description: 'Essential for LCARS styling',
      hacs: 'frontend',
      required: true
    },
    {
      name: 'Themes Folder',
      description: 'config/themes/ directory',
      path: 'config/themes/',
      required: true
    },
    {
      name: 'www Folder',
      description: 'config/www/ for custom resources',
      path: 'config/www/',
      required: true
    }
  ];
  
  checks.forEach((check, i) => {
    console.log(`${i + 1}. ${check.name}`);
    console.log(`   ${check.description}`);
    if (check.url) console.log(`   URL: ${check.url}`);
    if (check.path) console.log(`   Path: ${check.path}`);
    if (check.hacs) console.log(`   Install via: HACS → ${check.hacs}`);
    if (check.install) console.log(`   Install: ${check.install}`);
    console.log(`   Required: ${check.required ? '✅ Yes' : '⚪ Optional'}\n`);
  });
  
  console.log('==============================================\n');
}

async function generateEntitiesYAML() {
  console.log('\n📝 Generating LCARS Helper Entities YAML...\n');
  
  const yaml = `# LCARS Helper Entities
# Add this to your configuration.yaml or create via UI

input_boolean:
  lcars_sound:
    name: LCARS Sound Effects
    icon: mdi:volume-high
    initial: false
    
  lcars_texture:
    name: LCARS Texture Effect
    icon: mdi:image-filter-hdr
    initial: true

input_number:
  lcars_horizontal:
    name: LCARS Horizontal Border
    icon: mdi:arrow-left-right
    initial: 30
    min: 6
    max: 60
    step: 2
    
  lcars_vertical:
    name: LCARS Vertical Border
    icon: mdi:arrow-up-down
    initial: 40
    min: 26
    max: 60
    step: 2
    
  lcars_menu_font:
    name: LCARS Menu Font Size
    icon: mdi:format-size
    initial: 18
    min: 12
    max: 36
    step: 2

# Optional: LCARS Header Sensor
template:
  - sensor:
      - name: "LCARS Header"
        state: "USS HOME - NCC-1701"
        attributes:
          stardate: "{{ now().strftime('%Y%m%d.%H') }}"
          location: "Sunfield, TX"
          status: "Operational"
`;
  
  const outputPath = path.join(__dirname, '..', '..', 'star-trek-ha', 'lcars-helpers.yaml');
  await fs.writeFile(outputPath, yaml);
  console.log(`✅ Saved to: ${outputPath}\n`);
  console.log('Add to configuration.yaml:\n');
  console.log('  input_boolean: !include star-trek-ha/lcars-helpers.yaml');
  console.log('  input_number: !include star-trek-ha/lcars-helpers.yaml\n');
}

async function generateTungstenCSS() {
  const css = `/* Tungsten Font for LCARS */
@font-face {
  font-family: 'Tungsten';
  src: url('/hacsfiles/fonts/Tungsten-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Tungsten';
  src: url('/hacsfiles/fonts/Tungsten-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Tungsten';
  src: url('/hacsfiles/fonts/Tungsten-Semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Tungsten';
  src: url('/hacsfiles/fonts/Tungsten-Light.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
`;
  
  const outputPath = path.join(__dirname, '..', '..', 'star-trek-ha', 'www', 'community', 'fonts', 'tungsten.css');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, css);
  console.log(`✅ Tungsten CSS saved to: ${outputPath}\n`);
}

async function generateInstallationSteps() {
  console.log('\n🔧 LCARS Installation Steps\n');
  console.log('===========================\n');
  
  const steps = [
    {
      title: '1. Install HACS',
      commands: [
        'If not installed, follow: https://hacs.xyz/docs/setup/download'
      ]
    },
    {
      title: '2. Install card-mod via HACS',
      commands: [
        'HACS → Frontend → Search "card-mod" → Install',
        'Restart Home Assistant'
      ]
    },
    {
      title: '3. Add Font Resource',
      commands: [
        'Settings → Dashboards → ⋮ (3 dots) → Resources',
        'Add Resource → URL: https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap',
        'Type: Stylesheet'
      ]
    },
    {
      title: '4. Add LCARS JavaScript',
      commands: [
        'Settings → Dashboards → ⋮ (3 dots) → Resources',
        'Add Resource → URL: https://cdn.jsdelivr.net/gh/th3jesta/ha-lcars@js-main/lcars.js',
        'Type: JavaScript Module'
      ]
    },
    {
      title: '5. Enable Themes',
      commands: [
        'Edit configuration.yaml:',
        'frontend:',
        '  themes: !include_dir_merge_named themes/'
      ]
    },
    {
      title: '6. Create Themes Folder',
      commands: [
        'mkdir -p config/themes/lcars',
        'Copy lcars.yaml to config/themes/lcars/'
      ]
    },
    {
      title: '7. Create Helper Entities',
      commands: [
        'Settings → Devices & Services → Helpers',
        'Create Toggle: LCARS Sound (input_boolean.lcars_sound)',
        'Create Toggle: LCARS Texture (input_boolean.lcars_texture)',
        'Create Number: LCARS Horizontal (6-60)',
        'Create Number: LCARS Vertical (26-60)'
      ]
    },
    {
      title: '8. Restart Home Assistant',
      commands: [
        'Developer Tools → YAML → Restart → Quick Reload'
      ]
    },
    {
      title: '9. Select Theme',
      commands: [
        'Click your profile (bottom left)',
        'Select "LCARS Default" from Theme dropdown'
      ]
    },
    {
      title: '10. Create Dashboard',
      commands: [
        'Settings → Dashboards → Add Dashboard',
        'Use Panel mode for best results',
        'Import dashboard code from lcars-main.yaml'
      ]
    }
  ];
  
  steps.forEach(step => {
    console.log(`${step.title}\n`);
    step.commands.forEach(cmd => {
      console.log(`   ${cmd}`);
    });
    console.log('');
  });
  
  console.log('===========================\n');
}

async function generateQuickReference() {
  const ref = `# LCARS Quick Reference Card

## Button Classes
| Class | Shape | Use Case |
|-------|-------|----------|
| button-small | Square | Grid layouts |
| button-large | Large rounded | Main actions |
| button-lozenge-left/right | Pill | Navigation |
| button-bullet-left/right | Half-round | Toggle buttons |
| button-capped-left/right | Capped | Entity buttons |
| button-barrel-left/right | Rectangle | Wide buttons |
| button-bar-left/right | Bar-style | Status displays |

## Section Classes
| Class | Position |
|-------|----------|
| header-left | Blue bar, left aligned |
| header-right | Blue bar, right aligned |
| header-contained | Blue bar, centered |
| middle-left | Red/purple left side |
| middle-right | Red/purple right side |
| middle-contained | Centered content |
| footer-left | Gray bar, left |
| footer-right | Gray bar, right |
| footer-contained | Gray bar, centered |

## Colors
- Orange: #FF9900 (Primary)
- Peach: #FFAA90 (Secondary)
- Purple: #CC99FF (Accent)
- Blue: #8899FF (Info)
- Red: #CC4444 (Alert)
- Black: #000000 (Background)
- White: #F5F6FA (Text)

## Example Card
\`\`\`yaml
type: button
entity: light.living_room
name: Living Room
card_mod:
  class: button-lozenge-left
\`\`\`

## Resources
- HA-LCARS: https://github.com/th3jesta/ha-lcars
- TheLCARS.com: https://www.thelcars.com
- Community: https://community.home-assistant.io/t/star-trek-lcars-theme/511391
`;
  
  const outputPath = path.join(__dirname, '..', '..', 'star-trek-ha', 'QUICK_REFERENCE.md');
  await fs.writeFile(outputPath, ref);
  console.log(`✅ Quick Reference saved to: ${outputPath}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--check':
      await checkPrerequisites();
      break;
    case '--install':
      await generateInstallationSteps();
      break;
    case '--entities':
      await generateEntitiesYAML();
      break;
    case '--all':
      await checkPrerequisites();
      await generateInstallationSteps();
      await generateEntitiesYAML();
      await generateTungstenCSS();
      await generateQuickReference();
      console.log('\n✅ All files generated!\n');
      break;
    default:
      console.log('\n🖖 Star Trek LCARS Home Assistant Setup Helper\n');
      console.log('Usage:');
      console.log('  node ha-lcars-setup.js --check     # Check prerequisites');
      console.log('  node ha-lcars-setup.js --install   # Show installation steps');
      console.log('  node ha-lcars-setup.js --entities  # Generate helper entities YAML');
      console.log('  node ha-lcars-setup.js --all       # Generate everything\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
