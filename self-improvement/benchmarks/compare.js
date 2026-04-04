/**
 * Benchmark Comparison Tool
 * Compares optimized vs original implementations and generates reports
 */

const fs = require('fs');
const path = require('path');

class BenchmarkComparator {
  constructor() {
    this.resultsDir = path.join(__dirname);
    this.reportsDir = path.join(__dirname, 'reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Load benchmark results from JSON file
   */
  loadResults(filename) {
    const filepath = path.join(this.resultsDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Results file not found: ${filepath}`);
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }

  /**
   * Calculate percentage improvement
   */
  calculateImprovement(original, optimized) {
    const improvement = ((original - optimized) / original) * 100;
    return {
      absolute: original - optimized,
      percentage: parseFloat(improvement.toFixed(2)),
      faster: improvement > 0
    };
  }

  /**
   * Compare two benchmark results
   */
  compare(originalResults, optimizedResults) {
    const comparison = {
      metadata: {
        originalDate: originalResults.runDate,
        optimizedDate: optimizedResults.runDate,
        comparedAt: new Date().toISOString()
      },
      summary: {
        totalTests: 0,
        improvements: 0,
        regressions: 0,
        unchanged: 0,
        averageImprovement: 0
      },
      details: {}
    };

    const improvements = [];

    // Compare each test
    for (const [testName, original] of Object.entries(originalResults.results)) {
      const optimized = optimizedResults.results[testName];
      
      if (!optimized) {
        comparison.details[testName] = {
          status: 'missing',
          message: 'Test not found in optimized results'
        };
        continue;
      }

      const improvement = this.calculateImprovement(original.stats.mean, optimized.stats.mean);
      improvements.push(improvement.percentage);

      comparison.details[testName] = {
        original: {
          mean: original.stats.mean,
          median: original.stats.median,
          stdDev: original.stats.stdDev,
          unit: original.unit
        },
        optimized: {
          mean: optimized.stats.mean,
          median: optimized.stats.median,
          stdDev: optimized.stats.stdDev,
          unit: optimized.unit
        },
        improvement,
        status: improvement.percentage > 5 ? 'improved' : 
                improvement.percentage < -5 ? 'regression' : 'unchanged'
      };

      comparison.summary.totalTests++;
      if (improvement.percentage > 5) comparison.summary.improvements++;
      else if (improvement.percentage < -5) comparison.summary.regressions++;
      else comparison.summary.unchanged++;
    }

    // Calculate average improvement
    if (improvements.length > 0) {
      comparison.summary.averageImprovement = parseFloat(
        (improvements.reduce((a, b) => a + b, 0) / improvements.length).toFixed(2)
      );
    }

    return comparison;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(comparison) {
    const { metadata, summary, details } = comparison;
    
    let markdown = `# Benchmark Comparison Report\n\n`;
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `- **Original Run:** ${new Date(metadata.originalDate).toLocaleString()}\n`;
    markdown += `- **Optimized Run:** ${new Date(metadata.optimizedDate).toLocaleString()}\n`;
    markdown += `- **Total Tests:** ${summary.totalTests}\n`;
    markdown += `- **Average Improvement:** ${summary.averageImprovement}%\n`;
    markdown += `- **Improvements:** ${summary.improvements} ✅\n`;
    markdown += `- **Regressions:** ${summary.regressions} ⚠️\n`;
    markdown += `- **Unchanged:** ${summary.unchanged} ➖\n\n`;

    // Performance verdict
    if (summary.averageImprovement > 20) {
      markdown += `🎉 **Significant performance improvements detected!**\n\n`;
    } else if (summary.averageImprovement > 5) {
      markdown += `✅ **Notable performance improvements detected.**\n\n`;
    } else if (summary.averageImprovement > -5) {
      markdown += `➖ **Performance roughly equivalent.**\n\n`;
    } else {
      markdown += `⚠️ **Performance regressions detected.**\n\n`;
    }

    // Detailed results
    markdown += `## Detailed Results\n\n`;
    markdown += `| Test | Original | Optimized | Improvement | Status |\n`;
    markdown += `|------|----------|-----------|-------------|--------|\n`;

    for (const [testName, detail] of Object.entries(details)) {
      if (detail.status === 'missing') {
        markdown += `| ${testName} | - | - | - | ⚠️ Missing |\n`;
        continue;
      }

      const original = `${detail.original.mean}${detail.original.unit}`;
      const optimized = `${detail.optimized.mean}${detail.optimized.unit}`;
      const improvement = `${detail.improvement.percentage}%`;
      const status = detail.status === 'improved' ? '✅' : 
                    detail.status === 'regression' ? '⚠️' : '➖';

      markdown += `| ${testName} | ${original} | ${optimized} | ${improvement} | ${status} |\n`;
    }

    markdown += `\n`;

    // Key improvements
    const improvements = Object.entries(details)
      .filter(([_, d]) => d.status === 'improved')
      .sort((a, b) => b[1].improvement.percentage - a[1].improvement.percentage);

    if (improvements.length > 0) {
      markdown += `## Top Improvements\n\n`;
      improvements.slice(0, 5).forEach(([name, detail]) => {
        markdown += `- **${name}**: ${detail.improvement.percentage}% faster `;
        markdown += `(${detail.original.mean}${detail.original.unit} → ${detail.optimized.mean}${detail.optimized.unit})\n`;
      });
      markdown += `\n`;
    }

    // Regressions
    const regressions = Object.entries(details)
      .filter(([_, d]) => d.status === 'regression');

    if (regressions.length > 0) {
      markdown += `## Regressions (Needs Attention)\n\n`;
      regressions.forEach(([name, detail]) => {
        markdown += `- **${name}**: ${Math.abs(detail.improvement.percentage)}% slower `;
        markdown += `(${detail.original.mean}${detail.original.unit} → ${detail.optimized.mean}${detail.optimized.unit})\n`;
      });
      markdown += `\n`;
    }

    // Methodology
    markdown += `## Methodology\n\n`;
    markdown += `- All times measured in milliseconds unless otherwise noted\n`;
    markdown += `- Tests run with 5 iterations each\n`;
    markdown += `- Improvement calculated: ((original - optimized) / original) * 100\n`;
    markdown += `- Status thresholds: >5% = improved, <-5% = regression, else unchanged\n\n`;

    return markdown;
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(comparison) {
    return JSON.stringify(comparison, null, 2);
  }

  /**
   * Save reports to disk
   */
  saveReports(comparison, basename) {
    const mdPath = path.join(this.reportsDir, `${basename}.md`);
    const jsonPath = path.join(this.reportsDir, `${basename}.json`);

    fs.writeFileSync(mdPath, this.generateMarkdownReport(comparison));
    fs.writeFileSync(jsonPath, this.generateJSONReport(comparison));

    return { markdown: mdPath, json: jsonPath };
  }

  /**
   * Print comparison to console
   */
  printComparison(comparison) {
    const { summary, details } = comparison;
    
    console.log('\n📊 Benchmark Comparison');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Tests:     ${summary.totalTests}`);
    console.log(`Average Improvement: ${summary.averageImprovement}%`);
    console.log(`Improvements:    ${summary.improvements} ✅`);
    console.log(`Regressions:     ${summary.regressions} ⚠️`);
    console.log(`Unchanged:       ${summary.unchanged} ➖`);
    console.log('');

    console.log('Detailed Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const [testName, detail] of Object.entries(details)) {
      if (detail.status === 'missing') {
        console.log(`${testName}: ⚠️ Missing in optimized results`);
        continue;
      }

      const icon = detail.status === 'improved' ? '✅' : 
                  detail.status === 'regression' ? '⚠️' : '➖';
      
      const sign = detail.improvement.percentage > 0 ? '+' : '';
      console.log(`${icon} ${testName}: ${sign}${detail.improvement.percentage}% (${detail.original.mean} → ${detail.optimized.mean}${detail.original.unit})`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Create a new baseline from current results
   */
  createNewBaseline(optimizedResults, description = '') {
    const baselineData = {
      ...optimizedResults,
      benchmarkVersion: this.incrementVersion(optimizedResults.benchmarkVersion),
      runDate: new Date().toISOString(),
      previousBaseline: optimizedResults.runDate,
      description
    };

    const baselinePath = path.join(this.resultsDir, 'baseline-results.json');
    fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
    
    return baselinePath;
  }

  /**
   * Increment version number
   */
  incrementVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2]++;
    return parts.join('.');
  }
}

// CLI usage
function main() {
  const comparator = new BenchmarkComparator();
  
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'compare') {
    const originalFile = args[1] || 'baseline-results.json';
    const optimizedFile = args[2] || 'optimized-results.json';
    
    try {
      const original = comparator.loadResults(originalFile);
      const optimized = comparator.loadResults(optimizedFile);
      
      const comparison = comparator.compare(original, optimized);
      comparator.printComparison(comparison);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const reportPaths = comparator.saveReports(comparison, `comparison-${timestamp}`);
      
      console.log(`📄 Reports saved:`);
      console.log(`   Markdown: ${reportPaths.markdown}`);
      console.log(`   JSON:     ${reportPaths.json}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } else if (command === 'baseline') {
    const optimizedFile = args[1] || 'optimized-results.json';
    const description = args[2] || '';
    
    try {
      const optimized = comparator.loadResults(optimizedFile);
      const baselinePath = comparator.createNewBaseline(optimized, description);
      
      console.log(`✅ New baseline created: ${baselinePath}`);
      console.log(`   Version: ${optimized.benchmarkVersion}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Benchmark Comparison Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node compare.js compare [original.json] [optimized.json]');
    console.log('  node compare.js baseline [optimized.json] [description]');
    console.log('');
    console.log('Examples:');
    console.log('  node compare.js compare baseline-results.json optimized-results.json');
    console.log('  node compare.js baseline optimized-results.json "After cache optimization"');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { BenchmarkComparator };
