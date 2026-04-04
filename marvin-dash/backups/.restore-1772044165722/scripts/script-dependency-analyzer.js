/**
 * Script Dependency Analyzer
 * Maps dependencies between automation scripts for better maintenance
 * 
 * Usage: node script-dependency-analyzer.js [--visual] [--orphans] [--circular]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const SCRIPT_DIRS = [
  'dinner-automation/scripts',
  'marvin-dash/scripts'
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEPS_FILE = path.join(DATA_DIR, 'script-dependencies.json');

class DependencyAnalyzer {
  constructor() {
    this.dependencies = new Map();
    this.dependents = new Map();
    this.scripts = new Map();
    this.orphans = [];
    this.circularDeps = [];
  }

  async analyze() {
    console.log('🔍 Analyzing script dependencies...\n');
    
    // Find all scripts
    for (const dir of SCRIPT_DIRS) {
      await this.scanDirectory(dir);
    }
    
    // Parse dependencies
    for (const [filePath, content] of this.scripts) {
      await this.parseDependencies(filePath, content);
    }
    
    // Find orphans (scripts not imported by any other)
    this.findOrphans();
    
    // Find circular dependencies
    this.findCircularDependencies();
    
    // Save results
    await this.saveResults();
    
    return this.generateReport();
  }

  async scanDirectory(dir) {
    try {
      const fullPath = path.resolve(dir);
      const files = await fs.readdir(fullPath);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(fullPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          this.scripts.set(filePath, content);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${dir}: ${error.message}`);
    }
  }

  async parseDependencies(filePath, content) {
    const deps = {
      requires: [],
      imports: [],
      spawnCalls: [],
      execCalls: [],
      dataFiles: [],
      external: []
    };

    // Parse require() calls
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      const req = match[1];
      if (req.startsWith('./') || req.startsWith('../')) {
        const resolved = path.resolve(path.dirname(filePath), req);
        // Find matching script
        for (const [scriptPath] of this.scripts) {
          if (scriptPath.startsWith(resolved) || resolved.startsWith(scriptPath.replace('.js', ''))) {
            deps.requires.push(path.relative(process.cwd(), scriptPath));
            break;
          }
        }
      } else if (!req.includes('node_modules')) {
        deps.external.push(req);
      }
    }

    // Parse fs.readFile calls for data files
    const readFileRegex = /readFile\(['"]([^'"]+\.(json|md|txt))['"]/g;
    while ((match = readFileRegex.exec(content)) !== null) {
      deps.dataFiles.push(match[1]);
    }

    // Parse sessions_spawn calls
    const spawnRegex = /sessions_spawn\s*\(/g;
    if (spawnRegex.test(content)) {
      deps.spawnCalls.push('sessions_spawn');
    }

    // Parse exec calls for script execution
    const execRegex = /exec\(['"](node\s+\S+\.js)/g;
    while ((match = execRegex.exec(content)) !== null) {
      const scriptName = match[1].replace('node ', '');
      deps.execCalls.push(scriptName);
    }

    this.dependencies.set(filePath, deps);
  }

  findOrphans() {
    const allScripts = new Set(this.scripts.keys());
    const referenced = new Set();

    for (const deps of this.dependencies.values()) {
      for (const req of deps.requires) {
        referenced.add(path.resolve(req));
      }
      for (const exec of deps.execCalls) {
        const execPath = path.resolve(exec);
        for (const script of allScripts) {
          if (script.includes(execPath) || execPath.includes(script)) {
            referenced.add(script);
          }
        }
      }
    }

    for (const script of allScripts) {
      if (!referenced.has(script) && !this.isEntryPoint(script)) {
        this.orphans.push(script);
      }
    }
  }

  isEntryPoint(scriptPath) {
    // Scripts that are meant to be run directly
    const entryPatterns = [
      /if\s*\(\s*require\.main\s*===\s*module\s*\)/,
      /\/\/\s*Entry point/i,
      /\/\*\s*Entry point/i
    ];
    
    const content = this.scripts.get(scriptPath) || '';
    return entryPatterns.some(pattern => pattern.test(content));
  }

  findCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        this.circularDeps.push(cycle);
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.dependencies.get(node) || { requires: [] };
      for (const dep of deps.requires) {
        const depPath = path.resolve(dep);
        for (const [scriptPath] of this.scripts) {
          if (scriptPath.startsWith(depPath) || depPath.startsWith(scriptPath.replace('.js', ''))) {
            dfs(scriptPath, [...path]);
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const script of this.scripts.keys()) {
      visited.clear();
      recursionStack.clear();
      dfs(script);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScripts: this.scripts.size,
        totalDependencies: Array.from(this.dependencies.values())
          .reduce((sum, d) => sum + d.requires.length, 0),
        orphans: this.orphans.length,
        circularDependencies: this.circularDeps.length
      },
      scripts: {},
      orphans: this.orphans.map(o => path.relative(process.cwd(), o)),
      circularDependencies: this.circularDeps.map(cycle => 
        cycle.map(s => path.relative(process.cwd(), s))
      ),
      recommendations: []
    };

    // Build script details
    for (const [filePath, deps] of this.dependencies) {
      const relativePath = path.relative(process.cwd(), filePath);
      report.scripts[relativePath] = {
        requires: deps.requires,
        dataFiles: deps.dataFiles,
        external: deps.external,
        spawnCalls: deps.spawnCalls,
        execCalls: deps.execCalls
      };
    }

    // Generate recommendations
    if (this.orphans.length > 0) {
      report.recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        message: `${this.orphans.length} scripts appear unused. Review for deletion or consolidation.`
      });
    }

    if (this.circularDeps.length > 0) {
      report.recommendations.push({
        type: 'architecture',
        priority: 'high',
        message: `${this.circularDeps.length} circular dependencies detected. Refactor to break cycles.`
      });
    }

    // Find duplicate functionality
    const potentialDuplicates = this.findPotentialDuplicates();
    if (potentialDuplicates.length > 0) {
      report.recommendations.push({
        type: 'consolidation',
        priority: 'low',
        message: `${potentialDuplicates.length} potential duplicate scripts found. Consider consolidation.`
      });
    }

    return report;
  }

  findPotentialDuplicates() {
    const duplicates = [];
    const scripts = Array.from(this.scripts.entries());

    for (let i = 0; i < scripts.length; i++) {
      for (let j = i + 1; j < scripts.length; j++) {
        const [path1, content1] = scripts[i];
        const [path2, content2] = scripts[j];
        
        const name1 = path.basename(path1, '.js');
        const name2 = path.basename(path2, '.js');
        
        // Check for similar names
        if (this.nameSimilarity(name1, name2) > 0.7) {
          duplicates.push([path.relative(process.cwd(), path1), path.relative(process.cwd(), path2)]);
        }
      }
    }

    return duplicates;
  }

  nameSimilarity(name1, name2) {
    const words1 = name1.split(/[-_]/);
    const words2 = name2.split(/[-_]/);
    
    const common = words1.filter(w => words2.includes(w));
    return common.length / Math.max(words1.length, words2.length);
  }

  async saveResults() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const report = this.generateReport();
    await fs.writeFile(DEPS_FILE, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${DEPS_FILE}`);
  }

  async generateVisual() {
    // Generate a simple text-based dependency tree
    console.log('\n📊 Dependency Tree:\n');
    
    const visited = new Set();
    
    const printTree = (scriptPath, prefix = '') => {
      const relativePath = path.relative(process.cwd(), scriptPath);
      console.log(`${prefix}📄 ${path.basename(relativePath)}`);
      
      if (visited.has(scriptPath)) {
        console.log(`${prefix}   ↳ (circular reference)`);
        return;
      }
      
      visited.add(scriptPath);
      
      const deps = this.dependencies.get(scriptPath);
      if (deps && deps.requires.length > 0) {
        deps.requires.forEach((dep, index) => {
          const isLast = index === deps.requires.length - 1;
          const depPath = path.resolve(dep);
          
          for (const [script] of this.scripts) {
            if (script.startsWith(depPath) || depPath.startsWith(script.replace('.js', ''))) {
              printTree(script, prefix + (isLast ? '   ' : '│  '));
              break;
            }
          }
        });
      }
      
      visited.delete(scriptPath);
    };

    // Find entry points
    const entryPoints = Array.from(this.scripts.keys()).filter(s => this.isEntryPoint(s));
    
    for (const entry of entryPoints.slice(0, 5)) { // Limit to first 5
      printTree(entry);
      console.log('');
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const showVisual = args.includes('--visual');
  const showOrphans = args.includes('--orphans');
  const showCircular = args.includes('--circular');

  const analyzer = new DependencyAnalyzer();
  const report = await analyzer.analyze();

  // Print summary
  console.log('═'.repeat(50));
  console.log('  DEPENDENCY ANALYSIS REPORT');
  console.log('═'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Scripts: ${report.summary.totalScripts}`);
  console.log(`   Dependencies: ${report.summary.totalDependencies}`);
  console.log(`   Orphans: ${report.summary.orphans}`);
  console.log(`   Circular: ${report.summary.circularDependencies}`);

  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    for (const rec of report.recommendations) {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} [${rec.type}] ${rec.message}`);
    }
  }

  if (showOrphans && report.orphans.length > 0) {
    console.log(`\n📝 Orphaned Scripts (not imported by others):`);
    for (const orphan of report.orphans) {
      console.log(`   • ${orphan}`);
    }
  }

  if (showCircular && report.circularDependencies.length > 0) {
    console.log(`\n🔄 Circular Dependencies:`);
    for (const cycle of report.circularDependencies) {
      console.log(`   ${cycle.join(' → ')} → (back to start)`);
    }
  }

  if (showVisual) {
    await analyzer.generateVisual();
  }

  console.log('\n✅ Analysis complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DependencyAnalyzer };
