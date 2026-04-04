/**
 * LeadLink Matcher - Prototype
 * Matches Salesforce Leads to Appointments based on phone, email, and name similarity.
 *
 * Usage:
 *   node matcher.js [--demo] [--output report.md]
 *
 * If --demo is provided, uses sample data. Otherwise requires Salesforce credentials via env:
 *   SALESFORCE_INSTANCE_URL (e.g., https://company.my.salesforce.com)
 *   SALESFORCE_CLIENT_ID
 *   SALESFORCE_CLIENT_SECRET
 *   SALESFORCE_LEAD_QUERY (SOQL, default: 'SELECT Id, FirstName, LastName, Email, Phone FROM Lead')
 *   SALESFORCE_APPOINTMENT_QUERY (SOQL default: 'SELECT Id, ContactId, Contact.Name, Contact.Email, Contact.Phone FROM Appointment WHERE ContactId != null')
 *
 * Note: For appointments, we assume Contact relationships. Adjust query as needed.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Simple Levenshtein distance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase();
}

function fullName(contact) {
  const first = contact.FirstName || contact.Contact?.FirstName || '';
  const last = contact.LastName || contact.Contact?.LastName || '';
  return `${first} ${last}`.trim();
}

// Mock data for demo
const mockLeads = [
  { Id: 'L1', FirstName: 'John', LastName: 'Doe', Email: 'john.doe@example.com', Phone: '123-456-7890' },
  { Id: 'L2', FirstName: 'Jane', LastName: 'Smith', Email: 'jane.smith@example.com', Phone: '555-123-4567' },
  { Id: 'L3', FirstName: 'Alice', LastName: 'Johnson', Email: 'alice.j@example.com', Phone: '999-888-7777' },
];

const mockAppointments = [
  { Id: 'A1', Contact: { ContactId: 'C1', Name: 'John Doe', Email: 'john.doe@example.com', Phone: '1234567890' } },
  { Id: 'A2', Contact: { ContactId: 'C2', Name: 'Jane Smith', Email: 'jane.smith@example.com', Phone: '5551234567' } },
  { Id: 'A3', Contact: { ContactId: 'C3', Name: 'Bob Brown', Email: 'bob@example.com', Phone: '111-222-3333' } },
];

async function fetchFromSalesforce(query) {
  // Simplified: Get OAuth token using client credentials (JWT flow not implemented for brevity)
  // This is just a placeholder to show intent.
  throw new Error('Salesforce integration not implemented in prototype. Use --demo to see matching logic.');
}

async function runDemo() {
  console.log('Running in demo mode with sample data...');
  const leads = mockLeads;
  const appointments = mockAppointments;

  const matches = performMatching(leads, appointments);
  generateReport(leads, appointments, matches);
}

function performMatching(leads, appointments) {
  const matches = [];

  // Build lookup maps
  const apptByPhone = new Map();
  const apptByEmail = new Map();
  const remainingAppts = new Set(appointments.map(a => a.Id));

  for (const appt of appointments) {
    const contact = appt.Contact || appt;
    const phone = normalizePhone(contact.Phone);
    const email = normalizeEmail(contact.Email);
    if (phone) apptByPhone.set(phone, appt);
    if (email) apptByEmail.set(email, appt);
  }

  for (const lead of leads) {
    const phone = normalizePhone(lead.Phone);
    const email = normalizeEmail(lead.Email);
    const name = normalizeName(fullName(lead));

    // Try phone match
    let match = null;
    if (phone && apptByPhone.has(phone)) {
      match = apptByPhone.get(phone);
    } else if (email && apptByEmail.has(email)) {
      match = apptByEmail.get(email);
    } else {
      // Name similarity fallback
      let best = null;
      let bestScore = 0;
      for (const appt of appointments) {
        if (!remainingAppts.has(appt.Id)) continue;
        const apptContact = appt.Contact || appt;
        const apptName = normalizeName(fullName(apptContact));
        const score = similarity(name, apptName);
        if (score > bestScore && score >= 0.8) {
          bestScore = score;
          best = appt;
        }
      }
      if (best) match = best;
    }

    if (match) {
      matches.push({ lead, appointment: match, method: match.Contact ? 'phone/email/name' : 'phone/email' });
      remainingAppts.delete(match.Id);
    }
  }

  return matches;
}

function generateReport(leads, appointments, matches) {
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const reportPath = path.join(__dirname, `report_${timestamp}.md`);
  const jsonPath = path.join(__dirname, `matches_${timestamp}.json`);

  let md = `# LeadLink Matcher Report\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- Total Leads: ${leads.length}\n`;
  md += `- Total Appointments: ${appointments.length}\n`;
  md += `- Matches Found: ${matches.length}\n\n`;
  md += `## Matches\n\n`;
  md += `| Lead ID | Lead Name | Appointment ID | Contact Name | Match Method |\n`;
  md += `|---------|-----------|----------------|--------------|--------------|\n`;
  for (const m of matches) {
    const leadName = fullName(m.lead);
    const apptContact = m.appointment.Contact || m.appointment;
    const apptName = fullName(apptContact);
    md += `| ${m.lead.Id} | ${leadName} | ${m.appointment.Id} | ${apptName} | ${m.method} |\n`;
  }
  md += `\n## Unmatched Leads\n\n`;
  const matchedLeadIds = new Set(matches.map(m => m.lead.Id));
  const unmatchedLeads = leads.filter(l => !matchedLeadIds.has(l.Id));
  if (unmatchedLeads.length) {
    md += `| Lead ID | Lead Name |\n`;
    md += `|---------|-----------|\n`;
    for (const l of unmatchedLeads) {
      md += `| ${l.Id} | ${fullName(l)} |\n`;
    }
  } else {
    md += `All leads matched.\n`;
  }

  fs.writeFileSync(reportPath, md);
  console.log(`Report written to ${reportPath}`);

  // JSON output for further processing
  const jsonMatches = matches.map(m => ({
    leadId: m.lead.Id,
    leadName: fullName(m.lead),
    appointmentId: m.appointment.Id,
    contactName: fullName(m.appointment.Contact || m.appointment),
    method: m.method
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(jsonMatches, null, 2));
  console.log(`JSON matches written to ${jsonPath}`);
}

// Main
const args = process.argv.slice(2);
if (args.includes('--demo')) {
  runDemo().catch(console.error);
} else {
  // Real mode: load from Salesforce
  const leadsQuery = process.env.SALESFORCE_LEAD_QUERY || 'SELECT Id, FirstName, LastName, Email, Phone FROM Lead';
  const apptQuery = process.env.SALESFORCE_APPOINTMENT_QUERY || 'SELECT Id, ContactId, Contact.Name, Contact.Email, Contact.Phone FROM Appointment WHERE ContactId != null';

  console.log('Real mode: Salesforce integration not yet implemented. Use --demo to test matching logic.');
  // Placeholder: in a full implementation, we would:
  // 1. Obtain OAuth token via client credentials or JWT.
  // 2. Query leads and appointments.
  // 3. Perform matching.
  // 4. Generate report.
}