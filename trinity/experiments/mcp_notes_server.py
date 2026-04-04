#!/usr/bin/env python3
"""
MCP Notes Server - exposes local markdown notes as MCP resources.
Minimal implementation using Python stdlib. Reads from trinity/notes_tmp.
"""

import sys
import json
import os
from pathlib import Path

# Resolve workspace root (assume script is in experiments/ under workspace)
WORKSPACE = Path(__file__).resolve().parent.parent.parent
NOTES_DIR = WORKSPACE / "trinity" / "notes_tmp"

if not NOTES_DIR.is_dir():
    # Fallback: try relative to cwd
    NOTES_DIR = Path.cwd() / "trinity" / "notes_tmp"
    if not NOTES_DIR.is_dir():
        sys.stderr.write(f"Notes directory not found: {NOTES_DIR}\n")
        sys.exit(1)

# Build static resource list
RESOURCES = []
for file_path in NOTES_DIR.glob("*.md"):
    filename = file_path.name
    uri = f"notes://{filename}"
    RESOURCES.append({
        "uri": uri,
        "name": filename,
        "mimeType": "text/markdown",
        "description": f"Note from {filename}"
    })

# Load knowledge graph data if available
GRAPH_DATA = None
try:
    GRAPH_JSON = Path(__file__).resolve().parent / "notes_graph.json"
    if GRAPH_JSON.exists():
        with open(GRAPH_JSON, 'r', encoding='utf-8') as jf:
            GRAPH_DATA = json.load(jf)
except Exception as e:
    sys.stderr.write(f"Failed to load graph data: {e}\n")

def handle_initialize(req_id):
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "protocolVersion": "2025-03-26",
            "capabilities": {
                "resources": {
                    "list": True,
                    "read": True
                },
                "tools": {
                    "list": True,
                    "call": True
                }
            },
            "serverInfo": {
                "name": "trinity-notes-server",
                "version": "0.2.0"
            }
        }
    }

def handle_resources_list(req_id):
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "resources": RESOURCES
        }
    }

def handle_resources_read(req_id, params):
    uri = params.get("uri", "")
    filename = uri.split("://")[-1] if "://" in uri else uri
    file_path = NOTES_DIR / filename
    if not file_path.is_file():
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32602, "message": f"Resource not found: {uri}"}
        }
    try:
        content = file_path.read_text(encoding="utf-8")
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "text/markdown",
                        "text": content
                    }
                ]
            }
        }
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32603, "message": str(e)}
        }

def handle_tools_list(req_id):
    tools = [
        {
            "name": "list_notes",
            "description": "Returns a comma-separated list of available note filenames"
        },
        {
            "name": "search_notes",
            "description": "Search all notes for a given query string (case-insensitive). Returns matching filenames and occurrence count. Arguments: query (string, required)."
        },
        {
            "name": "graph_query",
            "description": "Query the notes knowledge graph. Actions: list (list all nodes), neighbors (get connected nodes by id), search (find nodes by title/file substring). Arguments: action (str), id (for neighbors), query (for search)."
        }
    ]
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "tools": tools
        }
    }

def handle_tools_call(req_id, params):
    tool_name = params.get("name", "")
    arguments = params.get("arguments", {})
    if tool_name == "list_notes":
        names = [r["name"] for r in RESOURCES]
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": ", ".join(names)
                    }
                ]
            }
        }
    elif tool_name == "search_notes":
        query = arguments.get("query", "").strip()
        if not query:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": "Missing required argument 'query' for search_notes"}
            }
        q_lower = query.lower()
        matches = []
        for file_path in NOTES_DIR.glob("*.md"):
            try:
                content = file_path.read_text(encoding='utf-8')
                count = content.lower().count(q_lower)
                if count > 0:
                    matches.append(f"{file_path.name}: {count} occurrence(s)")
            except Exception:
                continue
        text = "\n".join(matches) if matches else "No matches found."
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [{"type": "text", "text": text}]
            }
        }
    elif tool_name == "graph_query":
        action = arguments.get("action", "")
        if not action:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": "Missing required argument 'action' for graph_query"}
            }
        if GRAPH_DATA is None:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32603, "message": "Graph data not available. Run markdown_graph.py first."}
            }
        if action == "list":
            nodes = GRAPH_DATA.get("nodes", [])
            lines = [f"{n['id']}: {n.get('title','(no title)')} ({n.get('file','')})" for n in nodes]
            text = "\n".join(lines) if lines else "No nodes in graph."
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text}]
                }
            }
        elif action == "neighbors":
            node_id = arguments.get("id", "")
            if not node_id:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": "Missing 'id' argument for neighbors action"}
                }
            node_ids = {n["id"] for n in GRAPH_DATA.get("nodes", [])}
            if node_id not in node_ids:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": f"Node '{node_id}' not found in graph"}
                }
            neighbors = set()
            for link in GRAPH_DATA.get("links", []):
                if link["source"] == node_id:
                    neighbors.add(link["target"])
                if link["target"] == node_id:
                    neighbors.add(link["source"])
            lines = sorted(neighbors)
            text = "\n".join(lines) if lines else "No neighbors found."
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text}]
                }
            }
        elif action == "search":
            query = arguments.get("query", "")
            if not query:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": "Missing 'query' argument for search action"}
                }
            q = query.lower()
            matches = []
            for n in GRAPH_DATA.get("nodes", []):
                title = n.get("title", "").lower()
                file = n.get("file", "").lower()
                if q in title or q in file:
                    matches.append(f"{n['id']}: {n.get('title','')} ({n.get('file','')})")
            text = "\n".join(matches) if matches else "No matches found."
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text}]
                }
            }
        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": f"Unknown action '{action}' for graph_query. Supported: list, neighbors, search"}
            }
    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
        }

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        req_id = req.get("id")
        method = req.get("method", "")
        params = req.get("params", {})

        if method == "initialize":
            resp = handle_initialize(req_id)
        elif method == "resources/list":
            resp = handle_resources_list(req_id)
        elif method == "resources/read":
            resp = handle_resources_read(req_id, params)
        elif method == "tools/list":
            resp = handle_tools_list(req_id)
        elif method == "tools/call":
            resp = handle_tools_call(req_id, params)
        else:
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }
        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()