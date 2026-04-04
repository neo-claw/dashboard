/**
 * Taxonomy Parser: Parse and generate markdown tables for Netic call classification.
 * Used by the interactive editor and test suite.
 */

function parseMarkdownTable(md) {
  const lines = md.split('\n').map(l => l.trim()).filter(l => l);
  // Find the start of the table: first line starting with '|'
  let startIdx = lines.findIndex(l => l.startsWith('|'));
  if (startIdx === -1) return { headers: [], rows: [] };

  // Header row is at startIdx
  const headerLine = lines[startIdx];
  // Next line is separator (e.g., | --- | --- |)
  const separatorLine = lines[startIdx + 1];
  // Data rows start at startIdx + 2 until a line that doesn't start with '|'
  const dataLines = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    if (!lines[i].startsWith('|')) break;
    dataLines.push(lines[i]);
  }

  // Split header cells
  const headers = splitRow(headerLine);
  // We don't currently use separator
  const rows = dataLines.map(line => splitRow(line));
  return { headers, rows };
}

function splitRow(row) {
  // Remove leading/trailing '|' and split by '|'
  const trimmed = row.replace(/^\|/, '').replace(/\|$/, '');
  const cells = trimmed.split('|').map(cell => cell.trim());
  return cells;
}

function generateMarkdownTable(headers, rows) {
  function buildRow(cells) {
    return '| ' + cells.map(c => c).join(' | ') + ' |';
  }

  const headerRow = buildRow(headers);
  const separatorRow = '|' + headers.map(() => '---').join('|') + '|';
  const dataRows = rows.map(buildRow);
  return [headerRow, separatorRow, ...dataRows].join('\n');
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMarkdownTable, generateMarkdownTable };
}
