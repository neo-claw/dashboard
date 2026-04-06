# MCP Notes Server

A minimal Model Context Protocol (MCP) server that exposes local Google Drive notes (notes_drive/) as resources for any MCP-enabled LLM application.

## Problem
Neo needs easy access to structured context (thoughts, school notes, Netic docs) to make stronger decisions. Currently these notes live in markdown files; we need a standardized way for AI assistants to query them.

## Solution
Implement an MCP server that:
- Lists all markdown files in `notes_drive/` as resources
- Allows reading any file's content via URI
- Can be extended to add tools for search, summarization, etc.

## Usage
```bash
pip install mcp  # or: pip install modelcontextprotocol
python server.py
```

The server speaks MCP over stdio. Connect it to any MCP client (e.g., Claude Desktop, Cursor, or a custom agent).

## Roadmap
- Add resource templates for dynamic queries (e.g., filter by tag)
- Add a search tool using semantic lookup
- Integrate with Netic taxonomy for cross-referencing
