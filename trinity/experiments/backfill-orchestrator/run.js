#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const format = (date) => date.toISOString().replace('T', ' ').slice(0, 19);

const CONFIG_DIR = __dirname;
const JOBS_FILE = path.join(CONFIG_DIR, 'jobs.yaml');
const STATE_FILE = path.join(CONFIG_DIR, 'state.json');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);

// Load YAML (use simple parse since we have yaml installed? For simplicity, use JSON in real code; but we can require yaml)
let yaml;
try { yaml = require('yaml'); } catch (e) { console.error('yaml package not installed'); process.exit(1); }

function loadJobs() {
  if (!fs.existsSync(JOBS_FILE)) {
    console.error(`Jobs file not found: ${JOBS_FILE}`);
    process.exit(1);
  }
  const content = fs.readFileSync(JOBS_FILE, 'utf8');
  const doc = yaml.parse(content);
  return doc.jobs || [];
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { jobs: {} };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getLogPath(jobId) {
  return path.join(LOGS_DIR, `${jobId}.log`);
}

function appendLog(jobId, message) {
  const logPath = getLogPath(jobId);
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function runJob(job) {
  return new Promise((resolve) => {
    const { id, name, command, timeoutMs = 3600000 } = job;
    console.log(`Running job: ${name} (${id})`);
    appendLog(id, `START`);

    const start = Date.now();
    let timeoutId;

    const proc = exec(command, { maxBuffer: 1024 * 1024, env: { ...process.env } }, (error, stdout, stderr) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - start;
      if (error) {
        const msg = `FAILED after ${duration}ms: ${error.message}\nSTDERR: ${stderr}`;
        console.error(msg);
        appendLog(id, msg);
        resolve({ status: 'fail', duration, error: error.message, stderr });
      } else {
        const msg = `SUCCESS in ${duration}ms\nSTDOUT: ${stdout}`;
        console.log(msg);
        appendLog(id, msg);
        resolve({ status: 'success', duration, stdout });
      }
    });

    // Timeout handling
    timeoutId = setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
        const duration = Date.now() - start;
        const msg = `TIMEOUT after ${timeoutMs}ms (killed)`;
        console.warn(msg);
        appendLog(id, msg);
        resolve({ status: 'timeout', duration });
      }
    }, timeoutMs);
  });
}

function listJobs(jobs, state) {
  console.log('\nJobs:');
  console.log('ID\tName\tLast Run\tStatus');
  for (const job of jobs) {
    const info = state.jobs[job.id] || {};
    const last = info.lastRun ? format(new Date(info.lastRun), 'MM/dd HH:mm') : 'never';
    const status = info.lastStatus || '-';
    console.log(`${job.id}\t${job.name}\t${last}\t${status}`);
  }
  console.log('');
}

function showLogs(jobId) {
  const logPath = getLogPath(jobId);
  if (!fs.existsSync(logPath)) {
    console.log('No logs found.');
    return;
  }
  const content = fs.readFileSync(logPath, 'utf8');
  console.log(`--- Logs for ${jobId} ---\n${content}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const jobs = loadJobs();
  const state = loadState();

  if (command === 'list') {
    listJobs(jobs, state);
  } else if (command === 'run') {
    const jobId = args[1];
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      console.error(`Job not found: ${jobId}`);
      process.exit(1);
    }
    const result = await runJob(job);
    // Update state
    state.jobs[job.id] = {
      lastRun: Date.now(),
      lastStatus: result.status,
      lastDuration: result.duration,
      lastError: result.error || null
    };
    saveState(state);
  } else if (command === 'logs') {
    const jobId = args[1];
    if (!jobId) {
      console.error('Usage: run.js logs <jobId>');
      process.exit(1);
    }
    showLogs(jobId);
  } else {
    console.log(`
Backfill Orchestrator - usage:
  node run.js list                     # list all jobs and last run status
  node run.js run <jobId>              # run a specific job now
  node run.js logs <jobId>             # show logs for a job
    `);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
