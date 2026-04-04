#!/usr/bin/env python3
"""
Knowledge Graph integration for OpenClaw agents.
Uses SQLite directly (GrafitoDB-style schema) with simple Cypher-like queries.
"""

import os
import sqlite3
import json
import re
from pathlib import Path

class KnowledgeGraph:
    def __init__(self, db_path="kg.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            properties TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            src_id INTEGER NOT NULL,
            dst_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            properties TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(src_id) REFERENCES nodes(id),
            FOREIGN KEY(dst_id) REFERENCES nodes(id)
        )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_nodes_label ON nodes(label)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id)")
        self.conn.commit()

    def add_node(self, label: str, properties: dict) -> int:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO nodes (label, properties) VALUES (?, ?)",
            (label, json.dumps(properties))
        )
        self.conn.commit()
        return cur.lastrowid

    def add_edge(self, src_id: int, dst_id: int, type: str, properties: dict = None) -> int:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO edges (src_id, dst_id, type, properties) VALUES (?, ?, ?, ?)",
            (src_id, dst_id, type, json.dumps(properties) if properties else None)
        )
        self.conn.commit()
        return cur.lastrowid

    def find_nodes(self, label: str, **filters) -> list:
        cur = self.conn.cursor()
        cur.execute("SELECT id, label, properties FROM nodes WHERE label = ?", (label,))
        results = []
        for nid, lbl, props_json in cur.fetchall():
            props = json.loads(props_json)
            match = True
            for k, v in filters.items():
                if props.get(k) != v:
                    match = False
                    break
            if match:
                results.append({"id": nid, "label": lbl, "properties": props})
        return results

    def query(self, cypher_like: str) -> list:
        """
        Parse: MATCH (alias:Label {prop:'value'})-[:TYPE]->(alias2:Label2 {prop:'value'})
        """
        src_match = re.search(r'\((\w+):(\w+)(?:\s*\{([^}]+)\})?\)', cypher_like)
        edge_match = re.search(r'-\[:([^\]]+)\]->', cypher_like)
        dst_match = re.search(r'->\s*\((\w+):(\w+)(?:\s*\{([^}]+)\})?\)', cypher_like)

        if not (src_match and edge_match and dst_match):
            raise ValueError(f"Could not parse query: {cypher_like}")

        src_label = src_match.group(2)
        src_props_str = src_match.group(3)
        edge_type = edge_match.group(1)
        dst_label = dst_match.group(2)
        dst_props_str = dst_match.group(3)

        src_props = {}
        if src_props_str:
            for kv in src_props_str.split(','):
                k, v = kv.strip().split(':')
                src_props[k.strip()] = v.strip().strip("'\"")

        src_nodes = self.find_nodes(src_label, **src_props)
        if not src_nodes:
            return []

        cur = self.conn.cursor()
        results = []
        for src in src_nodes:
            cur.execute("""
            SELECT e.id, e.type, e.properties, n2.id, n2.label, n2.properties
            FROM edges e
            JOIN nodes n2 ON e.dst_id = n2.id
            WHERE e.src_id = ? AND e.type = ?
            """, (src["id"], edge_type))
            for eid, etype, eprops_json, nid, n2_label, n2_props_json in cur.fetchall():
                n2 = {"id": nid, "label": n2_label, "properties": json.loads(n2_props_json) if n2_props_json else {}}
                if n2["label"] != dst_label:
                    continue
                match = True
                if dst_props_str:
                    dst_props = {}
                    for kv in dst_props_str.split(','):
                        k, v = kv.strip().split(':')
                        dst_props[k.strip()] = v.strip().strip("'\"")
                    for k, v in dst_props.items():
                        if n2["properties"].get(k) != v:
                            match = False
                            break
                if match:
                    results.append({
                        "src": src,
                        "edge": {"id": eid, "type": etype, "properties": json.loads(eprops_json) if eprops_json else {}},
                        "dst": n2
                    })
        return results

    def close(self):
        self.conn.close()


if __name__ == "__main__":
    kg = KnowledgeGraph("neo_kg.db")
    # Clear for demo
    cur = kg.conn.cursor()
    cur.execute("DELETE FROM edges")
    cur.execute("DELETE FROM nodes")
    kg.conn.commit()

    neo_id = kg.add_node("Agent", {"name": "Neo", "role": "primary", "capabilities": ["reasoning", "tool_use"]})
    print(f"Created Neo node: {neo_id}")

    tool_id = kg.add_node("Tool", {"name": "web_search", "description": "Search internet", "version": "1.0"})
    print(f"Created Tool node: {tool_id}")

    edge_id = kg.add_edge(neo_id, tool_id, "HAS_TOOL", {"confidence": 1.0})
    print(f"Created edge: {edge_id}")

    results = kg.query("MATCH (a:Agent {name:'Neo'})-[:HAS_TOOL]->(t:Tool)")
    print("Query results:", results)
    print(f"Found {len(results)} tools for Neo")

    kg.close()
