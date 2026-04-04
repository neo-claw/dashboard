#!/usr/bin/env node

/**
 * Netic Team-Opportunity Matcher
 * Matches Netic employees to research/business opportunities based on parsed notes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const DATA_DIR = ROOT;

// Utility to read file safely
function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

// Parse people.md to extract team members with roles
function parsePeople(content) {
  const people = [];
  const lines = content.split('\n');
  let currentSection = 'general';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Detect section headers: lines ending with colon (e.g., "Engineering:")
    if (trimmed.endsWith(':')) {
      currentSection = trimmed.replace(':', '').toLowerCase();
      continue;
    }
    // Detect plain capitalized headers (e.g., "Engineering", "Operations") that are short and not a person line
    if (!trimmed.includes('(') && !trimmed.includes(')') && trimmed.length < 30 && /^[A-Z][a-zA-Z\s]+$/.test(trimmed) && !trimmed.includes(',')) {
      currentSection = trimmed.toLowerCase();
      continue;
    }
    // Lines like "Theodore Klausner (415-683-9885)"
    const match = trimmed.match(/^([A-Za-z]+\s+[A-Za-z]+)\s*\(([^)]+)\)/);
    if (match) {
      const name = match[1];
      const contact = match[2];
      people.push({ name, contact, roleSection: currentSection, focus: [] });
      continue;
    }
    // Handle dash-prefixed list: "- Theodore Klausner (415-683-9885)"
    const dashMatch = trimmed.match(/^[-*•]\s*([A-Za-z]+\s+[A-Za-z]+)\s*\(([^)]+)\)/);
    if (dashMatch) {
      const name = dashMatch[1];
      const contact = dashMatch[2];
      people.push({ name, contact, roleSection: currentSection, focus: [] });
    }
  }
  return people;
}

// Parse found.md for founders/engineers/designers
function parseFound(content) {
  const roles = [];
  const lines = content.split('\n');
  let currentRole = 'general';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith(':')) {
      currentRole = trimmed.replace(':', '').toLowerCase();
      continue;
    }
    // Names with optional bullet dash
    const clean = trimmed.replace(/^[-•*]\s*/, '');
    // If it's a list item, treat as a person in that role
    if (clean.includes(' ')) { // crude name detection
      roles.push({ name: clean, roleSection: currentRole, focus: [] });
    }
  }
  return roles;
}

// Extract interest topics from a note text (heuristic keyword matching)
function extractTopics(text) {
  const keywords = [
    'ant colony', 'superorganism', 'context engineering', 'multi-agent', 'pheromone',
    'conventions', 'hanabi', 'coordination', 'swarm', 'distributed',
    'cognitive science', 'innateness', 'marr', 'language',
    'netic', 'uber', 'lyft', 'fasten', 'rideshare', 'business model',
    'research', 'opportunity', 'fellowship', 'grant'
  ];
  const found = new Set();
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) found.add(kw);
  }
  return Array.from(found);
}

// Parse opportunity from a note file
function parseOpportunity(fileName, content) {
  const topics = extractTopics(content);
  const domain = inferDomain(fileName, content);
  const skills = inferSkills(content);
  const deadline = extractDeadline(content);
  return {
    fileName,
    domain,
    skills,
    interests: topics,
    deadline,
    snippet: content.slice(0, 500).replace(/\n/g, ' ')
  };
}

function inferDomain(fileName, content) {
  const lower = (fileName + ' ' + content).toLowerCase();
  if (lower.includes('research') || lower.includes('fellowship')) return 'Research';
  if (lower.includes('netic') && lower.includes('inbound')) return 'Netic Business/Product';
  if (lower.includes('school') || lower.includes('strat')) return 'Academic/Strategy';
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('fasten')) return 'Rideshare Analysis';
  return 'General';
}

function inferSkills(content) {
  const skillKeywords = [
    'python', 'node.js', 'javascript', 'react', 'typescript', 'machine learning',
    'ai', 'nlp', 'analytics', 'dashboard', 'api', 'backend', 'frontend',
    'statistics', 'research', 'writing', 'design', 'strategy', 'operations'
  ];
  const lower = content.toLowerCase();
  const found = [];
  for (const sk of skillKeywords) {
    if (lower.includes(sk)) found.push(sk);
  }
  return found;
}

function extractDeadline(content) {
  const dateRegex = /(?:deadline|due|by)[^\n]*?(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i;
  const match = content.match(dateRegex);
  return match ? match[0].trim() : null;
}

// Compute match score between person and opportunity
function computeMatch(person, opp) {
  let score = 0;
  // Role alignment
  const personRole = person.roleSection.toLowerCase();
  if (personRole.includes('engineering') || personRole.includes('engineer')) {
    if (opp.domain === 'Research' && opp.skills.includes('machine learning')) score += 3;
    if (opp.skills.some(s => ['python','node.js','javascript','backend','frontend'].includes(s))) score += 2;
  }
  if (personRole.includes('operations')) {
    if (opp.domain === 'Netic Business/Product') score += 2;
  }
  if (personRole.includes('sales') || personRole.includes('sales')) {
    if (opp.domain === 'Netic Business/Product') score += 2;
  }
  if (personRole.includes('design')) {
    if (opp.skills.includes('design') || opp.skills.includes('dashboard')) score += 2;
  }
  // Interest overlap
  if (person.focus && person.focus.length) {
    const overlap = person.focus.filter(f => opp.interests.includes(f)).length;
    score += overlap * 2;
  }
  // If person is founder/generalist, boost
  if (personRole.includes('founder') || personRole.includes('generalist')) {
    score += 1;
  }
  return score;
}

// Main
function main() {
  // Load data
  const peopleContent = readFile(path.join(DATA_DIR, 'people.md'));
  const foundContent = readFile(path.join(DATA_DIR, 'found.md'));
  const neticInbound = readFile(path.join(DATA_DIR, 'netic-inbound.md'));
  const schoolStrat = readFile(path.join(DATA_DIR, 'school_strat_uber_lyft.md'));
  const runningNetic = readFile(path.join(DATA_DIR, 'runnig_notes_netic.md')); // note typo in filename
  const runningNotes = readFile(path.join(DATA_DIR, 'running_notes.md'));

  const people = parsePeople(peopleContent);
  const foundersEtc = parseFound(foundContent);
  const allPeople = [...people, ...foundersEtc];

  // Enrich people with inferred interests from notes they may be associated with
  // In practice, we'd have a structured profile; for now, assign based on role
  allPeople.forEach(p => {
    if (p.roleSection.includes('engineering')) p.focus = ['ai', 'machine learning', 'context engineering'];
    if (p.roleSection.includes('operations')) p.focus = ['netic', 'business operations'];
    if (p.roleSection.includes('sales')) p.focus = ['netic', 'growth'];
    if (p.roleSection.includes('design')) p.focus = ['dashboard', 'ui/ux', 'analytics'];
    if (p.roleSection.includes('founder')) p.focus = ['business model', 'strategy', 'netic'];
  });

  // Build opportunity list
  const opportunities = [];
  if (neticInbound) opportunities.push(parseOpportunity('netic-inbound.md', neticInbound));
  if (schoolStrat) opportunities.push(parseOpportunity('school_strat_uber_lyft.md', schoolStrat));
  if (runningNetic) opportunities.push(parseOpportunity('runnig_notes_netic.md', runningNetic));
  if (runningNotes) opportunities.push(parseOpportunity('running_notes.md', runningNotes));
  // Also include netic_definitions.md if available
  const neticDefsContent = readFile(path.join(DATA_DIR, 'netic_definitions.md'));
  if (neticDefsContent) opportunities.push(parseOpportunity('netic_definitions.md', neticDefsContent));

  // Compute matches
  const matches = [];
  for (const opp of opportunities) {
    const scored = allPeople.map(p => ({
      person: p.name,
      contact: p.contact,
      role: p.roleSection,
      score: computeMatch(p, opp)
    })).filter(s => s.score > 0).sort((a,b) => b.score - a.score);
    matches.push({ opportunity: opp.fileName, domain: opp.domain, topMatches: scored.slice(0, 5) });
  }

  // Output markdown summary
  let output = '# Netic Team-Opportunity Matcher Results\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  for (const m of matches) {
    output += `## ${m.opportunity} (${m.domain})\n\n`;
    if (m.topMatches.length === 0) {
      output += 'No strong matches found.\n\n';
    } else {
      output += '**Top matches:**\n\n';
      for (const match of m.topMatches) {
        output += `- **${match.person}** (${match.role}) — Score: ${match.score} — ${match.contact || 'no contact'}\n`;
      }
      output += '\n';
    }
  }

  const outPath = path.join(__dirname, `matches_${new Date().toISOString().slice(0,10)}.md`);
  fs.writeFileSync(outPath, output);
  console.log(`Wrote matches to ${outPath}`);
  console.log(output);
}

main();
