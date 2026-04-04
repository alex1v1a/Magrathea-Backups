/**
 * {{SCRIPT_NAME}}
 * 
 * {{SCRIPT_DESCRIPTION}}
 * 
 * Usage:
 *   node {{FILE_NAME}} [options]
 * 
 * Options:
 *   --help, -h       Show this help message
 *   --verbose, -v    Enable verbose logging
 *   --dry-run        Run without making changes
 *   --config FILE    Use custom config file
 * 
 * @module scripts/{{FILE_NAME}}
 */

// ============================================================================
// IMPORTS
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// Shared library
const { 
  logger, 
  getConfig, 
  withRetry, 
  sleep,
  validateRequired,
  ValidationError 
} = require('../lib');

// Component logger
const log = logger.child('{{COMPONENT_NAME}}');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Timing
  delays: {
    min: 1000,
    max: 3000,
    navigation: 5000
  },
  
  // Retry settings
  retry: {
    maxRetries: 3,
    delay: 1000,
    backoff: 2
  },
  
  // Timeouts
  timeout: {
    navigation: 30000,
    selector: 5000
  }
};

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * {{CLASS_DESCRIPTION}}
 */
class {{CLASS_NAME}} {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      dryRun: false,
      ...options
    };
    
    this.config = getConfig();
    this.results = [];
  }

  /**
   * Initialize the automation
   * @returns {Promise<void>}
   */
  async initialize() {
    log.info('Initializing...', { dryRun: this.options.dryRun });
    
    // Add initialization logic here
    
    log.success('Initialized successfully');
  }

  /**
   * Run the main automation
   * @returns {Promise<Object>} Results
   */
  async run() {
    log.section('{{SCRIPT_NAME}} STARTING');
    
    const startTime = Date.now();
    
    try {
      await this.initialize();
      
      // Main logic here
      const result = await this.performAction();
      
      const duration = Date.now() - startTime;
      log.success('Automation completed', { duration });
      
      return {
        success: true,
        duration,
        result
      };
      
    } catch (error) {
      log.error('Automation failed', error);
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Perform the main action
   * @returns {Promise<any>}
   */
  async performAction() {
    // Implement main logic here
    throw new Error('Not implemented');
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    log.info('Cleaning up...');
    // Cleanup logic here
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    verbose: false,
    dryRun: false,
    config: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--dry-run':
        options.dryRun = true;
        break;
        
      case '--config':
        options.config = args[++i];
        break;
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
{{SCRIPT_NAME}}

{{SCRIPT_DESCRIPTION}}

Usage:
  node {{FILE_NAME}} [options]

Options:
  --help, -h       Show this help message
  --verbose, -v    Enable verbose logging
  --dry-run        Run without making changes
  --config FILE    Use custom config file
`);
}

/**
 * Validate options
 * @param {Object} options - Parsed options
 * @throws {ValidationError} If invalid
 */
function validateOptions(options) {
  // Add validation logic here
  validateRequired(options, [], 'options');
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const options = parseArgs();
  
  // Set log level based on verbose flag
  if (options.verbose) {
    logger.setLevel(3); // DEBUG
  }
  
  try {
    validateOptions(options);
    
    const automation = new {{CLASS_NAME}}(options);
    const result = await automation.run();
    
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    log.error('Fatal error', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { {{CLASS_NAME}}, parseArgs, validateOptions };
