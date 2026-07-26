"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getGraph, planOf, runDecision, loadLast } from "../../lib/api";

export default function Appeal() {
  const [plan, setPlan] = useState(null);
  const [last, setLast] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLast(loadLast());
      setPlan(planOf(await getGraph()));
      setLoading(false);
    })();
  }, []);

  async function reapply() {
    setBusy(true);
    const { summary } = await runDecision({
      case_id: (last?.caseId || "MY-APPLICATION") + "-REAPPLY",
      raw_text: "",
      facts: plan.reapply_facts,
    });
    setResult(summary);
    setBusy(false);
  }

  if (loading) return <div className="page narrow"><p className="muted">Loading your decision…</p></div>;

  if (!plan) {
    return (
      <div className="page narrow">
        <div className="lead"><h1>Appeal & fix</h1>
          <p>This page unlocks only if an application is declined. Nothing to appeal right now.</p></div>
        <div className="card center">
          <p className="muted">Submit an application first, or try a guided example.</p>
          <div className="actions"><Link className="primary" href="/">Apply</Link>
            <Link className="ghost" href="/simulator">See guided examples</Link></div>
        </div>
      </div>
    );
  }

  const fixable = plan.mode === "fixable";
  return (
    <div className="page narrow">
      <div className="lead">
        <h1>Here's how to fix it</h1>
        <p>You were declined. This is the specific reason, and the concrete change that would make you
          qualify — calculated from your own numbers, not generic advice.</p>
      </div>

      <div className={`modecard ${fixable ? "fix" : "sub"}`}>
        <span className="modetag">{fixable ? "Fixable — paperwork" : "Substantive — the numbers"}</span>
        <p>{plan.summary}</p>
      </div>

      <h2 style={{ marginTop: 20 }}>{fixable ? "Send us these" : "Choose one of these"}</h2>
      {(plan.steps || []).map((s, i) => (
        <div key={i} className="stepcard">
          <div className="stepn">{i + 1}</div>
          <div className="stepbody">
            <div className="stepact">{s.action}</div>
            <div className="steprow">
              {s.current !== "missing" && <><span className="from">{s.current}</span><span className="to">→ {s.target}</span></>}
              <span className="impact">{s.impact}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <h3>Check it before you commit</h3>
        <p className="cardnote">We'll re-run the <b>real</b> decision with this change applied, so you can see
          the outcome before doing any of the work. This is an actual run of the same agents — not a promise.</p>
        <button className="primary big" disabled={busy} onClick={reapply}>
          {busy ? "Re-running the decision…" : "Re-check with this fix applied"}
        </button>
      </div>

      {result && (
        <div className={`verdict ${result.final_outcome === "APPROVE" ? "ok" : "no"}`} style={{ marginTop: 16 }}>
          <div className="vbig">{result.final_outcome === "APPROVE" ? "You would be approved" : "Still short"}</div>
          <p className="vwhy">
            {result.final_outcome === "APPROVE"
              ? "With that one change, the full decision comes back approved. Make the change and reapply."
              : "That change alone isn't enough yet — try the other step as well."}
          </p>
          <Link className="ghost" href="/">Back to my application</Link>
        </div>
      )}
    </div>
  );
}
