"""Verify Lineage walks any node back to the Application."""
include core;

with entry {
    root spawn RunCase(
        case_id="MARIA-001", raw_text="x",
        facts={"annual_income": "52000", "monthly_debt": "900", "receives_public_assistance": "true"}
    );
    # trace every node type back to source
    apps = [root -->[?:Application]];
    app = apps[-1];
    targets = [];
    for a in [app ->:supports:->] { targets.append(a); }        # assessments
    for d in [app ->:drafts:->] {
        for v in [d ->:checks:->] { targets.append(v); }        # verifications
    }
    for dec in [app ->:finalizes:->] { targets.append(dec); }   # final decision
    for t in targets {
        print("TRACE", jid(t));
        root spawn Lineage(node_id=jid(t));
    }
}
