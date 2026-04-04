#!/usr/bin/env node
/**
 * Neo Network Assistant (NNA)
 * A CLI tool for managing contacts and generating outreach suggestions.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const INTERACTIONS_FILE = path.join(__dirname, 'interactions.json');

// Load contacts from JSON
function loadContacts() {
  if (!fs.existsSync(CONTACTS_FILE)) {
    console.error('Contacts database not found. Run import first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
}

// Load interactions
function loadInteractions() {
  if (!fs.existsSync(INTERACTIONS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(INTERACTIONS_FILE, 'utf8'));
}

// Save interactions
function saveInteractions(interactions) {
  fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify(interactions, null, 2));
}

// List all contacts
function listContacts(contacts) {
  console.log('Neo Network Contacts:\n');
  for (const cat of Object.keys(contacts)) {
    console.log(`=== ${cat.toUpperCase()} ===`);
    for (const person of contacts[cat]) {
      const name = person.name || person;
      const role = person.role ? ` - ${person.role}` : '';
      console.log(`  • ${name}${role}`);
    }
    console.log('');
  }
}

// Search contacts
function searchContacts(contacts, pattern) {
  const lower = pattern.toLowerCase();
  const results = [];
  for (const cat of Object.keys(contacts)) {
    for (const person of contacts[cat]) {
      const name = typeof person === 'string' ? person : person.name;
      if (name.toLowerCase().includes(lower)) {
        results.push({ category: cat, ...person, name });
      }
    }
  }
  return results;
}

// Show detailed info
function showInfo(person) {
  console.log(`Name: ${person.name || person}`);
  if (person.role) console.log(`Role: ${person.role}`);
  if (person.company) console.log(`Company: ${person.company}`);
  if (person.email) console.log(`Email: ${person.email}`);
  if (person.notes) console.log(`Notes: ${person.notes}`);
}

// Generate suggestion (rule-based)
function suggestOutreach(person, interactions) {
  console.log(`\nOutreach suggestion for ${person.name || person}:`);
  // Check last interaction
  const key = person.name || person;
  const last = interactions[key] ? new Date(interactions[key].last) : null;
  const daysAgo = last ? (Date.now() - last) / (1000 * 60 * 60 * 24) : null;

  if (daysAgo && daysAgo < 30) {
    console.log(`You reached out recently (${Math.round(daysAgo)} days ago). Consider waiting a bit longer.`);
  } else if (daysAgo) {
    console.log(`It's been ${Math.round(daysAgo)} days since last contact. A friendly check-in would be appropriate.`);
  } else {
    console.log('No record of previous contact. This could be a warm introduction if you have a mutual connection.');
  }

  // Simple template based on category
  const templates = {
    vcs: `I'm exploring the AI/robotics space and would love to hear your perspective on the market. Are you open to a brief chat next week?`,
    engineers: `I came across your work and am impressed. I'm building tools for data analytics and would love to exchange ideas.`,
    designers: `Your design aesthetic caught my eye. I'm working on a new project and would value your feedback.`,
    cofounders: `As a fellow founder, I think there might be synergies between our ventures. Would you be up for a virtual coffee?`,
    generalists: `I admire your multidisciplinary approach. I'm exploring new ventures and would love to learn from your experience.`
  };

  const category = person.category || 'generalists';
  const template = templates[category] || templates.generalists;
  console.log('\nSuggested message:');
  console.log(`  Subject: Reconnecting / Introduction\n  ${template}`);
}

// Log an interaction
function logInteraction(interactions, name) {
  const key = name;
  interactions[key] = {
    last: new Date().toISOString(),
    count: (interactions[key] ? interactions[key].count : 0) + 1
  };
  saveInteractions(interactions);
  console.log(`Recorded interaction with ${name}.`);
}

// Command-line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    const contacts = loadContacts();
    const interactions = loadInteractions();

    if (!command || command === 'list') {
      listContacts(contacts);
      process.exit(0);
    }

    if (command === 'search' && args[1]) {
      const results = searchContacts(contacts, args[1]);
      if (results.length === 0) {
        console.log('No contacts found.');
      } else {
        console.log(`Found ${results.length} contact(s):\n`);
        for (const p of results) {
          console.log(`- ${p.name} (${p.category})${p.role ? ` - ${p.role}` : ''}`);
        }
      }
      process.exit(0);
    }

    if (command === 'info' && args[1]) {
      const results = searchContacts(contacts, args[1]);
      if (results.length === 0) {
        console.log('Contact not found.');
      } else {
        // If multiple, list them; else show info
        if (results.length > 1) {
          console.log('Multiple matches:');
          for (const p of results) {
            console.log(`- ${p.name} (${p.category})`);
          }
        } else {
          showInfo(results[0]);
        }
      }
      process.exit(0);
    }

    if (command === 'suggest' && args[1]) {
      const results = searchContacts(contacts, args[1]);
      if (results.length === 0) {
        console.log('Contact not found.');
      } else if (results.length > 1) {
        console.log('Multiple matches. Please be more specific:');
        for (const p of results) {
          console.log(`- ${p.name} (${p.category})`);
        }
      } else {
        suggestOutreach(results[0], interactions);
        // Ask if user wants to log interaction
        rl.question('\nLog this interaction? (y/n): ', (ans) => {
          if (ans.toLowerCase() === 'y') {
            logInteraction(interactions, results[0].name || results[0]);
          }
          rl.close();
        });
      }
      return;
    }

    if (command === 'remind') {
      const cutoffDays = parseFloat(args[1]) || 90;
      const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
      console.log(`Contacts not contacted in the last ${cutoffDays} days:\n`);
      for (const [name, data] of Object.entries(interactions)) {
        const last = new Date(data.last).getTime();
        if (last < cutoff) {
          const daysAgo = Math.round((Date.now() - last) / (1000 * 60 * 60 * 24));
          // Find category and role
          let cat = null, role = '';
          for (const c of Object.keys(contacts)) {
            const person = contacts[c].find(p => (p.name || p) === name);
            if (person) {
              cat = c;
              role = person.role || '';
              break;
            }
          }
          console.log(`- ${name}${role ? ` (${role})` : ''} - last: ${daysAgo} days ago${cat ? ` [${cat}]` : ''}`);
        }
      }
      process.exit(0);
    }

    console.log(`
Neo Network Assistant (NNA)
Commands:
  list                List all contacts
  search <pattern>    Search contacts by name
  info <name>         Show details for a contact
  suggest <name>      Generate an outreach suggestion
  remind [days]       Show contacts not contacted in N days (default 90)
    `);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadContacts, loadInteractions };
