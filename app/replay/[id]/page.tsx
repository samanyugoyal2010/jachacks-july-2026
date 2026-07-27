import Link from "next/link";
import { GitBranch, RotateCcw } from "lucide-react";
import { replay_walker } from "@/lib/scamgraph/engine";
import { GraphView } from "@/components/GraphView";

export default function ReplayPage() {
  const replay = replay_walker();
  return (
    <main className="page section">
      <div className="wrap">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="pill info"><GitBranch size={14} /> Counterfactual replay</div>
            <h1 style={{ color: "#172033", fontSize: 42 }}>Replay with changed facts</h1>
          </div>
          <Link className="btn" href="/audit/demo-case">Open audit trail</Link>
        </div>
        <div className="grid2">
          <section className="card">
            <div className="pill critical">Suspicious scenario</div>
            <h2>Original investigation</h2>
            <div className="stat"><span>Recipient</span><strong>New recipient</strong></div>
            <div className="stat"><span>Contact</span><strong>Unknown caller initiated</strong></div>
            <div className="stat"><span>Instruction</span><strong>Safe-account instruction</strong></div>
            <div className="stat"><span>Outcome</span><strong>{replay.original.outcome}</strong></div>
            <div className="stat"><span>Risk</span><strong>{replay.original.riskScore}/100</strong></div>
            <div style={{ height: 340 }}><GraphView nodes={replay.original.graph.nodes.slice(0, 10)} edges={replay.original.graph.edges.slice(0, 10)} /></div>
          </section>
          <section className="card">
            <div className="pill released">Legitimate scenario</div>
            <h2>Changed explanation</h2>
            <div className="stat"><span>Recipient</span><strong>Paid monthly for 18 months</strong></div>
            <div className="stat"><span>Contact</span><strong>Customer initiated independently</strong></div>
            <div className="stat"><span>Instruction</span><strong>No safe-account instruction</strong></div>
            <div className="stat"><span>Outcome</span><strong>{replay.replayed.outcome}</strong></div>
            <div className="stat"><span>Risk</span><strong>{replay.replayed.riskScore}/100</strong></div>
            <div style={{ height: 340 }}><GraphView nodes={replay.replayed.graph.nodes.slice(0, 10)} edges={replay.replayed.graph.edges.slice(0, 10)} /></div>
          </section>
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <button className="btn primary"><RotateCcw size={16} /> Replay affected paths</button>
          <div className="grid3" style={{ marginTop: 16 }}>
            <div><h3>Changed facts</h3>{replay.changedFacts.map((fact) => <p className="fine" key={fact}>{fact}</p>)}</div>
            <div><h3>Agents reran</h3>{replay.rerunAgents.map((agent) => <p className="fine" key={agent}>{agent}</p>)}</div>
            <div><h3>Unchanged findings</h3>{replay.unchangedFindings.map((finding) => <p className="fine" key={finding}>{finding}</p>)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
