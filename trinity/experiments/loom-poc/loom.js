#!/usr/bin/env node
/**
 * Loom - Multi-Agent Context Management Framework
 * PoC: Execute pipelines defined in YAML configs
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class LoomRuntime {
  constructor(configDir) {
    this.configDir = configDir;
    this.workers = new Map();
    this.orchestrators = new Map();
    this.contextCache = new Map(); // Shared context store
  }

  async loadConfigs() {
    // Load workers
    const workersDir = path.join(this.configDir, 'workers');
    for (const file of fs.readdirSync(workersDir)) {
      if (file.endsWith('.yaml')) {
        const doc = yaml.parse(fs.readFileSync(path.join(workersDir, file), 'utf8'));
        this.workers.set(doc.name, doc);
      }
    }

    // Load orchestrators
    const orchDir = path.join(this.configDir, 'orchestrators');
    for (const file of fs.readdirSync(orchDir)) {
      if (file.endsWith('.yaml')) {
        const doc = yaml.parse(fs.readFileSync(path.join(orchDir, file), 'utf8'));
        this.orchestrators.set(doc.name, doc);
      }
    }

    console.log(`[Loom] Loaded ${this.workers.size} workers, ${this.orchestrators.size} orchestrators`);
  }

  async execute(orchestratorName, initialContext = {}) {
    const orch = this.orchestrators.get(orchestratorName);
    if (!orch) throw new Error(`Orchestrator ${orchestratorName} not found`);

    console.log(`[Loom] Starting orchestrator: ${orchestratorName}`);
    let context = { ...initialContext };

    for (const stage of orch.pipeline_stages) {
      console.log(`[Loom] Executing stage: ${stage.name} (worker: ${stage.worker_type})`);
      const worker = this.workers.get(stage.worker_type);
      if (!worker) throw new Error(`Worker ${stage.worker_type} not found`);

      // Build input from context using mapping
      const input = this.mapInput(context, stage.input_mapping);

      // Execute worker (simulated - would call actual agent/model)
      const result = await this.runWorker(worker, input);

      // Store result in context
      context[stage.name] = result;
      console.log(`[Loom] Stage ${stage.name} completed:`, JSON.stringify(result).substring(0, 100) + '...');

      // Optionally reset context based on worker config
      if (worker.reset_after_task) {
        // Clean up stage-specific context if needed
      }
    }

    console.log(`[Loom] Orchestrator ${orchestratorName} complete.`);
    return context;
  }

  mapInput(context, mapping) {
    const result = {};
    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      const value = this.resolvePath(context, sourcePath);
      if (value !== undefined) {
        result[targetKey] = value;
      }
    }
    return result;
  }

  resolvePath(obj, path) {
    // Supports dot notation: "a.b.c"
    return path.split('.').reduce((acc, key) => acc && acc[key], obj);
  }

  async runWorker(worker, input) {
    // Simulate worker execution
    // In real implementation: call OpenRouter API or local model based on worker config
    console.log(`[Loom] Running worker ${worker.name} with input:`, JSON.stringify(input).substring(0, 80) + '...');

    // Simulated processing
    await new Promise(r => setTimeout(r, 100));

    // Generate placeholder result based on worker name
    if (worker.name === 'extractor') {
      return { result: `Extracted: ${input.text.substring(0, 50)}...` };
    } else if (worker.name === 'classifier') {
      return { result: `Classified as: example_category` };
    }

    return { result: `Processed by ${worker.name}` };
  }
}

// CLI Entry
if (require.main === module) {
  const configDir = process.env.LOOM_CONFIG_DIR || path.join(__dirname, 'configs');
  const runtime = new LoomRuntime(configDir);

  runtime.loadConfigs().then(() => {
    return runtime.execute('extract_classify', {
      goal: {
        context: {
          text: "The Hoffmann Nash team needs a utilization dashboard that shows historical capacity, forward-looking booked percentage, and automated CSV exports to their paid ads agency."
        }
      }
    });
  }).then(finalContext => {
    console.log('\n=== FINAL CONTEXT ===');
    console.log(JSON.stringify(finalContext, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('[Loom Error]', err);
    process.exit(1);
  });
}

module.exports = { LoomRuntime };
