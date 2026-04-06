#!/usr/bin/env python3
"""
Minimal MCP server exposing notes_drive/ markdown files.
"""
import os
import asyncio
from pathlib import Path
from mcp import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    InitializationOptions,
    # Maybe not all needed
)

NOTES_DIR = Path(__file__).parent.parent.parent / "notes_drive"
if not NOTES_DIR.exists():
    raise FileNotFoundError(f"Notes directory not found: {NOTES_DIR}")

class NotesServer:
    async def list_resources(self) -> list[Resource]:
        resources = []
        for file_path in NOTES_DIR.glob("*.md"):
            uri = f"file://{file_path}"
            name = file_path.name
            description = f"Note: {name}"
            mime_type = "text/markdown"
            resources.append(Resource(uri=uri, name=name, description=description, mime_type=mime_type))
        return resources

    async def read_resource(self, uri: str) -> str:
        # Expect file:// path
        if uri.startswith("file://"):
            path = Path(uri[7:])
        else:
            path = Path(uri)
        if not path.exists():
            raise FileNotFoundError(f"Resource not found: {path}")
        return path.read_text()

    async def list_tools(self) -> list[Tool]:
        # No tools for now
        return []

    async def call_tool(self, name: str, arguments: dict) -> list[TextContent]:
        return []

    def get_capability_sources(self):
        # The Server base class may call this; we can just return empty dict
        return {}

async def main():
    server = NotesServer()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="notes-server",
                server_version="0.1.0",
                capabilities=server.get_capability_sources(),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
