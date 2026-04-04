#!/usr/bin/env python3
"""
gws_wrapper: A lightweight Python wrapper for the Google Workspace CLI (gws).

Provides simple functions to interact with Drive, Gmail, Calendar via subprocess.
handles JSON serialization, output parsing, and file downloads.

Currently supports:
- drive_list(page_size, order_by) -> list of file dicts
- drive_get(file_id) -> content as bytes (for binary/text)
- drive_export(file_id, mime_type) -> content as bytes

Error handling: raises RuntimeError on failure.
"""

import json
import subprocess
import tempfile
import os
from typing import Any, Dict, List, Optional


class GWSWrapper:
    def __init__(self):
        self._check_gws()

    def _check_gws(self):
        try:
            subprocess.run(["gws", "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("gws CLI not found or not working")

    def _run_gws(self, service: str, resource: str, method: str,
                 params: Optional[Dict[str, Any]] = None,
                 output_path: Optional[str] = None) -> subprocess.CompletedProcess:
        cmd = ["gws", service, resource, method]
        if params:
            cmd += ["--params", json.dumps(params)]
        if output_path:
            cmd += ["--output", output_path]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return result
        except subprocess.CalledProcessError as e:
            msg = e.stderr if e.stderr else str(e)
            raise RuntimeError(f"gws command failed: {msg}") from e

    def drive_list(self, page_size: int = 100, order_by: Optional[str] = None) -> List[Dict]:
        params = {"pageSize": page_size}
        if order_by:
            params["orderBy"] = order_by
        result = self._run_gws("drive", "files", "list", params=params)
        data = json.loads(result.stdout)
        # The response may include non-file entries? Usually it's {"files": [...]}
        files = data.get("files", [])
        return files

    def drive_get(self, file_id: str) -> bytes:
        """
        Download a file's binary content using alt=media.
        Returns raw bytes.
        """
        with tempfile.NamedTemporaryFile(delete=False, dir='.') as tmp:
            tmp_path = tmp.name
        try:
            params = {"fileId": file_id, "alt": "media"}
            self._run_gws("drive", "files", "get", params=params, output_path=tmp_path)
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def drive_export(self, file_id: str, mime_type: str = "text/plain") -> bytes:
        """
        Export a Google Docs editor file to the specified MIME type.
        Returns raw bytes.
        """
        with tempfile.NamedTemporaryFile(delete=False, dir='.') as tmp:
            tmp_path = tmp.name
        try:
            params = {"fileId": file_id, "mimeType": mime_type}
            self._run_gws("drive", "files", "export", params=params, output_path=tmp_path)
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


def main():
    """Simple test demo."""
    import sys
    if len(sys.argv) < 2:
        print("Usage: gws_wrapper.py <command> [args...]")
        sys.exit(1)
    cmd = sys.argv[1]
    wrapper = GWSWrapper()
    if cmd == "list":
        page_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        files = wrapper.drive_list(page_size=page_size)
        print(json.dumps(files, indent=2))
    elif cmd == "get":
        if len(sys.argv) < 3:
            print("get requires file_id")
            sys.exit(1)
        file_id = sys.argv[2]
        content = wrapper.drive_get(file_id)
        # Write to stdout as binary
        sys.stdout.buffer.write(content)
    elif cmd == "export":
        if len(sys.argv) < 3:
            print("export requires file_id")
            sys.exit(1)
        file_id = sys.argv[2]
        mime = sys.argv[3] if len(sys.argv) > 3 else "text/plain"
        content = wrapper.drive_export(file_id, mime)
        sys.stdout.buffer.write(content)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
