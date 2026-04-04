#!/usr/bin/env python3
"""
Markdown Knowledge Graph Builder

Scans a directory for .md files, extracts internal links, and generates
an interactive force-directed graph as HTML using D3.js.
"""

import os
import re
import json
import urllib.parse
from pathlib import Path

# Configuration
NOTES_ROOT = Path.home() / ".openclaw" / "workspace"
OUTPUT_HTML = Path("trinity/experiments/notes_graph.html")

# Regex patterns
WIKI_LINK_RE = re.compile(r'\[\[([^\]]+?)\]\]')
MARKDOWN_LINK_RE = re.compile(r'\[[^\]]*\]\(([^)]+)\)')
OBSIDIAN_LINK_RE = re.compile(r'obsidian://open\?[^#]*file=([^&]+)')

def normalize_name(name):
    """Convert a filename or title to a simple node ID."""
    name = name.lower()
    name = name.replace('.md', '')
    name = name.replace('_', ' ')
    name = name.strip()
    return name

def get_file_title(filepath):
    """Extract the first H1 heading from a markdown file, or fallback to filename."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('# '):
                    return line[2:].strip()
    except Exception:
        pass
    return filepath.stem

def extract_links(content):
    """Extract internal link targets from markdown content."""
    links = []

    # Wiki links [[target]] or [[target|display]]
    for m in WIKI_LINK_RE.finditer(content):
        target = m.group(1).split('|')[0].strip()
        links.append(target)

    # Markdown links [text](url)
    for m in MARKDOWN_LINK_RE.finditer(content):
        url = m.group(1)
        # Skip external URLs (http, https, ftp, mailto)
        if re.match(r'^(https?|ftp|mailto):', url, re.I):
            continue
        # Decode URL encoding
        url = urllib.parse.unquote(url)
        # Remove fragment
        if '#' in url:
            url = url.split('#')[0]
        links.append(url)

    # Obsidian URI: obsidian://open?...&file=...
    for m in OBSIDIAN_LINK_RE.finditer(content):
        file_param = m.group(1)
        file_param = urllib.parse.unquote(file_param)
        links.append(file_param)

    return links

def main():
    nodes = {}
    edges = []

    # First pass: collect all markdown files and create nodes
    md_files = []
    for root, dirs, files in os.walk(NOTES_ROOT):
        # Skip hidden directories like .git
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for f in files:
            if f.lower().endswith('.md'):
                fp = Path(root) / f
                md_files.append(fp)

    # Map of normalized name -> node data (for matching links)
    name_to_node = {}

    for fp in md_files:
        title = get_file_title(fp)
        # Node ID is the filename without extension, lowercased
        node_id = normalize_name(fp.stem)
        # If multiple files have same stem (unlikely), differentiate by folder?
        # For simplicity, keep first.
        if node_id not in nodes:
            nodes[node_id] = {
                'id': node_id,
                'title': title,
                'file': str(fp.relative_to(NOTES_ROOT))
            }
            name_to_node[node_id] = node_id
        # Also map by title? Not needed.

    # Second pass: extract links and create edges
    for fp in md_files:
        source_id = normalize_name(fp.stem)
        try:
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {fp}: {e}")
            continue

        raw_links = extract_links(content)
        for raw in raw_links:
            # Clean target: remove any leading ./ or ../, remove trailing slash
            target = raw.strip().lstrip('./').rstrip('/')
            # If target includes a path, take the last component as the node id
            target_name = Path(target).stem if '.' in Path(target).name else target
            target_id = normalize_name(target_name)

            # Check if target_id exists in nodes
            if target_id in nodes and target_id != source_id:
                edges.append({'source': source_id, 'target': target_id})

    # Remove duplicate edges
    edge_set = set()
    unique_edges = []
    for e in edges:
        # Ensure undirected? Use tuple sorted
        pair = tuple(sorted((e['source'], e['target'])))
        if pair not in edge_set:
            edge_set.add(pair)
            unique_edges.append(e)

    # Prepare data for D3
    graph_data = {
        'nodes': list(nodes.values()),
        'links': unique_edges
    }

    # Generate HTML
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Notes Knowledge Graph</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  body {{ margin: 0; overflow: hidden; }}
  .links line {{ stroke: #999; stroke-opacity: 0.6; }}
  .nodes circle {{ stroke: #fff; stroke-width: 1.5px; }}
  .node-label {{ font: 12px sans-serif; pointer-events: none; }}
</style>
</head>
<body>
<svg width="100%" height="100%"></svg>
<script>
const graph = {json.dumps(graph_data, indent=2)};

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
    .attr("viewBox", [0, 0, width, height]);

// Build simulation
const simulation = d3.forceSimulation(graph.nodes)
    .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(30));

// Draw links
const link = svg.append("g")
    .attr("class", "links")
  .selectAll("line")
  .data(graph.links)
  .join("line")
    .attr("stroke-width", 1);

// Draw nodes
const node = svg.append("g")
    .attr("class", "nodes")
  .selectAll("circle")
  .data(graph.nodes)
  .join("circle")
    .attr("r", 8)
    .attr("fill", "#69b3a2")
    .call(drag(simulation));

// Labels
const label = svg.append("g")
    .attr("class", "node-labels")
  .selectAll("text")
  .data(graph.nodes)
  .join("text")
    .text(d => d.title || d.id)
    .attr("dx", 12)
    .attr("dy", 4)
    .attr("class", "node-label");

simulation.on("tick", () => {{
  link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
  node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
}});

function drag(simulation) {{
  function dragstarted(event) {{
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }}
  function dragged(event) {{
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }}
  function dragended(event) {{
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }}
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}}
</script>
</body>
</html>
"""

    # Ensure output directory exists
    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_template)

    # Also export raw graph data as JSON for programmatic access
    json_path = OUTPUT_HTML.with_suffix('.json')
    with open(json_path, 'w', encoding='utf-8') as jf:
        json.dump(graph_data, jf, indent=2)

    print(f"Generated graph with {len(nodes)} nodes and {len(unique_edges)} edges.")
    print(f"HTML output: {OUTPUT_HTML}")
    print(f"JSON output: {json_path}")

if __name__ == "__main__":
    main()
