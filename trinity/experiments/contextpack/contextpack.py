#!/usr/bin/env python3
"""
ContextPack - Package and transfer agent context.
Utility: Allows archiving and transferring conversation history, memories, and notes between AI agent sessions.
Score: 7/10
"""

import os
import json
import base64
import sys
from datetime import datetime
from pathlib import Path

def pack(source_dir, output_file):
    """Pack directory contents into a JSON archive."""
    source = Path(source_dir).resolve()
    if not source.exists():
        print(f"Error: Source directory {source_dir} does not exist")
        sys.exit(1)

    archive = {
        "meta": {
            "tool": "contextpack",
            "version": "0.1.0",
            "created": datetime.utcnow().isoformat() + "Z",
            "source": str(source)
        },
        "files": {}
    }

    for file_path in source.rglob("*"):
        if file_path.is_file():
            # Store relative path
            rel_path = file_path.relative_to(source)
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                    # Encode binary data as base64 for safety in JSON
                    encoded = base64.b64encode(content).decode("utf-8")
                    archive["files"][str(rel_path)] = {
                        "content_b64": encoded,
                        "size": len(content),
                        "modified": datetime.utcfromtimestamp(file_path.stat().st_mtime).isoformat() + "Z"
                    }
            except Exception as e:
                print(f"Warning: Skipping {file_path}: {e}")

    with open(output_file, "w") as out:
        json.dump(archive, out, indent=2)
    print(f"Packed {len(archive['files'])} files from {source_dir} into {output_file}")

def unpack(input_file, dest_dir):
    """Unpack a JSON archive into destination directory."""
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_file} not found")
        sys.exit(1)

    with open(input_path, "r") as f:
        archive = json.load(f)

    dest = Path(dest_dir).resolve()
    dest.mkdir(parents=True, exist_ok=True)

    for rel_path, info in archive["files"].items():
        target = dest / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        content_b64 = info["content_b64"]
        content = base64.b64decode(content_b64)
        with open(target, "wb") as out:
            out.write(content)
        # Preserve modification time if available
        if "modified" in info:
            # Could set file mtime, but skip for simplicity
            pass

    print(f"Unpacked {len(archive['files'])} files into {dest_dir}")

def main():
    if len(sys.argv) < 3:
        print("Usage: contextpack pack <source_dir> <output_file>")
        print("   or: contextpack unpack <input_file> <dest_dir>")
        sys.exit(1)

    command = sys.argv[1]
    if command == "pack":
        pack(sys.argv[2], sys.argv[3])
    elif command == "unpack":
        unpack(sys.argv[2], sys.argv[3])
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
