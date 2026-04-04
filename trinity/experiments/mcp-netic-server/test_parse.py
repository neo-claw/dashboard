#!/usr/bin/env python3
"""Quick test of parsing functions for MCP server."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from server import parse_employees, DRIVE_FILES, read_file

# Test parse_employees
sample = """Engineering
Theodore Klausner (415-683-9885)
Daniel Fleming (956-252-5720)

Operations
Brandy Loudermilk (360-621-2659)
"""

parsed = parse_employees(sample)
print("Parsed sample:", parsed)
assert "Engineering" in parsed
assert len(parsed["Engineering"]) == 2
assert parsed["Engineering"][0]["name"] == "Theodore Klausner"
print("Parse test OK")

# Test reading actual drive file
people_text = read_file(DRIVE_FILES["people"])
print(f"Loaded people.md length: {len(people_text)}")
employees = parse_employees(people_text)
print(f"Parsed {sum(len(v) for v in employees.values())} employees across {len(employees)} departments")
print("Departments:", list(employees.keys()))
print("All good!")
