import Link from "next/link";
import { FileJson, ListChecks } from "lucide-react";
import { runInvestigation } from "@/lib/scamgraph/engine";

export default function AuditPage() {
  const result = runInvestigation();
  const exportJson = {
    id: result.id,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    outcome: result.outcome,
    intervention: result.intervention.status,
    walkers: result.audit.map((event) => event.walker),
  };
  return (
    <main className="page section">
      <div className="wrap">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="pill info"><ListChecks size={14} /> Audit timeline</div>
            <h1 style={{ color: "#172033", fontSize: 42 }}>Investigation audit trail</h1>
          </div>
          <Link className="btn primary" href="/replay/demo-case">Test another explanation</Link>
        </div>
        <div className="card">
          <h3>Decision explanation</h3>
          <p>This transfer was paused because multiple independently supported signals formed a high-risk bank-impersonation pattern. No single signal caused the intervention.</p>
        </div>
        <div className="timeline" style={{ marginTop: 18 }}>
          {result.audit.map((event) => (
            <article className="card auditItem" key={`${event.walker}-${event.timestamp}`}>
              <div>
                <strong>{new Date(event.timestamp).toLocaleTimeString()}</strong>
                <p className="fine">{event.walker}</p>
              </div>
              <div>
                <div className="stat"><span>Nodes visited</span><strong>{event.nodesVisited.join(", ")}</strong></div>
                <div className="stat"><span>Evidence</span><strong>{event.evidenceConsidered.join(", ")}</strong></div>
                <div className="stat"><span>Finding</span><strong>{event.findingCreated}</strong></div>
                <div className="stat"><span>Status</span><strong>{event.previousStatus} → {event.newStatus}</strong></div>
                {event.policyInvoked ? <div className="stat"><span>Policy</span><strong>{event.policyInvoked}</strong></div> : null}
              </div>
            </article>
          ))}
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="pill info"><FileJson size={14} /> Mock JSON export</div>
          <pre className="codeBlock">{JSON.stringify(exportJson, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
