#!/usr/bin/env python3
"""
Test script for gws_wrapper.
Fetches the research glossary markdown file from Drive and prints the first 30 lines.
"""

import sys
import os

# Add the wrapper directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gws_wrapper import GWSWrapper

def main():
    # File ID from earlier exploration
    glossary_id = "1dudducwjJeDHfSd4rJEJuTH5UfUsfD8V"
    wrapper = GWSWrapper()
    print("Downloading research glossary...")
    content = wrapper.drive_get(glossary_id)
    text = content.decode('utf-8', errors='replace')
    lines = text.splitlines()
    print(f"Total lines: {len(lines)}")
    print("\n--- First 30 lines ---")
    for i, line in enumerate(lines[:30], 1):
        print(f"{i:3}: {line}")

if __name__ == "__main__":
    main()
