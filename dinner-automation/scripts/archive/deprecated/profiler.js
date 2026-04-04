/**
 * Performance Profiler for Dinner Automation Scripts
 * 
 * Usage: node profiler.js --script=heb|email|calendar [--iterations=5]
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const SCRIPTS = {
  heb: './heb-direct-automation.js',
  email: './email-client.js', 
  calendar: './calendar-sync.js'
};

class Profiler {
  constructor(options = {}) {
    this.iterations = options.iterations || 5;
    this.results = [];
  }

  async profileScript(scriptName) {
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`  Profiling: ${scriptName}`);
    console.log(`═══════════════════════════════════════════════════\n`);

    const scriptPath = SCRIPTS[scriptName];
    if (!scriptPath) {
      throw new Error(`Unknown script: ${scriptName}. Use: heb, email, calendar`);
    }

    const times = [];
    const memoryUsage = [];

    for (let i = 0; i < this.iterations; i++) {
      const startMem = process.memoryUsage();
      const startTime = performance.now();

      try {
        // Clear require cache for fresh measurement
        delete require.cache[require.resolve(scriptPath)];
        
        // Load and initialize
        const module = require(scriptPath);
        
        // Simulate operation based on script type
        await this.simulateOperation(scriptName, module);

        const endTime = performance.now();
        const endMem = process.memoryUsage();

        const duration = endTime - startTime;
        const memUsed = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;

        times.push(duration);
        memoryUsage.push(memUsed);

        console.log(`  Iteration ${i + 1}: ${duration.toFixed(2)}ms (${memUsed.toFixed(2)} MB)`);

      } catch (error) {
        console.error(`  Iteration ${i + 1}: FAILED - ${error.message}`);
      }
    }

    // Calculate statistics
    const stats = this.calculateStats(times, memoryUsage);
    this.results.push({ script: scriptName, ...stats });

    this.printStats(scriptName, stats);
    return stats;
  }

  async simulateOperation(scriptName, module) {
    switch (scriptName) {
      case 'heb':
        // Simulate item loading (without browser)
        if (module.HEBDirectAutomation) {
          const auto = new module.HEBDirectAutomation();
          await auto.loadItems();
        }
        break;

      case 'email':
        // Simulate email formatting (without SMTP)
        if (module.DinnerEmailClient) {
          const client = new module.DinnerEmailClient({ useDiscordFallback: false });
          const mockPlan = this.getMockWeeklyPlan();
          const mockCart = { status: 'ready', items: [] };
          
          // Test formatting only
          await client.formatEmailTextAsync(mockPlan, mockCart, []);
          await client.formatEmailHTMLAsync(mockPlan, mockCart, []);
        }
        break;

      case 'calendar':
        // Simulate calendar generation (without file write)
        if (module.CalendarSync) {
          const sync = new module.CalendarSync();
          await sync.preview();
        }
        break;
    }
  }

  getMockWeeklyPlan() {
    return {
      weekOf: '2026-02-10',
      metadata: { generatedAt: new Date().toISOString() },
      budget: {
        allocated: 150.00,
        estimatedMealCost: 135.00,
        buffer: 13.50,
        totalWithBuffer: 148.50,
        remaining: 15.00
      },
      meals: [
        {
          day: 'Monday',
          name: 'Grilled Chicken Salad',
          category: 'Healthy',
          prepTime: '30 min',
          difficulty: 'Easy',
          estimatedCost: 18.50,
          ingredients: [
            { name: 'Chicken Breast', amount: '2 lbs' },
            { name: 'Mixed Greens', amount: '1 bag' },
            { name: 'Cherry Tomatoes', amount: '1 pint' },
            { name: 'Cucumber', amount: '2' }
          ]
        },
        {
          day: 'Tuesday',
          name: 'Beef Tacos',
          category: 'Mexican',
          prepTime: '25 min',
          difficulty: 'Easy',
          estimatedCost: 22.00,
          ingredients: [
            { name: 'Ground Beef', amount: '1.5 lbs' },
            { name: 'Taco Shells', amount: '1 box' },
            { name: 'Cheese', amount: '2 cups' },
            { name: 'Lettuce', amount: '1 head' }
          ]
        },
        {
          day: 'Wednesday',
          name: 'Salmon with Rice',
          category: 'Seafood',
          prepTime: '35 min',
          difficulty: 'Medium',
          estimatedCost: 28.00,
          ingredients: [
            { name: 'Salmon Fillet', amount: '1.5 lbs' },
            { name: 'Rice', amount: '2 cups' },
            { name: 'Broccoli', amount: '1 head' },
            { name: 'Lemon', amount: '2' }
          ]
        }
      ]
    };
  }

  calculateStats(times, memory) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    
    return {
      iterations: times.length,
      total: sum,
      average: sum / times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      avgMemory: memory.reduce((a, b) => a + b, 0) / memory.length
    };
  }

  printStats(scriptName, stats) {
    console.log(`\n─────────────────────────────────────────────────`);
    console.log(`  Results for ${scriptName}:`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`  Iterations:  ${stats.iterations}`);
    console.log(`  Average:     ${stats.average.toFixed(2)}ms`);
    console.log(`  Min:         ${stats.min.toFixed(2)}ms`);
    console.log(`  Max:         ${stats.max.toFixed(2)}ms`);
    console.log(`  Median:      ${stats.median.toFixed(2)}ms`);
    console.log(`  P95:         ${stats.p95.toFixed(2)}ms`);
    console.log(`  Avg Memory:  ${stats.avgMemory.toFixed(2)} MB`);
  }

  printSummary() {
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`           PROFILING SUMMARY`);
    console.log(`═══════════════════════════════════════════════════\n`);

    this.results.forEach(result => {
      console.log(`  ${result.script.toUpperCase()}:`);
      console.log(`    Average: ${result.average.toFixed(2)}ms`);
      console.log(`    P95:     ${result.p95.toFixed(2)}ms`);
      console.log('');
    });
  }

  exportResults() {
    const outputPath = path.join(__dirname, '..', 'data', 'profiling-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results
    }, null, 2));
    console.log(`\n📊 Results exported to: ${outputPath}`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const scriptArg = args.find(a => a.startsWith('--script='));
  const iterArg = args.find(a => a.startsWith('--iterations='));

  if (!scriptArg) {
    console.log('Usage: node profiler.js --script=heb|email|calendar [--iterations=5]');
    console.log('');
    console.log('Options:');
    console.log('  --script=NAME      Script to profile (heb, email, calendar)');
    console.log('  --iterations=N     Number of iterations (default: 5)');
    process.exit(1);
  }

  const scriptName = scriptArg.split('=')[1];
  const iterations = iterArg ? parseInt(iterArg.split('=')[1]) : 5;

  const profiler = new Profiler({ iterations });

  try {
    await profiler.profileScript(scriptName);
    profiler.printSummary();
    profiler.exportResults();
  } catch (error) {
    console.error(`\n❌ Profiling failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { Profiler };
