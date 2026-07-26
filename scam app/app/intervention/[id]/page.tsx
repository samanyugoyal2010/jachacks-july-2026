import Link from "next/link";
import { AlertTriangle, Phone, SearchCheck, XCircle } from "lucide-react";
import { runInvestigation } from "@/lib/scamgraph/engine";

export default function InterventionPage() {
  const result = runInvestigation();
  const signals = result.graph.nodes.filter((node) => ["TransactionSignal", "ManipulationSignal", "Claim", "Instruction"].includes(node.type));
  return (
    <main className="page section">
      <div className="wrap">
        <div className="card" style={{ borderColor: "#fac8ce" }}>
          <div className="pill critical"><AlertTriangle size={14} /> {result.intervention.status}</div>
          <h1 style={{ color: "#172033", fontSize: 42 }}>{result.intervention.headline}</h1>
          <p className="lead" style={{ color: "#3a4657" }}>Banks do not normally ask customers to move money into a new &apos;safe account.&apos;</p>
          <div className="grid2">
            <div className="card">
              <h3>Payment</h3>
              <div className="stat"><span>Amount</span><strong>$4,800</strong></div>
              <div className="stat"><span>Recipient</span><strong>Secure Holdings LLC</strong></div>
              <div className="stat"><span>Risk</span><strong>{result.riskLevel} • {result.riskScore}/100</strong></div>
            </div>
            <div className="card">
              <h3>Skeptic Agent conclusion</h3>
              <p>{result.skepticConclusion}</p>
              <p className="fine">{result.intervention.explanation}</p>
            </div>
          </div>
          <h3 style={{ marginTop: 20 }}>Main detected signals</h3>
          <div className="grid3">
            {signals.slice(0, 6).map((signal) => <div className="pill critical" key={signal.id}>{signal.label}</div>)}
          </div>
          <p><strong>Recommended action:</strong> {result.intervention.recommendation}</p>
          <div className="actions">
            <button className="btn danger"><XCircle size={16} /> Cancel transfer</button>
            <button className="btn"><Phone size={16} /> Contact fraud support</button>
            <Link className="btn" href="/investigation/demo-case"><SearchCheck size={16} /> Review investigation</Link>
            <Link className="btn primary" href="/replay/demo-case">Test another explanation</Link>
            <Link className="btn" href="/audit/demo-case">Open audit trail</Link>
          </div>
          <p className="fine">Selecting “I still recognize this payment” would require specialist review and cannot release a critical-risk transfer automatically.</p>
        </div>
      </div>
    </main>
  );
}
