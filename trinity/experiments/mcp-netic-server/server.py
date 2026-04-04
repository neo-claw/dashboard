#!/usr/bin/env python3
"""
MCP Server for Netic internal data.
Exposes:
- Resources: employees (structured), notes (markdown files)
- Tools: search_employees(query) -> list matches
"""

import re
import sys
from pathlib import Path
from mcp import FastMCP

mcp = FastMCP("Netic Data Server")

# Data directory: look for Drive downloads in workspace root and also in trinity/experiments/mcp-netic-server/
WORKSPACE = Path(__file__).parent.parent.parent.parent
DRIVE_FILES = {
    "people": WORKSPACE / "drive_people.md",
    "found": WORKSPACE / "drive_found.md",
    "explore": WORKSPACE / "drive_explore.md",
    "hub": WORKSPACE / "drive_hub.md",
}

# Fallback: if files not found, use empty content
def read_file(path):
    try:
        return path.read_text()
    except Exception:
        return ""

# Parse employees into structured data
def parse_employees(text):
    employees = {"Engineering": [], "Operations": [], "Sales": [], "Design": []}
    current_dept = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Check if line is a department header (ends with colon or is just dept name)
        if line.endswith(":") or (line in ["Engineering", "Operations", "Sales", "Design"] and line[0].isupper()):
            dept = line.rstrip(":")
            if dept in employees:
                current_dept = dept
            else:
                current_dept = None
            continue
        # If we have a current_dept, try to parse "Name (phone)" pattern
        if current_dept:
            m = re.match(r"([^\d(]+?)\s*\(([^)]+)\)", line)
            if m:
                name = m.group(1).strip()
                phone = m.group(2).strip()
                employees[current_dept].append({"name": name, "phone": phone})
            else:
                # Could be a name without phone? just store raw
                employees[current_dept].append({"name": line, "phone": ""})
    return employees

# Load data at startup
PEOPLE_TEXT = read_file(DRIVE_FILES["people"])
EMPLOYEES = parse_employees(PEOPLE_TEXT)
NOTES = {key: read_file(path) for key, path in DRIVE_FILES.items()}

# Resource: employees structured
@mcp.resource("netic://employees")
def get_employees():
    """Return all employee records by department."""
    return EMPLOYEES

# Resource: employees by department
@mcp.resource("netic://employees/{dept}")
def get_employees_dept(dept: str):
    """Return employees for a specific department."""
    return EMPLOYEES.get(dept, [])

# Resources for notes
@mcp.resource("netic://notes/people")
def get_notes_people():
    return NOTES["people"]

@mcp.resource("netic://notes/found")
def get_notes_found():
    return NOTES["found"]

@mcp.resource("netic://notes/explore")
def get_notes_explore():
    return NOTES["explore"]

@mcp.resource("netic://notes/hub")
def get_notes_hub():
    return NOTES["hub"]

# Tool: search employees by name or partial match
@mcp.tool()
def search_employees(query: str) -> list:
    """
    Search employees by name (case-insensitive substring). Returns list of matches with department and phone.
    """
    q = query.lower()
    hits = []
    for dept, emps in EMPLOYEES.items():
        for emp in emps:
            if q in emp["name"].lower():
                hits.append({**emp, "department": dept})
    return hits

# Tool: list departments
@mcp.tool()
def list_departments() -> list:
    """Return list of all departments."""
    return list(EMPLOYEES.keys())

if __name__ == "__main__":
    mcp.run(transport="stdio")
