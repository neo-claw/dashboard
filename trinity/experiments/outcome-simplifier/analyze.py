#!/usr/bin/env python3
"""
Netic Outcome Taxonomy Analyzer
--------------------------------
Parses taxonomy.json and outputs:
- Graphviz DOT of outcomes hierarchy
- Markdown summary with stats and potential simplifications
"""

import json
import sys
from collections import defaultdict, Counter
from pathlib import Path

TAXONOMY_PATH = Path(__file__).parent / "taxonomy.json"

def load_taxonomy():
    with open(TAXONOMY_PATH) as f:
        return json.load(f)

def analyze_outcomes(data):
    outcomes = data.get("outcomes", [])
    total_outcomes = len(outcomes)

    # Group by Outcome -> Reason -> Subreason
    tree = defaultdict(lambda: defaultdict(set))
    all_reasons = set()
    all_subreasons = set()

    for rec in outcomes:
        outcome = rec.get("Outcome")
        reason = rec.get("Reason")
        subreason = rec.get("Subreason")
        if outcome and reason and subreason:
            tree[outcome][reason].add(subreason)
            all_reasons.add(reason)
            all_subreasons.add(subreason)

    # Detect potentially duplicated subreasons across reasons
    subreason_to_reasons = defaultdict(set)
    for outcome, reasons in tree.items():
        for reason, subreasons in reasons.items():
            for sr in subreasons:
                subreason_to_reasons[sr].add(reason)

    duplicate_subs = {sr: reasons for sr, reasons in subreason_to_reasons.items() if len(reasons) > 1}

    # Identify reasons with single subreason (candidates for merging up)
    thin_reasons = []
    for outcome, reasons in tree.items():
        for reason, subreasons in reasons.items():
            if len(subreasons) == 1:
                thin_reasons.append((outcome, reason, list(subreasons)[0]))

    # Count technical classifiers
    tech_counter = Counter()
    for rec in outcomes:
        tech = rec.get("Technical", "").strip()
        if tech:
            # Normalize
            tech_norm = tech.split(";")[0].strip()
            tech_counter[tech_norm] += 1

    return {
        "total_outcomes": total_outcomes,
        "tree": tree,
        "all_reasons": all_reasons,
        "all_subreasons": all_subreasons,
        "duplicate_subs": duplicate_subs,
        "thin_reasons": thin_reasons,
        "tech_counter": tech_counter,
    }

def generate_dot(analysis):
    lines = ["digraph taxonomy {", '  rankdir="LR";', '  node [shape=box, style=rounded];']
    tree = analysis["tree"]
    for outcome in sorted(tree):
        lines.append(f'  "{outcome}_out" [label="{outcome}", style="filled", fillcolor="#e1f5fe"];')
        for reason in sorted(tree[outcome]):
            lines.append(f'  "{reason}" [label="{reason}"];')
            lines.append(f'  "{outcome}_out" -> "{reason}";')
            for subreason in sorted(tree[outcome][reason]):
                lines.append(f'  "{subreason}" [label="{subreason}", shape=ellipse];')
                lines.append(f'  "{reason}" -> "{subreason}";')
    lines.append("}")
    return "\n".join(lines)

def generate_markdown(analysis):
    md = []
    md.append("# Netic Outcome Taxonomy Analysis")
    md.append("")
    md.append(f"- **Outcome entries:** {analysis['total_outcomes']}")
    md.append(f"- **Unique Reasons:** {len(analysis['all_reasons'])}")
    md.append(f"- **Unique Subreasons:** {len(analysis['all_subreasons'])}")
    md.append("")

    if analysis["duplicate_subs"]:
        md.append("## Duplicate Subreasons Across Reasons")
        md.append("These subreason labels appear under multiple reasons; consider disambiguation or merging.")
        for sr, reasons in sorted(analysis["duplicate_subs"].items()):
            md.append(f"- `{sr}` used under: {', '.join(sorted(reasons))}")
        md.append("")

    if analysis["thin_reasons"]:
        md.append("## Thin Reasons (single subreason)")
        md.append("Reasons with only one subreason; could potentially be collapsed.")
        for outcome, reason, sub in analysis["thin_reasons"][:20]:
            md.append(f"- {outcome} / {reason} → {sub}")
        if len(analysis["thin_reasons"]) > 20:
            md.append(f"... and {len(analysis['thin_reasons']) - 20} more")
        md.append("")

    md.append("## Technical Classifier Distribution")
    for tech, count in analysis["tech_counter"].most_common(15):
        md.append(f"- {tech}: {count}")
    md.append("")

    md.append("## Suggestions")
    suggestions = []
    if len(analysis["duplicate_subs"]) > 5:
        suggestions.append("Consolidate duplicate subreason labels; use a controlled vocabulary.")
    if len(analysis["thin_reasons"]) > 10:
        suggestions.append("Consider collapsing thin reasons into subreasons or merging parent reasons.")
    if analysis["total_outcomes"] > 40:
        suggestions.append("High outcome count; grouping into broader outcome categories may improve clarity.")
    if not suggestions:
        suggestions.append("Taxonomy looks reasonably balanced; focus on documentation and consistency.")

    md.extend(suggestions)
    md.append("")
    md.append("---")
    md.append("Generated by Trinity outcome-simplifier")
    return "\n".join(md)

def main():
    data = load_taxonomy()
    analysis = analyze_outcomes(data)
    out_dir = Path(__file__).parent
    dot_path = out_dir / "taxonomy.dot"
    md_path = out_dir / "SUMMARY.md"

    with open(dot_path, "w") as f:
        f.write(generate_dot(analysis))
    with open(md_path, "w") as f:
        f.write(generate_markdown(analysis))

    print(f"Wrote {dot_path} and {md_path}")

if __name__ == "__main__":
    main()
