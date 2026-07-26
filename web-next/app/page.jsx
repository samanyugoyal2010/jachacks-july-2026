"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Constellation from "../components/Constellation";
import DataPanel from "../components/DataPanel";
import Streams from "../components/Streams";
import { runDecision, reasoningGraph, factsOf, getLineage, clearLast } from "../lib/api";
import { CASES } from "../lib/cases";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BLANK = {
  annual_income: "", monthly_debt: "", employment: "full_time", tenure_years: "",
  income_verified: "true", collateral_type: "none", collateral_value: "", collateral_appraised: "false",
  zip_code: "", marital_status: "", receives_public_assistance: "false", age_bracket: "",
};

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="page narrow"><p className="muted">Loading…</p></div>}>
      <Apply />
    </Suspense>
  );
}

function Apply() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState(BLANK);
  const [phase, setPhase] = useState("form"); // form | running | done
  const [streams, setStreams] = useState([]);
  const [summary, setSummary] = useState(null);
  const [graph, setGraph] = useState(null);
  const [pick, setPick] = useState(null);
  const [lineage, setLineage] = useState(null);
  const loaded = useRef(false);

  // ?demo=MARIA-001 prefills from the simulator
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const id = params.get("demo");
    if (!id) return;
    const c = CASES.find((x) => x.id === id);
    if (!c) return;
    setForm({ ...BLANK, ...c.facts });
    setTimeout(() => submit({ ...BLANK, ...c.facts }, c.id), 120);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(f = form, caseId) {
    setPhase("running"); setStreams([]); setSummary(null); setGraph(null); setPick(null); setLineage(null);
    const facts = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v != null));
    const { summary, graph } = await runDecision({
      case_id: caseId || "MY-APPLICATION",
      raw_text: "",
      facts,
    });
    setGraph(graph);
    const cards = [];
    for (const t of summary.trace) {
      cards.push(t);
      setStreams(cards.map((c, i) => ({ ...c, active: i === cards.length - 1 })));
      await wait(t.agent === "NoDiscrimination" ? 900 : 550);
    }
    setStreams(cards.map((c) => ({ ...c, active: false })));
    setSummary(summary);
    setPhase("done");
  }

  async function trace(id) { setLineage(await getLineage(id)); }
  async function startOver() { await clearLast(); setForm(BLANK); setPhase("form"); setSummary(null); setGraph(null); setStreams([]); }

  const rg = reasoningGraph(graph);
  const approved = summary?.final_outcome === "APPROVE";

  if (phase === "form") {
    return (
      <div className="page narrow">
        <div className="lead">
          <h1>Apply for a loan</h1>
          <p>Every step of the decision is recorded and shown back to you. If we decline, you get the exact
            reason and a plan to fix it — not a form letter.</p>
        </div>
        <div className="card">
          <h3>Income & debt</h3>
          <div className="grid2">
            <label>Annual income ($)<input value={form.annual_income} onChange={set("annual_income")} placeholder="52000" /></label>
            <label>Monthly debt payments ($)<input value={form.monthly_debt} onChange={set("monthly_debt")} placeholder="900" /></label>
            <label>Employment<select value={form.employment} onChange={set("employment")}>
              <option value="full_time">Full time</option><option value="part_time">Part time</option><option value="self_employed">Self employed</option></select></label>
            <label>Years at job<input value={form.tenure_years} onChange={set("tenure_years")} placeholder="4" /></label>
            <label>Can you document your income?<select value={form.income_verified} onChange={set("income_verified")}>
              <option value="true">Yes — pay stubs / tax return</option><option value="false">No documents yet</option></select></label>
          </div>
        </div>
        <div className="card">
          <h3>Collateral <em>(optional)</em></h3>
          <div className="grid2">
            <label>Type<select value={form.collateral_type} onChange={set("collateral_type")}>
              <option value="none">None</option><option value="vehicle">Vehicle</option><option value="home">Home</option></select></label>
            <label>Estimated value ($)<input value={form.collateral_value} onChange={set("collateral_value")} placeholder="8000" /></label>
            <label>Appraised?<select value={form.collateral_appraised} onChange={set("collateral_appraised")}>
              <option value="false">Not appraised</option><option value="true">Appraised</option></select></label>
          </div>
        </div>
        <div className="card protectedcard">
          <h3>Demographic information <span className="lockpill">🔒 withheld from scoring</span></h3>
          <p className="cardnote">We collect these only so an independent reviewer can prove they were never
            used against you. The scoring agents cannot read them — enforced in the data layer, not by policy.</p>
          <div className="grid2">
            <label>ZIP code<input value={form.zip_code} onChange={set("zip_code")} placeholder="94112" /></label>
            <label>Marital status<select value={form.marital_status} onChange={set("marital_status")}>
              <option value="">Prefer not to say</option><option value="single">Single</option><option value="married">Married</option></select></label>
            <label>Receiving public assistance?<select value={form.receives_public_assistance} onChange={set("receives_public_assistance")}>
              <option value="false">No</option><option value="true">Yes</option></select></label>
            <label>Age bracket<select value={form.age_bracket} onChange={set("age_bracket")}>
              <option value="">Prefer not to say</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-59">45–59</option><option value="60+">60+</option></select></label>
          </div>
        </div>
        <div className="actions">
          <button className="primary big" disabled={!form.annual_income || !form.monthly_debt} onClick={() => submit()}>
            Submit application
          </button>
          <span className="hintline">Income and monthly debt are required. Nothing leaves your machine.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page split">
      <div className="col">
        {summary ? (
          <div className={`verdict ${approved ? "ok" : "no"}`}>
            <div className="vbig">{approved ? "Approved" : "Declined"}</div>
            <p className="vwhy">
              {graph?.nodes?.find((n) => n.type === "Decision")?.data?.reasons?.join(" ") || ""}
            </p>
            {summary.flipped && summary.final_outcome === "APPROVE" && (
              <div className="vnote good">⟲ The first draft declined you using a factor it isn't allowed to
                use. Our independent reviewer caught it and overturned the decision.</div>
            )}
            {summary.flipped && summary.final_outcome === "DENY" && (
              <div className="vnote">⛔ A draft approval was overturned by the independent reviewer because it
                broke our affordability rule.</div>
            )}
            {!approved && (
              <button className="primary" onClick={() => router.push("/appeal")}>
                See how to fix this →
              </button>
            )}
            <button className="ghost" onClick={startOver}>Start a new application</button>
          </div>
        ) : (
          <div className="verdict"><div className="vbig pending">Reviewing…</div>
            <p className="vwhy">Seven agents are working your application. Their reasoning appears below as they go.</p></div>
        )}
        <h2 style={{ marginTop: 18 }}>Who reviewed it, and why</h2>
        <Streams streams={streams} />
        <DataPanel facts={factsOf(graph)} />
      </div>
      <div className="col graphcol">
        <div className="graphhead">
          <h2 style={{ margin: 0 }}>Decision trail</h2>
          <span className="ghint">Each node is a step. Click one to inspect it.</span>
        </div>
        <div className="graphbox">
          <Constellation nodes={rg.nodes} edges={rg.edges} onPick={(id) => { setPick(id); setLineage(null); }}
            highlight={new Set((lineage?.path || []).map((p) => p.id))} />
        </div>
        {pick && graph && (
          <Inspector node={graph.nodes.find((n) => n.id === pick)} onTrace={() => trace(pick)} lineage={lineage} />
        )}
      </div>
    </div>
  );
}

function Inspector({ node, onTrace, lineage }) {
  if (!node) return null;
  const d = node.data;
  const kv = (k, v) => v != null && v !== "" && (
    <div className="kv"><span className="k">{k}</span><span className="v">{String(v)}</span></div>
  );
  return (
    <div className="inspector">
      <span className="chip">{node.type}</span>
      {node.type === "Assessment" && (<>{kv("Agent", d.agent)}{kv("Verdict", d.verdict)}{kv("Reasoning", d.reasoning)}</>)}
      {node.type === "Review" && (<>{kv("Independent verdict", d.independent_verdict)}{kv("Draft was", d.draft_outcome)}
        {kv("Agreed", d.agree ? "yes" : "no")}{kv("Vetoed", d.vetoed ? "yes" : "no")}
        <div className={`finding ${d.vetoed ? "" : "ok"}`}>{d.finding}</div></>)}
      {node.type === "DraftDecision" && (<>{kv("Draft", d.outcome)}{kv("Relied on", (d.relied_on || []).join(", "))}</>)}
      {node.type === "Decision" && (<>{kv("Final", d.outcome)}{kv("Reasons", (d.reasons || []).join(" "))}
        {kv("Relied on", (d.relied_on || []).join(", "))}{kv("Explanation", d.explanation)}</>)}
      {node.type === "RemediationPlan" && (<>{kv("Mode", d.mode)}{kv("Plan", d.summary)}</>)}
      {node.type === "RemediationStep" && (<>{kv("Fix", d.factor)}{kv("From", d.current)}{kv("To", d.target)}{kv("Impact", d.impact)}</>)}
      {node.type === "Application" && (<>{kv("Case", d.case_id)}{kv("Complete", d.package_complete ? "yes" : "no")}</>)}
      <button className="trace-btn" onClick={onTrace}>↑ Trace back to my application</button>
      {lineage?.path?.map((p, i) => <div key={i} className="hop">{p.label}</div>)}
    </div>
  );
}
