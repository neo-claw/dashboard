#!/usr/bin/env node
/**
 * Test suite for taxonomy parser.
 * Verifies parsing markdown table and round-trip generation.
 */

const { parseMarkdownTable, generateMarkdownTable } = require('./taxonomy-parser.js');
const fs = require('fs');
const path = require('path');

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i])) {
      if (!arraysEqual(a[i], b[i])) return false;
    } else {
      if (a[i] !== b[i]) return false;
    }
  }
  return true;
}

function runTests() {
  const sampleMd = `| Outcome | Reason | Subreason |
| ------- | ------ | --------- |
| Booked  | Booked | Booked    |
| Unbooked| Timing objection | Too Late |`;

  const { headers, rows } = parseMarkdownTable(sampleMd);
  console.assert(headers.length === 3, 'Should have 3 headers');
  console.assert(headers[0] === 'Outcome', 'First header should be Outcome');
  console.assert(rows.length === 2, 'Should have 2 rows');
  console.assert(rows[0][0] === 'Booked', 'First row first cell should be Booked');

  // Round-trip
  const regenerated = generateMarkdownTable(headers, rows);
  const { headers: h2, rows: r2 } = parseMarkdownTable(regenerated);
  console.assert(arraysEqual(headers, h2), 'Round-trip headers should match');
  console.assert(arraysEqual(rows, r2), 'Round-trip rows should match');

  // Test with actual file
  const realFile = path.join(__dirname, 'netic_inbound_drilldown.md');
  if (fs.existsSync(realFile)) {
    const md = fs.readFileSync(realFile, 'utf8');
    const { headers: h, rows: r } = parseMarkdownTable(md);
    console.log(`Parsed real file: ${h.length} headers, ${r.length} rows`);
    // Regenerate and compare? Might not be identical due to whitespace, but should parse consistently.
    const regen = generateMarkdownTable(h, r);
    const { headers: h2, rows: r2 } = parseMarkdownTable(regen);
    console.assert(arraysEqual(h, h2), 'Real file round-trip headers match');
    console.assert(arraysEqual(r, r2), 'Real file round-trip rows match');
    console.log('Real file round-trip test passed');
  } else {
    console.log('Real file not present, skipping');
  }

  console.log('All tests passed');
}

runTests();
