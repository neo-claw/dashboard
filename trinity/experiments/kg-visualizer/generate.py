#!/usr/bin/env python3
import sqlite3
import json
import sys
from pathlib import Path

def main(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get nodes
    cur.execute("SELECT id, label, properties FROM nodes")
    nodes = []
    for row in cur:
        props = json.loads(row["properties"])
        node_id = row["id"]
        label = row["label"]
        title = json.dumps(props, indent=2)
        nodes.append({
            "id": node_id,
            "label": label,
            "title": title,
            "group": label
        })

    # Get edges
    cur.execute("SELECT id, src_id, dst_id, type, properties FROM edges")
    edges = []
    for row in cur:
        props = json.loads(row["properties"]) if row["properties"] else {}
        edges.append({
            "id": row["id"],
            "from": row["src_id"],
            "to": row["dst_id"],
            "label": row["type"],
            "title": json.dumps(props, indent=2)
        })

    conn.close()

    html = f'''<!DOCTYPE html>
<html>
<head>
  <title>Knowledge Graph Visualization</title>
  <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style type="text/css">
    #mynetwork {{
      width: 100%;
      height: 100vh;
      border: 1px solid lightgray;
    }}
  </style>
</head>
<body>
  <div id="mynetwork"></div>
  <script type="text/javascript">
    var nodes = new vis.DataSet({json.dumps(nodes, indent=2)});
    var edges = new vis.DataSet({json.dumps(edges, indent=2)});
    var container = document.getElementById('mynetwork');
    var data = {{ nodes: nodes, edges: edges }};
    var options = {{
      nodes: {{
        shape: 'dot',
        size: 20,
        font: {{ size: 14 }}
      }},
      edges: {{
        arrows: 'to',
        smooth: {{ type: 'continuous' }}
      }},
      physics: {{
        enabled: true,
        barnesHut: {{ gravitationalConstant: -2000, springConstant: 0.04, springLength: 95 }}
      }}
    }};
    var network = new vis.Network(container, data, options);
  </script>
</body>
</html>'''

    out_path = Path(__file__).parent / 'index.html'
    out_path.write_text(html)
    print(f"Generated {out_path} with {len(nodes)} nodes and {len(edges)} edges")

if __name__ == "__main__":
    # Default to knowledge-graph/neo_kg.db relative to this script's location
    default_db = Path(__file__).parent.parent / 'knowledge-graph' / 'neo_kg.db'
    db_path = sys.argv[1] if len(sys.argv) > 1 else str(default_db)
    main(db_path)
