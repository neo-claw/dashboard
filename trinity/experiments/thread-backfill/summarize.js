// Thread Backfill Summarizer - Trinity Experiment
// Usage: node summarize.js <thread.json>
// Reads JSON array of {role, content} and outputs summary.

const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('ERROR: OPENROUTER_API_KEY not set');
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node summarize.js <thread.json>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
let messages;
try {
  messages = JSON.parse(raw);
  if (!Array.isArray(messages)) throw new Error('Expected array');
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

// Build prompt from conversation
const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : m.role}: ${m.content}`).join('\n');

const systemPrompt = `You are a summarization engine. Summarize the conversation preserving key facts, decisions, action items, and open questions. The summary should be concise but complete enough that someone reading it can understand what happened and continue the conversation. Aim for ~200-300 words.`;

const payload = JSON.stringify({
  model: 'openrouter/stepfun/step-3.5-flash:free',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Conversation:\n\n${conversationText}\n\nSummary:` }
  ],
  temperature: 0.2,
  max_tokens: 800
});

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`API error ${res.statusCode}:`, data);
      process.exit(1);
    }
    try {
      const resp = JSON.parse(data);
      const summary = resp.choices?.[0]?.message?.content?.trim();
      if (!summary) throw new Error('No summary in response');
      console.log(summary);
      process.exit(0);
    } catch (e) {
      console.error('Parse error:', e.message, data.slice(0,200));
      process.exit(1);
    }
  });
});

req.on('error', e => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(payload);
req.end();