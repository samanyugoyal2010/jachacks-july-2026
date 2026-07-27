"""Precompute the demo cases so /audit works without a running engine.

The Jac pipeline needs a persistent process (it holds the provenance graph in
memory across reset -> run -> graph) and its dependency tree is ~350MB, so it
cannot run on Vercel. This runs the REAL pipeline here, once, and freezes the
output the UI would have fetched.

Nothing is hand-written: every summary and graph below is what core.jac actually
produced. Applications submitted through /apply still need the live engine —
there is no snapshot for numbers nobody has run yet.

    .venv/bin/python tools/gen_demo_snapshots.py

Writes web-ui/public/demo-snapshots.json. Re-run it whenever the agents, the
thresholds, or the demo cases in web-ui/src/lib/audit/cases.ts change.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from jaclang import JacRuntimeInterface as R  # noqa: E402

CASES_TS = BASE / "web-ui" / "src" / "lib" / "audit" / "cases.ts"
OUT = BASE / "web-ui" / "public" / "demo-snapshots.json"

core = R.jac_import("core", base_path=str(BASE))[0]
ROOT = R.root()


def walker(name: str, attrs: dict | None = None):
    w = R.spawn_walker(name, attrs or {}, module_name="core")
    R.spawn(w, ROOT)
    return w


def run_case(case_id: str, facts: dict[str, str]) -> tuple[dict, dict]:
    """One clean run: wipe the graph, run the pipeline, dump what the UI reads."""
    walker("Reset")
    summary = walker("RunCase", {"case_id": case_id, "raw_text": "", "facts": facts}).summary
    graph = walker("GraphState").graph
    return summary, graph


def plan_of(graph: dict) -> dict | None:
    for n in graph["nodes"]:
        if n["type"] == "RemediationPlan":
            return n["data"]
    return None


def parse_cases() -> list[tuple[str, dict[str, str]]]:
    """Read the demo cases from cases.ts so this file is never the second copy.

    The UI owns that list; duplicating it here is how the snapshots would
    silently drift out of sync with the site.
    """
    src = CASES_TS.read_text()
    out: list[tuple[str, dict[str, str]]] = []
    # each entry looks like:  id: "MARIA-001", ... facts: { key: "value", ... },
    for block in re.finditer(r'id:\s*"([^"]+)"(.*?)facts:\s*\{(.*?)\n\s*\},', src, re.S):
        case_id, _, facts_src = block.groups()
        facts = dict(re.findall(r'(\w+):\s*"([^"]*)"', facts_src))
        if facts:
            out.append((case_id, facts))
    return out


def main() -> int:
    cases = parse_cases()
    if not cases:
        print(f"error: no cases parsed from {CASES_TS}", file=sys.stderr)
        return 1

    snapshots: dict[str, dict] = {}
    for case_id, facts in cases:
        summary, graph = run_case(case_id, facts)
        snapshots[case_id] = {"summary": summary, "graph": graph}
        line = f"  {case_id:<12} {summary['draft_outcome']:>7} -> {summary['final_outcome']:<7}"
        line += "  (vetoed)" if summary["vetoed"] else ""

        # A denial offers a reapplication plan, and /appeal re-runs the pipeline
        # on it to prove the fix works. Freeze that second run too.
        plan = plan_of(graph)
        if plan and plan.get("reapply_facts"):
            rid = f"{case_id}-REAPPLY"
            rsummary, rgraph = run_case(rid, plan["reapply_facts"])
            snapshots[rid] = {"summary": rsummary, "graph": rgraph}
            line += f"  + reapply -> {rsummary['final_outcome']}"
        print(line)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshots, separators=(",", ":")))
    kb = OUT.stat().st_size / 1024
    print(f"\nwrote {OUT.relative_to(BASE)} — {len(snapshots)} snapshots, {kb:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
