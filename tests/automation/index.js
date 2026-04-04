/**
 * Browser Automation Test Suite - Main Entry
 * Exports all test utilities and helpers
 */

// Mocks
const { MockCDPServer } = require('./mocks/cdp-server');
const { CDPClient } = require('./mocks/cdp-client');

// Fixtures
const fixtures = require('./fixtures/page-snapshots');

// Test helpers (from anti-bot test file)
const {
  HumanBehaviorSimulator,
  StealthUtils,
  TimingUtils,
  MouseUtils,
  ScrollUtils
} = require('./unit/anti-bot.test');

// Export everything
module.exports = {
  // Mocks
  MockCDPServer,
  CDPClient,
  
  // Fixtures
  fixtures,
  
  // Helpers
  HumanBehaviorSimulator,
  StealthUtils,
  TimingUtils,
  MouseUtils,
  ScrollUtils
};

// If run directly, print info
if (require.main === module) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Browser Automation Test Suite                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Usage: npm test                                           ║
║                                                            ║
║  Available commands:                                       ║
║    npm test              - Run all tests                   ║
║    npm run test:unit     - Run unit tests only             ║
║    npm run test:integration - Run integration tests        ║
║    npm run test:benchmarks - Run performance benchmarks    ║
║    npm run test:watch    - Run tests in watch mode         ║
║    npm run test:coverage - Run with coverage report        ║
║                                                            ║
║  Test Structure:                                           ║
║    tests/automation/unit/         - Unit tests             ║
║    tests/automation/integration/  - Integration tests      ║
║    tests/automation/benchmarks/   - Performance tests      ║
║    tests/automation/mocks/        - Mock CDP server        ║
║    tests/automation/fixtures/     - Test fixtures          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}
